// routes/queue.js
const express = require('express');
const router = express.Router();
const { getQueueStatus, retryFailedJobs, pauseQueue, resumeQueue, getJobs, flushQueue } = require('../controllers/queueController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/status', getQueueStatus);
router.get('/jobs', getJobs);
router.post('/retry', retryFailedJobs);
router.post('/pause', pauseQueue);
router.post('/resume', resumeQueue);
router.delete('/flush', flushQueue);

module.exports = router;
