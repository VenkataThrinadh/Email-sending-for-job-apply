// workers/emailWorker.js - BullMQ worker that processes email send jobs
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

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
const checkAndCompleteCampaign = async (campaignId) => {
  if (!campaignId) return;
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { totalRecipients: true, sentCount: true, failedCount: true, status: true }
    });
    if (campaign && (campaign.sentCount + campaign.failedCount >= campaign.totalRecipients)) {
      const finalStatus = campaign.sentCount > 0 ? 'sent' : 'failed';
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: finalStatus,
          sentAt: new Date()
        }
      });
      console.log(`🏁 Campaign #${campaignId} completed with status: ${finalStatus} (${campaign.sentCount} sent, ${campaign.failedCount} failed)`);
    }
  } catch (err) {
    console.error(`Error updating campaign completion status for #${campaignId}:`, err.message);
  }
};

const processEmailJob = async (job) => {
  const { campaignId, recipientId, email, name, subject, body, attachmentPath, attachmentName, variables, senderName } = job.data;

  console.log(`📧 Processing job ${job.id}: sending to ${email}`);

  // Transition campaign from queued/draft to sending if not already
  if (campaignId) {
    await prisma.campaign.updateMany({
      where: { id: campaignId, status: { in: ['queued', 'draft'] } },
      data: { status: 'sending' }
    }).catch(() => {});
  }

  try {
    // Rate limiting: wait if over limit
    if (emailsSentThisMinute >= EMAILS_PER_MINUTE) {
      console.log(`⏳ Rate limit reached (${EMAILS_PER_MINUTE}/min). Waiting...`);
      await delay(DELAY_BETWEEN_EMAILS);
    }

    // Personalize subject and body
    const allVars = { name, email, ...variables };
    const personalizedSubject = personalize(subject, allVars);
    let personalizedBody = personalize(body, allVars);

    // Append open tracking pixel to HTML body
    if (recipientId && personalizedBody) {
      const serverBaseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      const trackingPixel = `<img src="${serverBaseUrl}/api/webhook/open/${recipientId}" width="1" height="1" style="display:none !important;visibility:hidden;opacity:0;" alt="" />`;
      if (personalizedBody.includes('</body>')) {
        personalizedBody = personalizedBody.replace('</body>', `${trackingPixel}</body>`);
      } else {
        personalizedBody += trackingPixel;
      }
    }

    // 1. Get next sender account in rotation (or default sender)
    const domain = await getNextActiveDomain();
    const safeDailyLimit = parseInt(process.env.DAILY_SENDER_LIMIT) || domain?.dailyLimit || 75;

    // Check if account has reached safe daily sending limit
    if (!domain) {
      console.warn(`🛑 Daily safe limit reached (${safeDailyLimit} emails/day).`);
      console.warn(`⏸️ Auto-pausing email queue until midnight to protect your Gmail account from blocks.`);
      
      const { emailQueue } = require('../queue/emailQueue');
      await emailQueue.pause().catch(() => {});
      
      // Calculate delay until midnight
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 1, 0, 0);
      const msUntilMidnight = Math.max(60000, midnight.getTime() - now.getTime());
      
      // Wait peacefully without throwing a failed error
      await delay(Math.min(msUntilMidnight, 180000));
      return { paused: true, message: 'Daily limit reached. Queue paused until midnight.' };
    }

    const domainName = domain?.domain || null;
    const senderEmail = domain?.smtpUser || domain?.domain || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    const rawPass = domain?.smtpPass || process.env.SMTP_PASS || '';
    const cleanPass = rawPass.trim().replace(/\s+/g, '');
    const activeUser = domain?.smtpUser || process.env.SMTP_USER;

    const smtpConfig = {
      host: domain?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(domain?.smtpPort || process.env.SMTP_PORT) || 587,
      user: activeUser,
      pass: cleanPass || undefined
    };

    // Send the email with the rotated SMTP account
    const result = await sendEmail({
      to: email,
      subject: personalizedSubject,
      html: personalizedBody,
      attachmentPath,
      attachmentName,
      fromName: senderName,
      fromEmail: senderEmail,
      smtpConfig
    });

    emailsSentThisMinute++;

    // Update recipient status to 'sent'
    await prisma.recipient.update({
      where: { id: recipientId },
      data: { status: 'sent', sentAt: new Date() }
    });

    // Log success with sender used
    await prisma.log.create({
      data: {
        campaignId,
        recipientId,
        email,
        status: 'sent',
        domainUsed: senderEmail || domainName
      }
    });

    // Update campaign sent count
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { sentCount: { increment: 1 } }
    });

    // Check if entire campaign has completed
    await checkAndCompleteCampaign(campaignId);

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

    console.log(`✅ Email sent to ${email} (job ${job.id}) via sender: ${senderEmail || 'default .env'}`);

    // Natural human jitter (random delay between 15s and 35s) to avoid Google bot heuristics
    const minJitter = parseInt(process.env.MIN_JITTER_SECONDS) || 12;
    const maxJitter = parseInt(process.env.MAX_JITTER_SECONDS) || 25;
    const jitterMs = Math.floor(Math.random() * (maxJitter - minJitter + 1) * 1000) + (minJitter * 1000);
    console.log(`⏳ Applying natural sender delay (${Math.round(jitterMs / 1000)}s)...`);
    await delay(jitterMs);

    return { success: true, email, messageId: result.messageId, sender: senderEmail };

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

    // Check if entire campaign has completed
    await checkAndCompleteCampaign(campaignId);

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
    // Auto-sync any completed campaigns
    const staleCampaigns = await prisma.campaign.findMany({
      where: { status: { in: ['queued', 'sending'] } }
    });
    for (const c of staleCampaigns) {
      if (c.totalRecipients > 0 && (c.sentCount + c.failedCount >= c.totalRecipients)) {
        await prisma.campaign.update({
          where: { id: c.id },
          data: {
            status: c.sentCount > 0 ? 'sent' : 'failed',
            sentAt: c.sentAt || c.updatedAt || new Date()
          }
        });
        console.log(`📌 Synced campaign #${c.id} status to ${c.sentCount > 0 ? 'sent' : 'failed'}`);
      }
    }
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
