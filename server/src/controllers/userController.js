const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Facility = require('../models/Facility');

const DIRECTORY_ROLES = ['eoc', 'hospital', 'shelter', 'rescue_team', 'ngo', 'volunteer'];


const getDirectory = asyncHandler(async (req, res) => {
  const users = await User.find({ role: { $in: DIRECTORY_ROLES } }).sort({ role: 1, name: 1 });

  
  const facilities = await Facility.find({ managedBy: { $in: users.map((u) => u._id) } });
  const facilityByManager = new Map(facilities.map((f) => [f.managedBy.toString(), f]));

  const directory = users.map((user) => ({
    _id: user._id,
    name: user.name,
    role: user.role,
    organizationName: user.organizationName,
    phone: user.phone,
    documentStatus: user.verificationDocument?.status || 'not_submitted',
    facility: facilityByManager.get(user._id.toString()) || null,
  }));

  res.json({ success: true, count: directory.length, directory });
});


const getVerificationDocument = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('name organizationName verificationDocument');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json({ success: true, user });
});


const reviewVerificationDocument = asyncHandler(async (req, res) => {
  const { status, note } = req.body; 
  if (!['approved', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error("status must be 'approved' or 'rejected'");
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (!user.verificationDocument || !user.verificationDocument.dataUrl) {
    res.status(400);
    throw new Error('This user has not submitted a verification document');
  }

  user.verificationDocument.status = status;
  user.verificationDocument.reviewedBy = req.user._id;
  user.verificationDocument.reviewNote = note || '';
  user.verificationDocument.reviewedAt = new Date();
  await user.save();

  res.json({ success: true, user });
});

module.exports = { getDirectory, getVerificationDocument, reviewVerificationDocument };