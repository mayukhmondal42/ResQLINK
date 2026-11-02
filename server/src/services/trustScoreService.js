const { distanceMeters } = require('../utils/geo');

const WEIGHTS = { gps: 0.3, crowd: 0.25, authority: 0.25, ai: 0.2 };




function computeGpsScore(reporterCoords, incidentCoords) {
  if (!reporterCoords) return 50;
  const dist = distanceMeters(reporterCoords, incidentCoords);
  if (dist <= 150) return 100;
  if (dist >= 5000) return 0;
  return Math.round(100 - ((dist - 150) / (5000 - 150)) * 100);
}




function computeCrowdScore(votes = []) {
  if (votes.length === 0) return 50;
  const confirms = votes.filter((v) => v.vote === 'confirm').length;
  const disputes = votes.filter((v) => v.vote === 'dispute').length;
  const net = confirms - disputes;
  const total = confirms + disputes;

  return Math.round(50 + (net / total) * 50);
}



function computeAuthorityScore(authorityVerification) {
  if (!authorityVerification || authorityVerification.status === 'pending') return 40;
  if (authorityVerification.status === 'confirmed') return 100;
  return 0; 
}




function computeAiScore(aiAnalysis) {
  if (!aiAnalysis || aiAnalysis.confidence === undefined) return 50;
  return aiAnalysis.confidence;
}

function trustStateFromScore(score, authorityVerification) {
  if (authorityVerification?.status === 'rejected') return 'suspicious';
  if (score >= 85 && authorityVerification?.status === 'confirmed') return 'highly_trusted';
  if (score >= 60) return 'verified';
  if (score <= 30) return 'suspicious';
  return 'pending';
}




function computeTrustScore({ incidentCoords, reporterCoords, votes, authorityVerification, aiAnalysis }) {
  const gpsScore = computeGpsScore(reporterCoords, incidentCoords);
  const crowdScore = computeCrowdScore(votes);
  const authorityScore = computeAuthorityScore(authorityVerification);
  const aiScore = computeAiScore(aiAnalysis);

  const trustScore = Math.round(
    gpsScore * WEIGHTS.gps +
      crowdScore * WEIGHTS.crowd +
      authorityScore * WEIGHTS.authority +
      aiScore * WEIGHTS.ai
  );

  return {
    gpsScore,
    crowdScore,
    authorityScore,
    aiScore,
    trustScore,
    trustState: trustStateFromScore(trustScore, authorityVerification),
  };
}




function shouldEscalate({ severity, status, trustState }) {
  return severity === 'critical' && trustState !== 'suspicious' && ['reported', 'acknowledged'].includes(status);
}

module.exports = { computeTrustScore, shouldEscalate };
