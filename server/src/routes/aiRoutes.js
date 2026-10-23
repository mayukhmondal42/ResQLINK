const express = require('express');
const { getSituationSummary, classifyDraft, chat } = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// PUBLIC - everybody can use, no login needed
router.post('/chat', chat);

// PROTECTED - only after this line need login
router.use(protect);
router.get('/situation-summary', authorize('eoc', 'admin'), getSituationSummary);
router.post('/classify', classifyDraft);

module.exports = router;