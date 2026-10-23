const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
