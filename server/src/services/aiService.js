// -----------------------------------------------------------------------------
// aiService.js — ResQLink AI triage
// Uses Gemini to analyze incident reports
// -----------------------------------------------------------------------------

async function geminiAnalyze({ title, description }) {
  const prompt = `You are an emergency dispatch triage assistant. Analyze this
citizen incident report and respond with STRICT JSON only, no markdown fences,
matching exactly this shape:
{"summary": string (MAX 20 words, terse and actionable, e.g. "Flood affecting residential area. Approximately 40 people stranded. Immediate evacuation recommended."), "suggestedSeverity": "low"|"medium"|"high"|"critical", "suggestedCategory": "flood"|"fire"|"earthquake"|"medical"|"structural"|"other", "confidence": number (0-100, how confident you are this is a genuine, coherent, non-spam report)}

Title: ${title}
Description: ${description}`;

  const key = process.env.GEMINI_API_KEY;
  const models = [
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.0-flash',
    'gemini-1.5-flash',
  ];

  let lastError = null;
  for (const model of models) {
    for (const version of ['v1beta', 'v1']) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          console.log('[aiService] WORKING MODEL:', version, model);
          const parsed = JSON.parse(rawText);
          return { ...parsed, source: 'gemini' };
        }
        lastError = data?.error?.message || `status ${res.status}`;
      } catch (e) { lastError = e.message; }
    }
  }
  throw new Error(`Gemini failed all models: ${lastError}`);
}

async function analyzeIncident({ title, description }) {
  try {
    return await geminiAnalyze({ title, description });
  } catch (e) {
    console.log('[aiService] Gemini failed, using fallback:', e.message);
    const text = `${title} ${description}`.toLowerCase();
    let suggestedSeverity = 'medium';
    if (text.includes('critical') || text.includes('stranded') || text.includes('trapped') || text.includes('fire') || text.includes('flood')) suggestedSeverity = 'high';
    if (text.includes('dying') || text.includes('collapsed')) suggestedSeverity = 'critical';

    let suggestedCategory = 'other';
    if (text.includes('flood') || text.includes('water')) suggestedCategory = 'flood';
    if (text.includes('fire')) suggestedCategory = 'fire';
    if (text.includes('earthquake')) suggestedCategory = 'earthquake';
    if (text.includes('medical') || text.includes('injured') || text.includes('hospital')) suggestedCategory = 'medical';

    return {
      summary: title,
      suggestedSeverity,
      suggestedCategory,
      confidence: 60,
      source: 'fallback',
      suggestedResources: [],
      recommendedResources: [],
      etaMinutes: 30,
    };
  }
}

// --- ADDED FOR demoSeed.js ---
function computeResourceRecommendation({ category, severity }) {
  if (severity === 'critical') return { recommendedResources: ['rescue_team', 'ambulance', 'boat'], etaMinutes: 15 };
  if (severity === 'high') return { recommendedResources: ['rescue_team', 'ambulance'], etaMinutes: 25 };
  if (category === 'medical') return { recommendedResources: ['ambulance'], etaMinutes: 20 };
  if (category === 'flood') return { recommendedResources: ['boat', 'rescue_team'], etaMinutes: 25 };
  return { recommendedResources: ['volunteers'], etaMinutes: 30 };
}

function buildShortSummary({ text, category, severity }) {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 120);
  return `${category} - ${severity}: ${clean}`;
}

module.exports = { analyzeIncident, geminiAnalyze, computeResourceRecommendation, buildShortSummary };