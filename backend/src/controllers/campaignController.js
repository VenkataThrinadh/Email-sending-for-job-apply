// controllers/campaignController.js - Campaign CRUD + CSV parsing + queue push
const prisma = require('../lib/prisma');
const { emailQueue } = require('../queue/emailQueue');
const csvParser = require('../utils/csvParser');
const fs = require('fs');

// ─── POST /api/campaign/create ────────────────────────────────────
const createCampaign = async (req, res, next) => {
  try {
    const { name, subject, body, scheduledAt } = req.body;
    const userId = req.user.id;

    if (!name || !subject || !body) {
      return res.status(400).json({ success: false, message: 'Name, subject, and body are required.' });
    }

    // Parse CSV if uploaded
    let recipients = [];
    if (req.file) {
      try {
        recipients = await csvParser.parseCSVFile(req.file.path);
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
      } catch (csvErr) {
        return res.status(400).json({ success: false, message: 'CSV parse error: ' + csvErr.message });
      }
    }

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV must contain at least one recipient.' });
    }

    const status = scheduledAt ? 'draft' : 'queued';
    
    // Check suppression list
    const suppressedRows = await prisma.suppressionList.findMany({
      select: { email: true }
    });
    const suppressedEmails = new Set(suppressedRows.map((r) => r.email.toLowerCase()));

    const validRecipients = recipients.filter(r => r.email && !suppressedEmails.has(r.email.toLowerCase().trim()));

    // Transaction for campaign and recipients
    const campaign = await prisma.$transaction(async (tx) => {
      const createdCampaign = await tx.campaign.create({
        data: {
          userId,
          name,
          subject,
          body,
          status,
          totalRecipients: validRecipients.length,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          recipients: {
            create: validRecipients.map(r => ({
              email: r.email.toLowerCase().trim(),
              name: r.name || '',
              variables: r,
              status: 'pending'
            }))
          }
        },
        include: {
          recipients: true
        }
      });
      return createdCampaign;
    });

    // Push jobs to the email queue (only if sending now)
    if (!scheduledAt) {
      for (const recipient of campaign.recipients) {
        await emailQueue.add(
          'send-email',
          {
            campaignId: campaign.id,
            recipientId: recipient.id,
            email: recipient.email,
            name: recipient.name,
            subject,
            body,
            variables: recipient.variables || {},
          },
          {
            attempts: parseInt(process.env.MAX_RETRIES) || 3,
            backoff: { type: 'exponential', delay: parseInt(process.env.JOB_BACKOFF_DELAY) || 2000 },
            removeOnComplete: false,
            removeOnFail: false,
          }
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: `Campaign created with ${validRecipients.length} recipients.`,
      campaign: { id: campaign.id, name, subject, status, totalRecipients: validRecipients.length },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/campaign/list ───────────────────────────────────────
const listCampaigns = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, subject: true, status: true, 
          totalRecipients: true, sentCount: true, failedCount: true,
          openCount: true, scheduledAt: true, sentAt: true, createdAt: true
        }
      }),
      prisma.campaign.count({ where: { userId } })
    ]);

    // Map Prisma camelCase to match the expected JSON format if necessary
    const mappedCampaigns = campaigns.map(c => ({
      ...c,
      total_recipients: c.totalRecipients,
      sent_count: c.sentCount,
      failed_count: c.failedCount,
      open_count: c.openCount,
      scheduled_at: c.scheduledAt,
      sent_at: c.sentAt,
      created_at: c.createdAt
    }));

    return res.status(200).json({ success: true, campaigns: mappedCampaigns, total, page, limit });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/campaign/:id ────────────────────────────────────────
const getCampaign = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }

    const recipients = await prisma.recipient.findMany({
      where: { campaignId: id },
      take: 100,
      select: { id: true, email: true, name: true, status: true, sentAt: true }
    });

    const mappedRecipients = recipients.map(r => ({
      ...r,
      sent_at: r.sentAt
    }));

    return res.status(200).json({ success: true, campaign, recipients: mappedRecipients });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/campaign/:id ─────────────────────────────────────
const deleteCampaign = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.campaign.deleteMany({
      where: { id, userId: req.user.id }
    });
    return res.status(200).json({ success: true, message: 'Campaign deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createCampaign, listCampaigns, getCampaign, deleteCampaign };
