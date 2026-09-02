// controllers/queueController.js - BullMQ queue management
const { emailQueue, getQueueStats } = require('../queue/emailQueue');
const prisma = require('../lib/prisma');

// ─── GET /api/queue/status ────────────────────────────────────────
const getQueueStatus = async (req, res, next) => {
  try {
    const stats = await getQueueStats();

    // Also get recent recipient statuses from DB
    const recentJobs = await prisma.$queryRaw`
       SELECT r.id, r.email, r.name, r.status, r.sent_at, c.name as campaign_name
       FROM recipients r
       LEFT JOIN campaigns c ON r.campaign_id = c.id
       ORDER BY r.id DESC LIMIT 50
    `;

    return res.status(200).json({ success: true, stats, recentJobs });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/queue/retry ────────────────────────────────────────
const retryFailedJobs = async (req, res, next) => {
  try {
    const failedJobs = await emailQueue.getFailed();
    let retried = 0;
    for (const job of failedJobs) {
      await job.retry();
      retried++;
    }
    return res.status(200).json({ success: true, message: `Retried ${retried} failed jobs.` });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/queue/pause ────────────────────────────────────────
const pauseQueue = async (req, res, next) => {
  try {
    await emailQueue.pause();
    return res.status(200).json({ success: true, message: 'Queue paused.' });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/queue/resume ───────────────────────────────────────
const resumeQueue = async (req, res, next) => {
  try {
    await emailQueue.resume();
    return res.status(200).json({ success: true, message: 'Queue resumed.' });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/queue/jobs ──────────────────────────────────────────
const getJobs = async (req, res, next) => {
  try {
    const { type = 'all' } = req.query;
    let jobs = [];
    if (type === 'failed' || type === 'all') {
      const failed = await emailQueue.getFailed(0, 20);
      jobs.push(...failed.map((j) => ({ ...j.data, bullState: 'failed', failedReason: j.failedReason })));
    }
    if (type === 'active' || type === 'all') {
      const active = await emailQueue.getActive(0, 20);
      jobs.push(...active.map((j) => ({ ...j.data, bullState: 'active' })));
    }
    if (type === 'waiting' || type === 'all') {
      const waiting = await emailQueue.getWaiting(0, 20);
      jobs.push(...waiting.map((j) => ({ ...j.data, bullState: 'waiting' })));
    }
    return res.status(200).json({ success: true, jobs });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/queue/flush ──────────────────────────────────────
const flushQueue = async (req, res, next) => {
  try {
    await emailQueue.obliterate({ force: true });
    return res.status(200).json({ success: true, message: 'Queue flushed.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getQueueStatus, retryFailedJobs, pauseQueue, resumeQueue, getJobs, flushQueue };
