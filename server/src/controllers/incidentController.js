const asyncHandler = require('express-async-handler');
const Incident = require('../models/Incident');
const { analyzeIncident } = require('../services/aiService');
const { findDuplicate } = require('../services/duplicateService');
const { computeTrustScore, shouldEscalate } = require('../services/trustScoreService');
const { getIO } = require('../services/socketService');


const createIncident = asyncHandler(async (req, res) => {
  const { type, title, description, category, lng, lat, address, imageUrl, reporterLng, reporterLat } = req.body;

  if (!title || !description || lng === undefined || lat === undefined) {
    res.status(400);
    throw new Error('title, description, lng and lat are required');
  }

  const incident = await Incident.create({
    type: type || 'incident_report',
    title,
    description,
    category: category || 'other',
    location: { coordinates: [Number(lng), Number(lat)], address },
    
    reporterLocation:
      reporterLng !== undefined && reporterLat !== undefined
        ? { coordinates: [Number(reporterLng), Number(reporterLat)] }
        : undefined,
    reportedBy: req.user?._id,
    imageUrl,
    timeline: [{ status: 'reported', note: 'Report submitted by citizen', actor: req.user?._id }],
  });

  const [aiResult, duplicateId] = await Promise.all([
    analyzeIncident({ title, description }),
    findDuplicate(incident),
  ]);

  incident.aiAnalysis = {
    summary: aiResult.summary,
    suggestedSeverity: aiResult.suggestedSeverity,
    suggestedCategory: aiResult.suggestedCategory,
    suggestedResources: aiResult.suggestedResources || [],
    recommendedResources: aiResult.recommendedResources,
    etaMinutes: aiResult.etaMinutes,
    confidence: aiResult.confidence,
    generatedAt: new Date(),
    source: aiResult.source,
  };
  
  if (incident.severity !== 'critical') {
    incident.severity = aiResult.suggestedSeverity || incident.severity;
  }

  if (duplicateId) {
    incident.duplicateOf = duplicateId;
    incident.status = 'merged';
  }

  
  incident.verification = computeTrustScore({
    incidentCoords: incident.location.coordinates,
    reporterCoords: incident.reporterLocation?.coordinates || null,
    votes: incident.crowdVotes,
    authorityVerification: incident.authorityVerification,
    aiAnalysis: incident.aiAnalysis,
  });
  incident.escalated = shouldEscalate({
    severity: incident.severity,
    status: incident.status,
    trustState: incident.verification.trustState,
  });

  await incident.save();

  
  getIO().emit('incident:new', incident);
  if (incident.escalated) {
    getIO().emit('incident:escalated', incident);
  }

  res.status(201).json({ success: true, incident });
});


const getIncidents = asyncHandler(async (req, res) => {
  const { status, severity, category, mine } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (severity) filter.severity = severity;
  if (category) filter.category = category;
  if (mine === 'true' && req.user) filter.reportedBy = req.user._id;

  const incidents = await Incident.find(filter)
    .sort({ createdAt: -1 })
    .populate('reportedBy', 'name role')
    .populate('assignedTeam', 'name organizationName');

  res.json({ success: true, count: incidents.length, incidents });
});


const getIncidentById = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id)
    .populate('reportedBy', 'name role phone')
    .populate('assignedTeam', 'name organizationName');

  if (!incident) {
    res.status(404);
    throw new Error('Incident not found');
  }
  res.json({ success: true, incident });
});


const updateIncidentStatus = asyncHandler(async (req, res) => {
  const { status, note, assignedTeam } = req.body;
  const incident = await Incident.findById(req.params.id);

  if (!incident) {
    res.status(404);
    throw new Error('Incident not found');
  }

  if (status) incident.status = status;
  if (assignedTeam) incident.assignedTeam = assignedTeam;
  incident.timeline.push({ status: status || incident.status, note, actor: req.user._id });

  await incident.save();
  await incident.populate('reportedBy', 'name role phone');
  await incident.populate('assignedTeam', 'name organizationName');

  getIO().emit('incident:update', incident);

  res.json({ success: true, incident });
});


const crowdVerify = asyncHandler(async (req, res) => {
  const { vote } = req.body; 
  if (!['confirm', 'dispute'].includes(vote)) {
    res.status(400);
    throw new Error("vote must be 'confirm' or 'dispute'");
  }

  const incident = await Incident.findById(req.params.id);
  if (!incident) {
    res.status(404);
    throw new Error('Incident not found');
  }

  if (incident.reportedBy && incident.reportedBy.toString() === req.user._id.toString()) {
    res.status(403);
    throw new Error('You cannot verify your own report');
  }

  const existingVoteIndex = incident.crowdVotes.findIndex(
    (v) => v.user.toString() === req.user._id.toString()
  );
  if (existingVoteIndex >= 0) {
    incident.crowdVotes[existingVoteIndex].vote = vote;
    incident.crowdVotes[existingVoteIndex].at = new Date();
  } else {
    incident.crowdVotes.push({ user: req.user._id, vote });
  }

  incident.verification = computeTrustScore({
    incidentCoords: incident.location.coordinates,
    reporterCoords: incident.reporterLocation?.coordinates || null,
    votes: incident.crowdVotes,
    authorityVerification: incident.authorityVerification,
    aiAnalysis: incident.aiAnalysis,
  });
  incident.escalated = shouldEscalate({
    severity: incident.severity,
    status: incident.status,
    trustState: incident.verification.trustState,
  });

  await incident.save();
  await incident.populate('reportedBy', 'name role phone');
  await incident.populate('assignedTeam', 'name organizationName');
  getIO().emit('incident:update', incident);
  res.json({ success: true, incident });
});


const authorityVerify = asyncHandler(async (req, res) => {
  const { status, note } = req.body; 
  if (!['confirmed', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error("status must be 'confirmed' or 'rejected'");
  }

  const incident = await Incident.findById(req.params.id);
  if (!incident) {
    res.status(404);
    throw new Error('Incident not found');
  }

  incident.authorityVerification = { status, verifiedBy: req.user._id, note, at: new Date() };
  incident.timeline.push({
    status: incident.status,
    note: `Authority ${status} this report${note ? `: ${note}` : ''}`,
    actor: req.user._id,
  });

  incident.verification = computeTrustScore({
    incidentCoords: incident.location.coordinates,
    reporterCoords: incident.reporterLocation?.coordinates || null,
    votes: incident.crowdVotes,
    authorityVerification: incident.authorityVerification,
    aiAnalysis: incident.aiAnalysis,
  });
  if (status === 'rejected') {
    incident.status = 'rejected';
  }
  incident.escalated = shouldEscalate({
    severity: incident.severity,
    status: incident.status,
    trustState: incident.verification.trustState,
  });

  await incident.save();
  await incident.populate('reportedBy', 'name role phone');
  await incident.populate('assignedTeam', 'name organizationName');
  getIO().emit('incident:update', incident);
  res.json({ success: true, incident });
});

module.exports = {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  crowdVerify,
  authorityVerify,
};
