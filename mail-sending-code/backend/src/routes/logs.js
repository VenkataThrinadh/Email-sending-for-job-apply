// routes/logs.js
const express = require('express');
const router = express.Router();
const {
  getBounces,
  getSuppressionList,
  addToSuppression,
  removeFromSuppression,
  getReputation,
  getAnalytics,
} = require('../controllers/logController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/bounces', getBounces);
router.get('/suppression', getSuppressionList);
router.post('/suppression', addToSuppression);
router.delete('/suppression/:email', removeFromSuppression);
router.get('/reputation', getReputation);
router.get('/analytics', getAnalytics);

module.exports = router;
