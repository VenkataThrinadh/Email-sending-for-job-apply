// controllers/domainController.js - Domain/IP pool management
const prisma = require('../lib/prisma');

// ─── GET /api/domains ─────────────────────────────────────────────
const getDomains = async (req, res, next) => {
  try {
    const domains = await prisma.domain.findMany({
      orderBy: { reputationScore: 'desc' }
    });
    
    // Map Prisma camelCase to match the expected JSON format if necessary
    const mappedDomains = domains.map(d => ({
      ...d,
      ip_address: d.ipAddress,
      reputation_score: d.reputationScore,
      emails_sent_today: d.emailsSentToday,
      daily_limit: d.dailyLimit,
      last_used_at: d.lastUsedAt,
      created_at: d.createdAt,
      updated_at: d.updatedAt
    }));

    return res.status(200).json({ success: true, domains: mappedDomains });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/domains/add ────────────────────────────────────────
const addDomain = async (req, res, next) => {
  try {
    const { domain, ipAddress } = req.body;
    if (!domain) {
      return res.status(400).json({ success: false, message: 'Domain name is required.' });
    }

    const newDomain = await prisma.domain.create({
      data: {
        domain: domain.toLowerCase(),
        ipAddress: ipAddress || null,
        status: 'warmup',
        reputationScore: 100
      }
    });

    const mappedDomain = {
      ...newDomain,
      ip_address: newDomain.ipAddress,
      reputation_score: newDomain.reputationScore,
      emails_sent_today: newDomain.emailsSentToday,
      daily_limit: newDomain.dailyLimit,
      last_used_at: newDomain.lastUsedAt,
      created_at: newDomain.createdAt,
      updated_at: newDomain.updatedAt
    };

    return res.status(201).json({ success: true, message: 'Domain added.', domain: mappedDomain });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Domain already exists.' });
    }
    next(error);
  }
};

// ─── DELETE /api/domains/:id ──────────────────────────────────────
const deleteDomain = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.domain.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Domain removed.' });
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
    return res.status(200).json({ success: true, message: 'Domain status updated.' });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/domains/next ────────────────────────────────────────
// Used internally by worker to select next domain for rotation
const getNextActiveDomain = async () => {
  const domains = await prisma.domain.findMany({
    where: {
      status: 'active',
      emailsSentToday: { lt: prisma.domain.fields.dailyLimit }
    },
    orderBy: [
      { lastUsedAt: 'asc' },
      { reputationScore: 'desc' }
    ],
    take: 1
  });
  
  if (domains.length === 0) {
    // Fall back to warmup domains
    const warmup = await prisma.domain.findFirst({
      where: { status: 'warmup' },
      orderBy: { lastUsedAt: 'asc' }
    });
    return warmup || null;
  }
  return domains[0];
};

// Reset daily email counts (to be called by a cron/scheduler)
const resetDailyEmailCounts = async () => {
  await prisma.domain.updateMany({
    data: { emailsSentToday: 0 }
  });
};

module.exports = { getDomains, addDomain, deleteDomain, updateDomainStatus, getNextActiveDomain, resetDailyEmailCounts };
