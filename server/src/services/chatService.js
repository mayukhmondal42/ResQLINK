const BASE_URL = 'https://generativelanguage.googleapis.com';
const MODELS = [
  'v1beta/models/gemini-3.5-flash',
  'v1beta/models/gemini-3.5-flash-lite',
  'v1beta/models/gemini-3.0-flash',
  'v1beta/models/gemini-2.5-flash',
  'v1beta/models/gemini-2.5-flash-lite',
];
const SYSTEM_PROMPT = `You are ResQLink Assistant, a helpful general AI assistant for India. Answer ANY question - general knowledge, location, science, coding, history, movies, sports, etc. If it's about flood, cyclone, earthquake, fire, medical emergency, also give short practical steps and helpline numbers 112, 1070, 108. Keep reply under 120 words, simple language.`;

function isGreeting(message) {
  const t = message.toLowerCase().trim();
  return ['hi','hii','hiii','hello','hey','namaste','hi there','hello there'].includes(t);
}

function getGreetingReply(role) {
  const r = (role || '').toLowerCase();
  if (r.includes('hospital')) return 'Hello! I am Hospital Assistant. I can help with bed availability, medical reports, and injured patients. Try: "Show critical medical reports"';
  if (r.includes('shelter')) return 'Hello! I am Shelter Assistant. I can help with shelter capacity and nearby shelters. Try: "Show shelters with capacity"';
  if (r.includes('volunteer')) return 'Hello! I am Volunteer Assistant. I can help with nearby tasks and assignments. Try: "Show nearby volunteer tasks"';
  if (r.includes('eoc') || r.includes('emergency') || r.includes('operator') || r.includes('rescue')) return 'Hello! I am your EOC Assistant. I can help you find reports. Try: "Show all unverified flood reports" or "Critical incidents that are active".';
  return 'Hello! I am ResQLink Assistant. How can I help you today? I can answer any question.';
}

function getLocalAdvice(message) {
  const lower = message.toLowerCase();
  if (lower.includes('basir') || lower.includes('basrhat')) return 'Basirhat is located in North 24 Parganas district, West Bengal, near Ichamati river and Bangladesh border. It is a flood-prone area. For rescue, prioritize low-lying villages and contact EOC on 1070 / 112.';
  if (lower.includes('knife')) return 'Knife means a sharp cutting tool. In rescue, keep a safety knife in kit for cutting ropes / seatbelts, handle carefully and keep away from victims.';
  if (lower.includes('tiger')) return 'Tiger is a large wild cat, national animal of India, found in Sundarbans and other forests. Do not go near forest alone. If you see one, stay calm, do not run, and call 112.';
  if (lower.includes('water') || lower.includes('flood')) return 'Move to higher ground immediately. Do not cross flowing water. Keep your phone charged and call 112 or 1070 if trapped. Nearest shelter info is shown on map.';
  if (lower.includes('smoke') || lower.includes('fire')) return 'Leave the building immediately, stay low to avoid smoke. Do not use lift. Call 112 / 101 for fire service.';
  if (lower.includes('injur') || lower.includes('hurt') || lower.includes('blood')) return 'Stay calm. Stop bleeding with clean cloth pressure, keep the person still. Call 108 for ambulance and 112 for emergency.';
  if (isGreeting(message)) return 'Hi! I am ResQLink Assistant. Ask me anything - flood safety, location, general knowledge.';
  if (lower.includes('what') || lower.includes('who') || lower.includes('where') || lower.includes('how') || lower.includes('why')) return `You asked: "${message}". Gemini is currently unavailable due to quota. Please try again in some time or with a new API key. For emergency, call 112.`;
  return 'Stay calm and move to a safe place. If you are in danger, call 112 immediately. Tell me more: water, fire, or injury? I can also show reports — try "Show all unverified flood reports".';
}

function getSystemPrompt(role){
  return `You are ResQLink Assistant. Answer ANY random question generally, not only disaster questions. For disaster questions, give helplines 112, 1070, 108. Under 120 words.`;
}

async function callGemini(userMessage, role) {
  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) return null;
  const prompt = getSystemPrompt(role);
  for (const model of MODELS) {
    try {
      const url = `${BASE_URL}/${model}:generateContent?key=${KEY}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${prompt}\n\nUser: ${userMessage}` }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
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
    } catch (e) { console.log(`Model ${model} exception:`, e.message); }
  }
  return null;
}

async function generateCitizenAdvice(message) {
  if (isGreeting(message)) return getLocalAdvice(message);
  const ai = await callGemini(message);
  return ai || getLocalAdvice(message);
}

function parseEOCQuery(message) {
  if (isGreeting(message)) return { isGreeting: true, filter: {}, description: 'greeting' };
  const lower = message.toLowerCase();
  const filter = { status: { $nin: ['resolved', 'merged'] } };
  let description = message;
  if (lower.includes('unverified')) { filter.verification = { $ne: 'verified' }; description = 'unverified reports'; }
  if (lower.includes('flood')) filter.category = 'flood';
  if (lower.includes('fire')) filter.category = 'fire';
  if (lower.includes('earthquake')) filter.category = 'earthquake';
  if (lower.includes('medical')) filter.category = 'medical';
  if (lower.includes('critical')) { filter.severity = 'critical'; description = 'critical incidents that are active'; }
  if (lower.includes('resolved')) { delete filter.status; filter.status = 'resolved'; description = 'resolved reports'; }
  return { filter, description };
}

async function askGemini(message, user) {
  const role = user?.role || user?.userRole || '';
  if (isGreeting(message)) return getGreetingReply(role);
  const ai = await callGemini(message, role);
  return ai || getLocalAdvice(message);
}

async function getChatResponse(message, user) {
  const role = user?.role || user?.userRole || '';
  if (isGreeting(message)) return getGreetingReply(role);
  const ai = await callGemini(message, role);
  return ai || getLocalAdvice(message);
}

module.exports = { generateCitizenAdvice, parseEOCQuery, askGemini, getChatResponse, isGreeting, getGreetingReply };