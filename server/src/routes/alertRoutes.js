const express = require('express');
const { getActiveAlerts, issueAlert, dismissAlert } = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/active', getActiveAlerts); 
router.post('/', authorize('eoc', 'admin'), issueAlert);
router.patch('/:id/dismiss', authorize('eoc', 'admin'), dismissAlert);

module.exports = router;
