// server.js - Entry point: initializes DB then starts Express
const app = require('./app');
const prisma = require('./lib/prisma');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const { emailQueue } = require('./queue/emailQueue');
const { resetDailyEmailCounts } = require('./controllers/domainController');

let schedulerTimer = null;
let dailyResetTimer = null;

// ─── Dispatch Scheduled Campaigns ─────────────────────────────────
const dispatchScheduledCampaigns = async () => {
  try {
    const dueCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'draft',
        scheduledAt: { lte: new Date() }
      },
      include: {
        recipients: {
          where: { status: 'pending' }
        },
        user: {
          select: { name: true }
        }
      }
    });

    for (const campaign of dueCampaigns) {
      if (campaign.recipients.length === 0) {
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: 'sent', sentAt: new Date() }
        });
        continue;
      }

      console.log(`⏰ Dispatching scheduled campaign #${campaign.id} ("${campaign.name}") with ${campaign.recipients.length} recipients...`);

      const jobs = campaign.recipients.map((recipient) => ({
        name: 'send-email',
        data: {
          campaignId: campaign.id,
          recipientId: recipient.id,
          email: recipient.email,
          name: recipient.name,
          subject: campaign.subject,
          body: campaign.body,
          attachmentPath: campaign.attachmentPath,
          attachmentName: campaign.attachmentName,
          variables: recipient.variables || {},
          senderName: campaign.user?.name || null,
        },
        opts: {
          attempts: parseInt(process.env.MAX_RETRIES) || 3,
          backoff: { type: 'exponential', delay: parseInt(process.env.JOB_BACKOFF_DELAY) || 2000 },
          removeOnComplete: false,
          removeOnFail: false,
        },
      }));

      await emailQueue.addBulk(jobs);

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'queued' }
      });

      console.log(`✅ Scheduled campaign #${campaign.id} successfully queued.`);
    }
  } catch (err) {
    console.error('⚠️ Error checking scheduled campaigns:', err.message);
  }
};

const startServer = async () => {
  console.log('\n🚀 EmailPro Marketing System — Backend Starting...\n');

  // 1. Test DB connection
  try {
    await prisma.$connect();
    console.log('✅ MySQL connected successfully via Prisma');
  } catch (dbErr) {
    console.error('❌ Cannot start server: DB connection failed. Check your .env settings.');
    console.error(dbErr);
    process.exit(1);
  }

  // 2. Auto-seed primary Gmail sender from .env if needed
  try {
    const primaryEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    if (primaryEmail) {
      const cleanEmail = primaryEmail.toLowerCase().trim();
      const cleanPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.trim().replace(/\s+/g, '') : null;
      await prisma.domain.upsert({
        where: { domain: cleanEmail },
        update: {
          ...(cleanPass ? { smtpPass: cleanPass } : {}),
          smtpUser: cleanEmail,
          smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
          smtpPort: parseInt(process.env.SMTP_PORT) || 587,
        },
        create: {
          domain: cleanEmail,
          smtpUser: cleanEmail,
          smtpPass: cleanPass,
          smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
          smtpPort: parseInt(process.env.SMTP_PORT) || 587,
          status: 'active',
          reputationScore: 100,
          dailyLimit: parseInt(process.env.DAILY_SENDER_LIMIT) || 75
        }
      });
      console.log(`🛡️  Sender protection active: ${cleanEmail} (Max ${process.env.DAILY_SENDER_LIMIT || 75} emails/day)`);
    }
  } catch (seedErr) {
    console.warn('Notice: Domain table initialization deferred:', seedErr.message);
  }

  // 3. Start background schedulers
  schedulerTimer = setInterval(dispatchScheduledCampaigns, 30000); // Check every 30s
  dispatchScheduledCampaigns(); // Run initial check immediately

  let lastResetDate = new Date().toISOString().slice(0, 10);
  dailyResetTimer = setInterval(async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== lastResetDate) {
      try {
        await resetDailyEmailCounts();
        await emailQueue.resume().catch(() => {});
        lastResetDate = today;
        console.log(`🌅 Midnight reset: email counts cleared and queue resumed for ${today}`);
      } catch (resetErr) {
        console.error('⚠️ Failed to reset daily email counts:', resetErr.message);
      }
    }
  }, 60000); // Check every minute

  // 3. Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`📡 API Base:    http://localhost:${PORT}/api`);
    console.log(`❤️  Health:     http://localhost:${PORT}/health`);
    console.log(`🔔 Webhook:    http://localhost:${PORT}/api/webhook/email-status`);
    console.log(`\n🏃 Start worker separately: npm run worker`);
  });

  // 4. Optionally launch embedded worker (for single-container free cloud deploys)
  if (process.env.START_WORKER === 'true') {
    try {
      require('./workers/emailWorker');
      console.log('🚀 Embedded Email Worker running alongside API server (Free Cloud Mode)');
    } catch (workerErr) {
      console.error('⚠️ Failed to launch embedded worker:', workerErr.message);
    }
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('📴 SIGTERM received. Shutting down gracefully...');
    if (schedulerTimer) clearInterval(schedulerTimer);
    if (dailyResetTimer) clearInterval(dailyResetTimer);
    await prisma.$disconnect();
    server.close(() => {
      console.log('👋 HTTP server closed.');
      process.exit(0);
    });
  });

  process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err.message);
    process.exit(1);
  });
};

startServer();
