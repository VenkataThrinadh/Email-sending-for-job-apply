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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max (larger for attachments)
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'csv') {
      const ok = file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv');
      cb(ok ? null : new Error('Only CSV files allowed for recipients'), ok);
    } else {
      cb(null, true); // Allow all other files for attachments (PDF, DOCX, etc.)
    }
  },
});

router.use(authMiddleware);

router.post('/create', upload.fields([{ name: 'csv', maxCount: 1 }, { name: 'attachment', maxCount: 1 }]), createCampaign);
router.get('/list', listCampaigns);
router.get('/:id', getCampaign);
router.delete('/:id', deleteCampaign);

module.exports = router;
