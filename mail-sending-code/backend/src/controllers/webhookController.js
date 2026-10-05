// controllers/webhookController.js - Handle email event webhooks (SES, SendGrid, etc.)
const prisma = require('../lib/prisma');

// ─── POST /api/webhook/email-status ──────────────────────────────
// Handles bounce and complaint notifications from email providers
const handleEmailStatus = async (req, res, next) => {
  try {
    const payload = req.body;

    // Support multiple webhook payload formats
    // Normalize to a common format
    let events = [];

    // AWS SES SNS format
    if (payload.Type === 'Notification' && payload.Message) {
      try {
        const message = JSON.parse(payload.Message);
        if (message.notificationType === 'Bounce') {
          for (const recipient of message.bounce.bouncedRecipients) {
            events.push({
              email: recipient.emailAddress,
              status: 'bounced',
              bounceType: message.bounce.bounceType === 'Permanent' ? 'hard' : 'soft',
              reason: message.bounce.bounceSubType || 'unknown',
            });
          }
        } else if (message.notificationType === 'Complaint') {
          for (const recipient of message.complaint.complainedRecipients) {
            events.push({
              email: recipient.emailAddress,
              status: 'complained',
              bounceType: 'none',
              reason: message.complaint.complaintFeedbackType || 'spam',
            });
          }
        }
      } catch (e) {
        console.warn('📬 Could not parse SNS message:', e.message);
      }
    }

    // SendGrid format (array of events)
    if (Array.isArray(payload)) {
      for (const event of payload) {
        if (['bounce', 'blocked'].includes(event.event)) {
          events.push({
            email: event.email,
            status: 'bounced',
            bounceType: event.type === 'blocked' ? 'soft' : 'hard',
            reason: event.reason || 'unknown',
          });
        } else if (event.event === 'spamreport') {
          events.push({
            email: event.email,
            status: 'complained',
            bounceType: 'none',
            reason: 'spam_report',
          });
        } else if (event.event === 'open') {
          events.push({ email: event.email, status: 'opened', bounceType: 'none', reason: null });
        }
      }
    }

    // Generic custom format from our own system
    if (payload.email && payload.event) {
      events.push({
        email: payload.email,
        status: payload.event,
        bounceType: payload.bounceType || 'none',
        reason: payload.reason || null,
      });
    }

    // Process all events
    let processed = 0;
    for (const event of events) {
      const emailLower = event.email?.toLowerCase();
      if (!emailLower) continue;

      // Insert into logs
      await prisma.log.create({
        data: {
          email: emailLower,
          status: event.status,
          bounceType: event.bounceType,
          complaintReason: event.reason
        }
      });

      // Update recipient status
      await prisma.recipient.updateMany({
        where: {
          email: emailLower,
          status: { not: 'unsubscribed' }
        },
        data: { status: event.status }
      });

      // Auto-blacklist on hard bounce or complaint
      if (event.status === 'complained' || (event.status === 'bounced' && event.bounceType === 'hard')) {
        const suppressionReason = event.status === 'complained' ? 'complaint' : 'hard_bounce';
        await prisma.suppressionList.upsert({
          where: { email: emailLower },
          update: {},
          create: {
            email: emailLower,
            reason: suppressionReason
          }
        });
        console.log(`🚫 Auto-suppressed ${emailLower} (${suppressionReason})`);

        // Reduce domain reputation for complaints
        if (event.status === 'complained') {
          await prisma.$executeRaw`UPDATE domains SET reputation_score = GREATEST(0, reputation_score - 2) WHERE status = 'active'`;
        }
      }

      // Update email_stats for the day
      const today = new Date().toISOString().slice(0, 10);
      if (event.status === 'bounced') {
        await prisma.$executeRaw`
          INSERT INTO email_stats (stat_date, emails_bounced) VALUES (${today}, 1)
          ON DUPLICATE KEY UPDATE emails_bounced = emails_bounced + 1
        `;
      } else if (event.status === 'complained') {
        await prisma.$executeRaw`
          INSERT INTO email_stats (stat_date, emails_complained) VALUES (${today}, 1)
          ON DUPLICATE KEY UPDATE emails_complained = emails_complained + 1
        `;
      } else if (event.status === 'opened') {
        await prisma.$executeRaw`
          INSERT INTO email_stats (stat_date, emails_opened) VALUES (${today}, 1)
          ON DUPLICATE KEY UPDATE emails_opened = emails_opened + 1
        `;
        await prisma.recipient.updateMany({
          where: {
            email: emailLower,
            openedAt: null
          },
          data: { openedAt: new Date() }
        });
      }

      processed++;
    }

    // Always return 200 to webhook senders
    return res.status(200).json({ success: true, processed });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return res.status(200).json({ success: true, processed: 0 }); // Still 200 to avoid retries
  }
};

module.exports = { handleEmailStatus };
