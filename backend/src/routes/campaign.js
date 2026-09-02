// routes/campaign.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const os = require('os');
const { createCampaign, listCampaigns, getCampaign, deleteCampaign } = require('../controllers/campaignController');
const { authMiddleware } = require('../middleware/auth');

// Multer v2 compatible storage — use OS temp dir
const upload = multer({
  dest: path.join(os.tmpdir()),           // OS temp dir (works on all platforms)
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'text/csv'
      || file.originalname.toLowerCase().endsWith('.csv');
    cb(ok ? null : new Error('Only CSV files allowed'), ok);
  },
});

router.use(authMiddleware);

router.post('/create', upload.single('csv'), createCampaign);
router.get('/list', listCampaigns);
router.get('/:id', getCampaign);
router.delete('/:id', deleteCampaign);

module.exports = router;
