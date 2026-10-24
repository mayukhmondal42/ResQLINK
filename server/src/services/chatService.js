// server/src/services/chatService.js
const BASE_URL = 'https://generativelanguage.googleapis.com';

const MODELS = [
  'v1beta/models/gemini-2.0-flash',
];

const SYSTEM_PROMPT = `You are ResQLink Assistant, a calm, helpful disaster-relief assistant for India. You help citizens with flood, cyclone, earthquake, fire, medical emergencies. Give short, practical steps, helpline numbers (112, 1070, 108), and shelter advice. Never invent helpline numbers. Keep reply under 80 words.`;

async function callGemini(userMessage) {
  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) return 'AI not configured. Add GEMINI_API_KEY in server/.env';
  console.log('=== CHAT DEBUG === KEY EXISTS: true, LEN:', KEY.length);

  for (const model of MODELS) {
    try {
      const url = `${BASE_URL}/${model}:generateContent?key=${KEY}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nUser: ${userMessage}` }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(`WORKING MODEL FOUND: ${model}`);
        return data.candidates[0].content.parts[0].text;
      }
      console.log(`Model ${model} failed:`, res.status, data.error?.message);
      if (res.status === 400 && data.error?.message?.includes('API key not valid')) {
        return 'Invalid Gemini API key. Please update GEMINI_API_KEY in server/.env';
      }
    } catch (e) {
      console.log(`Model ${model} exception:`, e.message);
    }
  }
  return 'AI is temporarily unavailable. Please try again or call 112 for emergencies.';
}

async function generateCitizenAdvice(message) {
  return await callGemini(message);
}

function parseEOCQuery(message) {
  const lower = message.toLowerCase();
  const filter = { status: { $nin: ['resolved', 'merged'] } };
  let description = message;

  if (lower.includes('unverified')) {
    filter.verification = { $ne: 'verified' };
    description = 'unverified reports';
  }
  if (lower.includes('flood')) filter.category = 'flood';
  if (lower.includes('fire')) filter.category = 'fire';
  if (lower.includes('earthquake')) filter.category = 'earthquake';
  if (lower.includes('medical')) filter.category = 'medical';
  if (lower.includes('critical')) { filter.severity = 'critical'; description = 'critical incidents that are active'; }
  if (lower.includes('resolved')) {
    delete filter.status;
    filter.status = 'resolved';
    description = 'resolved reports';
  }

  return { filter, description };
}

async function askGemini(message, user) {
  return await callGemini(message);
}

async function getChatResponse(message, user) {
  return await callGemini(message);
}

module.exports = {
  generateCitizenAdvice,
  parseEOCQuery,
  askGemini,
  getChatResponse,
};