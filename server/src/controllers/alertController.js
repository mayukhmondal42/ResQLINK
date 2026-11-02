const asyncHandler = require('express-async-handler');
const Alert = require('../models/Alert');
const { getIO } = require('../services/socketService');


const getActiveAlerts = asyncHandler(async (req, res) => {
  const alerts = await Alert.find({ active: true }).sort({ createdAt: -1 }).limit(5);
  res.json({ success: true, alerts });
});


const issueAlert = asyncHandler(async (req, res) => {
  const { message, severity } = req.body;
  if (!message) {
    res.status(400);
    throw new Error('message is required');
  }

  const alert = await Alert.create({
    message,
    severity: severity || 'warning',
    issuedBy: req.user._id,
  });

  getIO().emit('alert:new', alert);
  res.status(201).json({ success: true, alert });
});


const dismissAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) {
    res.status(404);
    throw new Error('Alert not found');
  }
  alert.active = false;
  await alert.save();

  getIO().emit('alert:dismissed', { _id: alert._id });
  res.json({ success: true, alert });
});

module.exports = { getActiveAlerts, issueAlert, dismissAlert };
