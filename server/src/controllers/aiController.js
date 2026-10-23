const asyncHandler = require('express-async-handler');
const Incident = require('../models/Incident');
const Facility = require('../models/Facility');
const { analyzeIncident } = require('../services/aiService');
const { generateCitizenAdvice, parseEOCQuery } = require('../services/chatService');
const { distanceMeters } = require('../utils/geo');


const getSituationSummary = asyncHandler(async (req, res) => {
  const openIncidents = await Incident.find({ status: { $nin: ['resolved', 'merged'] } });

  const counts = openIncidents.reduce((acc, inc) => {
    acc[inc.severity] = (acc[inc.severity] || 0) + 1;
    return acc;
  }, {});

  const summary =
    openIncidents.length === 0
      ? 'No active incidents. All clear.'
      : `${openIncidents.length} active incident(s): ` +
        Object.entries(counts)
          .map(([severity, count]) => `${count} ${severity}`)
          .join(', ') +
        '. Prioritize critical and high severity reports first.';

  res.json({
    success: true,
    summary,
    counts,
    totalOpen: openIncidents.length,
  });
});


const classifyDraft = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    res.status(400);
    throw new Error('title and description are required');
  }
  const result = await analyzeIncident({ title, description });
  res.json({ success: true, ...result });
});


const chat = asyncHandler(async (req, res) => {
  const { message, lng, lat } = req.body;
  if (!message || !message.trim()) {
    res.status(400);
    throw new Error('message is required');
  }

  
  const isDispatcher = req.user && ['eoc', 'admin', 'rescue_team'].includes(req.user.role);

  if (isDispatcher) {
    const { filter, description } = parseEOCQuery(message);
    const incidents = await Incident.find(filter)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title severity status category verification createdAt');

    const reply =
      incidents.length === 0
        ? `No incidents match "${description}".`
        : `Found ${incidents.length} report(s) matching "${description}".`;

    return res.json({ success: true, reply, incidents, mode: 'eoc_search' });
  }

 
  let reply = await generateCitizenAdvice(message);
  let nearestShelter = null;

  if (lng !== undefined && lat !== undefined) {
    const shelter = await Facility.findOne({
      type: 'shelter',
      status: { $ne: 'closed' },
      location: {
        $near: { $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] } },
      },
    });

    if (shelter) {
      const distanceKm = (distanceMeters([Number(lng), Number(lat)], shelter.location.coordinates) / 1000).toFixed(1);
      nearestShelter = { name: shelter.name, distanceKm: Number(distanceKm), address: shelter.location.address };
      reply += ` Nearest shelter: ${shelter.name} (${distanceKm} km away).`;
    }
  }

  res.json({ success: true, reply, nearestShelter, mode: 'citizen_advice' });
});

module.exports = { getSituationSummary, classifyDraft, chat };