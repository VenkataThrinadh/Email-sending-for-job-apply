// controllers/logController.js - Bounce, complaint, and reputation logs
const prisma = require('../lib/prisma');

// ─── GET /api/logs/bounces ────────────────────────────────────────
const getBounces = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [bounces, total] = await Promise.all([
      prisma.$queryRaw`
        SELECT l.*, c.name as campaign_name
        FROM logs l
        LEFT JOIN campaigns c ON l.campaign_id = c.id
        WHERE l.status IN ('bounced', 'complained')
        ORDER BY l.created_at DESC
        LIMIT ${limit} OFFSET ${skip}
      `,
      prisma.log.count({
        where: {
          status: { in: ['bounced', 'complained'] }
        }
      })
    ]);

    return res.status(200).json({ success: true, bounces, total, page, limit });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/logs/suppression ────────────────────────────────────
const getSuppressionList = async (req, res, next) => {
  try {
    const list = await prisma.suppressionList.findMany({
      orderBy: { addedAt: 'desc' },
      take: 200
    });
    return res.status(200).json({ success: true, list });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/logs/suppression/add ──────────────────────────────
const addToSuppression = async (req, res, next) => {
  try {
    const { email, reason } = req.body;
    if (!email || !reason) {
      return res.status(400).json({ success: false, message: 'Email and reason are required.' });
    }
    
    // Equivalent to INSERT IGNORE
    await prisma.suppressionList.upsert({
      where: { email: email.toLowerCase() },
      update: {},
      create: {
        email: email.toLowerCase(),
        reason
      }
    });

    return res.status(201).json({ success: true, message: 'Email added to suppression list.' });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/logs/suppression/:email ──────────────────────────
const removeFromSuppression = async (req, res, next) => {
  try {
    const { email } = req.params;
    await prisma.suppressionList.deleteMany({
      where: { email: decodeURIComponent(email) }
    });
    return res.status(200).json({ success: true, message: 'Email removed from suppression list.' });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/logs/reputation ─────────────────────────────────────
const getReputation = async (req, res, next) => {
  try {
    // Aggregate stats from logs
    const totals = await prisma.$queryRaw`
      SELECT
         COUNT(*) as total_sent,
         SUM(status = 'sent') as delivered,
         SUM(status = 'bounced') as bounced,
         SUM(status = 'complained') as complained,
         SUM(status = 'opened') as opened,
         SUM(status = 'failed') as failed
      FROM logs
    `;

    const stats = totals[0] || {};
    // BigInt conversions from raw query
    const total = Number(stats.total_sent) || 1;
    const delivered = Number(stats.delivered) || 0;
    const bounced = Number(stats.bounced) || 0;
    const complained = Number(stats.complained) || 0;

    // Calculate sender score (0-100)
    const bounceRate = bounced / total;
    const complaintRate = complained / total;
    const deliveryRate = delivered / total;
    const senderScore = Math.min(
      100,
      Math.max(
        0,
        Math.round(100 - bounceRate * 200 - complaintRate * 500 + deliveryRate * 20)
      )
    );

    // Domain reputation averages
    const domainScores = await prisma.domain.findMany({
      orderBy: { reputationScore: 'desc' },
      select: { domain: true, reputationScore: true, status: true }
    });

    // Spam vs inbox (mock calculation based on bounce/complaint rates)
    const inboxRate = Math.max(0, Math.min(100, Math.round(deliveryRate * 100 - complaintRate * 1000)));
    const spamRate = 100 - inboxRate;

    // 30-day complaint trend
    const complaintTrend = await prisma.$queryRaw`
      SELECT DATE(created_at) as date,
             SUM(status = 'complained') as complaints,
             SUM(status = 'bounced') as bounces,
             COUNT(*) as total
      FROM logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const mappedComplaintTrend = complaintTrend.map(t => ({
      date: t.date,
      complaints: Number(t.complaints),
      bounces: Number(t.bounces),
      total: Number(t.total)
    }));

    // Overall alerting thresholds
    const alerts = [];
    if (bounceRate > 0.05) alerts.push({ type: 'error', message: `High bounce rate: ${(bounceRate * 100).toFixed(2)}%` });
    if (complaintRate > 0.001) alerts.push({ type: 'warning', message: `Complaint rate: ${(complaintRate * 100).toFixed(3)}%` });
    if (senderScore < 60) alerts.push({ type: 'error', message: `Low sender score: ${senderScore}/100` });

    return res.status(200).json({
      success: true,
      senderScore,
      stats: {
        total_sent: Number(stats.total_sent) || 0,
        delivered: Number(stats.delivered) || 0,
        bounced: Number(stats.bounced) || 0,
        complained: Number(stats.complained) || 0,
        opened: Number(stats.opened) || 0,
        failed: Number(stats.failed) || 0,
        bounceRate: (bounceRate * 100).toFixed(2), 
        complaintRate: (complaintRate * 100).toFixed(3) 
      },
      inboxRate,
      spamRate,
      domainScores: domainScores.map(d => ({ ...d, reputation_score: d.reputationScore })),
      complaintTrend: mappedComplaintTrend,
      alerts,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/logs/analytics ──────────────────────────────────────
const getAnalytics = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;

    // Pull from pre-aggregated email_stats table
    const dailyStats = await prisma.$queryRaw`
       SELECT * FROM email_stats
       WHERE stat_date >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
       ORDER BY stat_date ASC
    `;

    // Top-level KPI totals
    const kpiRaw = await prisma.$queryRaw`
       SELECT
         IFNULL(SUM(emails_sent), 0) as total_sent,
         IFNULL(SUM(emails_delivered), 0) as total_delivered,
         IFNULL(SUM(emails_failed), 0) as total_failed,
         IFNULL(SUM(emails_bounced), 0) as total_bounced,
         IFNULL(SUM(emails_complained), 0) as total_complained,
         IFNULL(SUM(emails_opened), 0) as total_opened
       FROM email_stats
       WHERE stat_date >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
    `;
    const kpi = kpiRaw[0] || {};

    // Queue status from recipients
    const queueStatsRaw = await prisma.$queryRaw`
       SELECT
         SUM(status = 'pending') as pending,
         SUM(status = 'sent') as sent,
         SUM(status = 'failed') as failed
       FROM recipients
    `;
    const queueStats = queueStatsRaw[0] || {};

    // Campaign count
    const campaignCount = await prisma.campaign.count();

    const totalSent = Number(kpi.total_sent) || 1;
    const openRate = ((Number(kpi.total_opened) / totalSent) * 100).toFixed(1);
    const bounceRate = ((Number(kpi.total_bounced) / totalSent) * 100).toFixed(1);
    const deliverRate = ((Number(kpi.total_delivered) / totalSent) * 100).toFixed(1);

    return res.status(200).json({
      success: true,
      kpi: {
        totalSent: Number(kpi.total_sent) || 0,
        delivered: Number(kpi.total_delivered) || 0,
        failed: Number(kpi.total_failed) || 0,
        bounced: Number(kpi.total_bounced) || 0,
        complained: Number(kpi.total_complained) || 0,
        opened: Number(kpi.total_opened) || 0,
        openRate,
        bounceRate,
        deliverRate,
        campaignCount,
      },
      dailyStats,
      queueStats: {
        pending: Number(queueStats.pending) || 0,
        sent: Number(queueStats.sent) || 0,
        failed: Number(queueStats.failed) || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBounces, getSuppressionList, addToSuppression, removeFromSuppression, getReputation, getAnalytics };
