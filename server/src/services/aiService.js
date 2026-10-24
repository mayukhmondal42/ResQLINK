// -----------------------------------------------------------------------------
// aiService.js — ResQLink AI triage
// Uses Gemini to analyze incident reports — REAL AI ONLY
// -----------------------------------------------------------------------------

const MODELS = [
  'v1beta/models/gemini-3.8-flash',
  'v1beta/models/gemini-3.5-flash-lite'
];

async function geminiAnalyze({ title, description }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('Invalid GEMINI_API_KEY - add GEMINI_API_KEY in server/.env');
  }

  const prompt = `You are an emergency dispatch triage assistant. Analyze this citizen incident report and respond with STRICT JSON only, no markdown fences, matching exactly this shape:
{"summary": string (MAX 20 words, terse and actionable), "suggestedSeverity": "low"|"medium"|"high"|"critical", "suggestedCategory": "flood"|"fire"|"earthquake"|"medical"|"structural"|"other", "confidence": number (0-100)}

Title: ${title}
Description: ${description}`;

  let lastErr = null;

  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 300, temperature: 0.2 },
          }),
        }
      );

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        lastErr = new Error(data?.error?.message || `Model ${model} failed: ${res.status}`);
        continue;
      }

      console.log(`[aiService] WORKING MODEL: ${model}`);
      // Clean markdown fences if any
      const clean = rawText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return { ...parsed, source: 'gemini' };

    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error('Gemini failed: all models failed');
}

async function analyzeIncident({ title, description }) {
  return await geminiAnalyze({ title, description });
}

module.exports = { analyzeIncident, geminiAnalyze };