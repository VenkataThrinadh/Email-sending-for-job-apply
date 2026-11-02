// routes/domains.js
const express = require('express');
const router = express.Router();
const { getDomains, addDomain, deleteDomain, updateDomainStatus, updateDomainDailyLimit } = require('../controllers/domainController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', getDomains);
router.post('/add', addDomain);
router.put('/:id/status', updateDomainStatus);
router.put('/:id/limit', updateDomainDailyLimit);
router.delete('/:id', deleteDomain);

module.exports = router;
