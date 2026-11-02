// routes/webhook.js - Public webhook endpoint (no auth required)
const express = require('express');
const router = express.Router();
const { handleEmailStatus, trackOpen } = require('../controllers/webhookController');

// GET /api/webhook/open/:recipientId
// Transparent 1x1 GIF tracking pixel
router.get('/open/:recipientId', trackOpen);

// POST /api/webhook/email-status
// Public - no auth required for webhook providers
router.post('/email-status', handleEmailStatus);

// Also handle SNS subscription confirmation
router.post('/sns', async (req, res) => {
  const { Type, SubscribeURL } = req.body;
  if (Type === 'SubscriptionConfirmation' && SubscribeURL) {
    const https = require('https');
    https.get(SubscribeURL, () => console.log('✅ SNS subscription confirmed'));
  }
  res.status(200).json({ success: true });
});

module.exports = router;
