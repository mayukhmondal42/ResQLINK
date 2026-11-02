const MODELS = [
  'v1beta/models/gemini-3.5-flash',
  'v1beta/models/gemini-3.5-flash-lite',
  'v1beta/models/gemini-3.0-flash',
  'v1beta/models/gemini-2.5-flash',
  'v1beta/models/gemini-2.5-flash-lite',
];

function localAnalyze({ title, description }) {
  const text = `${title} ${description}`.toLowerCase();
  let suggestedSeverity = 'medium';
  let suggestedCategory = 'other';
  if (text.includes('flood') || text.includes('water')) suggestedCategory = 'flood';
  else if (text.includes('fire') || text.includes('smoke')) suggestedCategory = 'fire';
  else if (text.includes('earthquake') || text.includes('tremor')) suggestedCategory = 'earthquake';
  else if (text.includes('injur') || text.includes('blood') || text.includes('hurt') || text.includes('medical')) suggestedCategory = 'medical';
  else if (text.includes('building') || text.includes('collapse') || text.includes('crack')) suggestedCategory = 'structural';

  if (text.includes('trapped') || text.includes('critical') || text.includes('dying') || text.includes('heavy') || text.includes('severe')) suggestedSeverity = 'critical';
  else if (text.includes('rising') || text.includes('spreading') || text.includes('urgent')) suggestedSeverity = 'high';
  else if (text.includes('minor') || text.includes('small')) suggestedSeverity = 'low';

  return {
    summary: title.slice(0, 100),
    suggestedSeverity,
    suggestedCategory,
    confidence: 70,
    source: 'local-fallback',
  };
}

async function geminiAnalyze({ title, description }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return localAnalyze({ title, description });

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
        console.log(`[aiService] Model ${model} failed:`, res.status);
        continue;
      }

      console.log(`[aiService] WORKING MODEL: ${model}`);
      const clean = rawText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return { ...parsed, source: 'gemini' };

    } catch (e) {
      lastErr = e;
    }
  }

  console.log('[aiService] All Gemini models failed, using local fallback:', lastErr?.message);
  return localAnalyze({ title, description });
}

async function analyzeIncident({ title, description }) {
  return await geminiAnalyze({ title, description });
}

module.exports = { analyzeIncident, geminiAnalyze };