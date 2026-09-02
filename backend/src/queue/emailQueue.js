// queue/emailQueue.js - BullMQ queue definition and helpers
const { Queue } = require('bullmq');
const redisConnection = require('../config/redis');

// Queue retention config from env
const COMPLETED_COUNT    = parseInt(process.env.QUEUE_COMPLETED_COUNT)    || 1000;
const COMPLETED_AGE_SEC  = (parseInt(process.env.QUEUE_COMPLETED_AGE_HOURS) || 24) * 60 * 60;
const FAILED_COUNT       = parseInt(process.env.QUEUE_FAILED_COUNT)       || 5000;
const FAILED_AGE_SEC     = (parseInt(process.env.QUEUE_FAILED_AGE_DAYS)   || 7)  * 60 * 60 * 24;
const BACKOFF_DELAY      = parseInt(process.env.JOB_BACKOFF_DELAY)        || 2000;

// Create the email sending queue
const emailQueue = new Queue('email-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: parseInt(process.env.MAX_RETRIES) || 3,
    backoff: { type: 'exponential', delay: BACKOFF_DELAY },
    removeOnComplete: { count: COMPLETED_COUNT, age: COMPLETED_AGE_SEC },
    removeOnFail:     { count: FAILED_COUNT,    age: FAILED_AGE_SEC     },
  },
});

/**
 * Get queue statistics (pending, active, completed, failed)
 */
const getQueueStats = async () => {
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
    emailQueue.isPaused(),
  ]);

  return { waiting, active, completed, failed, delayed, isPaused: paused };
};

module.exports = { emailQueue, getQueueStats };
