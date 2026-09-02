// workers/emailWorker.js - BullMQ worker that processes email send jobs
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Worker } = require('bullmq');
const redisConnection = require('../config/redis');
const prisma = require('../lib/prisma');
const { sendEmail } = require('../services/emailService');
const { personalize } = require('../services/personalizationService');
const { getNextActiveDomain } = require('../controllers/domainController');

// Rate limiting: emails per minute (from env or default 10)
const EMAILS_PER_MINUTE = parseInt(process.env.EMAILS_PER_MINUTE) || 10;
const DELAY_BETWEEN_EMAILS = Math.floor(60000 / EMAILS_PER_MINUTE); // ms
const WORKER_CONCURRENCY   = parseInt(process.env.WORKER_CONCURRENCY) || 2;

let emailsSentThisMinute = 0;
let minuteTimer = null;

const resetCounter = () => {
  emailsSentThisMinute = 0;
};

// Reset counter every minute
minuteTimer = setInterval(resetCounter, 60000);

// ─── Worker Processor ─────────────────────────────────────────────
const processEmailJob = async (job) => {
  const { campaignId, recipientId, email, name, subject, body, variables } = job.data;

  console.log(`📧 Processing job ${job.id}: sending to ${email}`);

  try {
    // Rate limiting: wait if over limit
    if (emailsSentThisMinute >= EMAILS_PER_MINUTE) {
      console.log(`⏳ Rate limit reached (${EMAILS_PER_MINUTE}/min). Waiting...`);
      await delay(DELAY_BETWEEN_EMAILS);
    }

    // Personalize subject and body
    const allVars = { name, email, ...variables };
    const personalizedSubject = personalize(subject, allVars);
    const personalizedBody = personalize(body, allVars);

    // Get next domain in rotation
    const domain = await getNextActiveDomain();
    const domainName = domain?.domain || null;

    // Send the email
    const result = await sendEmail({
      to: email,
      subject: personalizedSubject,
      html: personalizedBody,
    });

    emailsSentThisMinute++;

    // Update recipient status to 'sent'
    await prisma.recipient.update({
      where: { id: recipientId },
      data: { status: 'sent', sentAt: new Date() }
    });

    // Log success
    await prisma.log.create({
      data: {
        campaignId,
        recipientId,
        email,
        status: 'sent',
        domainUsed: domainName
      }
    });

    // Update campaign sent count
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { sentCount: { increment: 1 } }
    });

    // Update domain usage
    if (domain?.id) {
      await prisma.domain.update({
        where: { id: domain.id },
        data: {
          emailsSentToday: { increment: 1 },
          lastUsedAt: new Date()
        }
      });
    }

    // Update daily stats
    const today = new Date().toISOString().slice(0, 10);
    await prisma.$executeRaw`
       INSERT INTO email_stats (stat_date, emails_sent, emails_delivered)
       VALUES (${today}, 1, 1)
       ON DUPLICATE KEY UPDATE emails_sent = emails_sent + 1, emails_delivered = emails_delivered + 1
    `;

    console.log(`✅ Email sent to ${email} (job ${job.id}) via ${domainName || 'default'}`);
    return { success: true, email, messageId: result.messageId };

  } catch (error) {
    console.error(`❌ Failed to send to ${email}:`, error.message);

    // Update recipient to 'failed'
    await prisma.recipient.update({
      where: { id: recipientId },
      data: { status: 'failed' }
    }).catch(() => {});

    // Log failure
    await prisma.log.create({
      data: {
        campaignId,
        recipientId,
        email,
        status: 'failed',
        errorMessage: String(error.message)
      }
    }).catch(() => {});

    // Update campaign failed count
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { failedCount: { increment: 1 } }
    }).catch(() => {});

    // Update daily stats
    const today = new Date().toISOString().slice(0, 10);
    await prisma.$executeRaw`
       INSERT INTO email_stats (stat_date, emails_sent, emails_failed)
       VALUES (${today}, 1, 1)
       ON DUPLICATE KEY UPDATE emails_sent = emails_sent + 1, emails_failed = emails_failed + 1
    `.catch(() => {});

    throw error; // Re-throw so BullMQ marks job as failed and retries
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Start Worker ─────────────────────────────────────────────────
const startWorker = async () => {
  // Try connecting to DB using prisma before starting worker
  try {
    await prisma.$connect();
  } catch (dbErr) {
    console.error('❌ Worker cannot start: DB connection failed', dbErr);
    process.exit(1);
  }

  const worker = new Worker('email-queue', processEmailJob, {
    connection: redisConnection,
    concurrency: WORKER_CONCURRENCY,
    limiter: {
      max: EMAILS_PER_MINUTE,
      duration: 60000,
    },
  });

  worker.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed:`, result?.email);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err.message);
  });

  console.log(`🚀 Email worker started (${EMAILS_PER_MINUTE} emails/min, concurrency: ${WORKER_CONCURRENCY})`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('📴 Worker shutting down gracefully...');
    clearInterval(minuteTimer);
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    clearInterval(minuteTimer);
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  });
};

startWorker();
