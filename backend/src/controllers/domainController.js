// controllers/domainController.js - Domain & Multi-SMTP sender pool management
const prisma = require('../lib/prisma');

// ─── GET /api/domains ─────────────────────────────────────────────
const getDomains = async (req, res, next) => {
  try {
    const domains = await prisma.domain.findMany({
      orderBy: { reputationScore: 'desc' }
    });
    
    // Map Prisma camelCase and safely mask password
    const mappedDomains = domains.map(d => ({
      ...d,
      ip_address: d.ipAddress,
      smtp_host: d.smtpHost || 'smtp.gmail.com',
      smtp_port: d.smtpPort || 587,
      smtp_user: d.smtpUser || d.domain,
      has_password: !!d.smtpPass,
      reputation_score: d.reputationScore,
      emails_sent_today: d.emailsSentToday,
      daily_limit: d.dailyLimit,
      last_used_at: d.lastUsedAt,
      created_at: d.createdAt,
      updated_at: d.updatedAt,
      smtpPass: undefined // Do not leak raw password to client
    }));

    return res.status(200).json({ success: true, domains: mappedDomains });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/domains/add ────────────────────────────────────────
const addDomain = async (req, res, next) => {
  try {
    const { domain, ipAddress, smtpHost, smtpPort, smtpUser, smtpPass, dailyLimit } = req.body;
    if (!domain) {
      return res.status(400).json({ success: false, message: 'Domain or Gmail address is required.' });
    }

    const cleanDomain = domain.toLowerCase().trim();
    const cleanUser = smtpUser ? smtpUser.toLowerCase().trim() : (cleanDomain.includes('@') ? cleanDomain : null);

    const newDomain = await prisma.domain.create({
      data: {
        domain: cleanDomain,
        ipAddress: ipAddress ? ipAddress.trim() : null,
        smtpHost: smtpHost ? smtpHost.trim() : 'smtp.gmail.com',
        smtpPort: parseInt(smtpPort) || 587,
        smtpUser: cleanUser,
        smtpPass: smtpPass ? smtpPass.trim() : null,
        status: 'active',
        reputationScore: 100,
        dailyLimit: parseInt(dailyLimit) || 80
      }
    });

    const mappedDomain = {
      ...newDomain,
      ip_address: newDomain.ipAddress,
      smtp_host: newDomain.smtpHost,
      smtp_port: newDomain.smtpPort,
      smtp_user: newDomain.smtpUser,
      has_password: !!newDomain.smtpPass,
      reputation_score: newDomain.reputationScore,
      emails_sent_today: newDomain.emailsSentToday,
      daily_limit: newDomain.dailyLimit,
      last_used_at: newDomain.lastUsedAt,
      created_at: newDomain.createdAt,
      updated_at: newDomain.updatedAt,
      smtpPass: undefined
    };

    return res.status(201).json({ success: true, message: 'Sender account added.', domain: mappedDomain });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Account or domain already exists.' });
    }
    next(error);
  }
};

// ─── DELETE /api/domains/:id ──────────────────────────────────────
const deleteDomain = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.domain.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Sender account removed.' });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/domains/:id/status ─────────────────────────────────
const updateDomainStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const validStatuses = ['active', 'warmup', 'inactive', 'blacklisted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }
    await prisma.domain.update({
      where: { id },
      data: { status }
    });
    return res.status(200).json({ success: true, message: 'Status updated.' });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/domains/:id/limit ──────────────────────────────────
const updateDomainDailyLimit = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { dailyLimit } = req.body;
    const limit = parseInt(dailyLimit);
    if (isNaN(limit) || limit < 1) {
      return res.status(400).json({ success: false, message: 'Daily limit must be a positive number.' });
    }
    await prisma.domain.update({
      where: { id },
      data: { dailyLimit: limit }
    });
    return res.status(200).json({ success: true, message: 'Daily limit updated.' });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/domains/next ────────────────────────────────────────
// Used internally by worker to select next sender account for rotation
const getNextActiveDomain = async () => {
  try {
    const domains = await prisma.$queryRaw`
      SELECT id, domain, ip_address as ipAddress,
             smtp_host as smtpHost, smtp_port as smtpPort,
             smtp_user as smtpUser, smtp_pass as smtpPass,
             status, reputation_score as reputationScore,
             emails_sent_today as emailsSentToday, daily_limit as dailyLimit, last_used_at as lastUsedAt
      FROM domains
      WHERE status = 'active' AND emails_sent_today < daily_limit
      ORDER BY last_used_at ASC, emails_sent_today ASC, reputation_score DESC
      LIMIT 1
    `;

    if (domains && domains.length > 0) {
      return domains[0];
    }

    // Fall back to warmup domains that have not exceeded daily limit
    const warmupDomains = await prisma.$queryRaw`
      SELECT id, domain, ip_address as ipAddress,
             smtp_host as smtpHost, smtp_port as smtpPort,
             smtp_user as smtpUser, smtp_pass as smtpPass,
             status, reputation_score as reputationScore,
             emails_sent_today as emailsSentToday, daily_limit as dailyLimit, last_used_at as lastUsedAt
      FROM domains
      WHERE status = 'warmup' AND emails_sent_today < daily_limit
      ORDER BY last_used_at ASC, emails_sent_today ASC, reputation_score DESC
      LIMIT 1
    `;

    return (warmupDomains && warmupDomains.length > 0) ? warmupDomains[0] : null;
  } catch (err) {
    console.error('⚠️ Error selecting active domain for rotation:', err.message);
    return null;
  }
};

// Reset daily email counts (called automatically every midnight)
const resetDailyEmailCounts = async () => {
  await prisma.domain.updateMany({
    data: { emailsSentToday: 0 }
  });
};

module.exports = {
  getDomains,
  addDomain,
  deleteDomain,
  updateDomainStatus,
  updateDomainDailyLimit,
  getNextActiveDomain,
  resetDailyEmailCounts
};
