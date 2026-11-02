const express = require('express');
const { getSituationSummary, classifyDraft, chat } = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();


router.post('/chat',protect, chat);


router.use(protect);
router.get('/situation-summary', authorize('eoc', 'admin'), getSituationSummary);
router.post('/classify', classifyDraft);

module.exports = router;