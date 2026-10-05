// routes/domains.js
const express = require('express');
const router = express.Router();
const { getDomains, addDomain, deleteDomain, updateDomainStatus } = require('../controllers/domainController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', getDomains);
router.post('/add', addDomain);
router.put('/:id/status', updateDomainStatus);
router.delete('/:id', deleteDomain);

module.exports = router;
