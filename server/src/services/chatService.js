// -----------------------------------------------------------------------------
// chatService.js — REAL AI version with Gemini + fallback to rules
// -----------------------------------------------------------------------------

const CITIZEN_ADVICE_RULES = [
  {
    keywords: ['water', 'flood', 'flooding', 'drowning'],
    reply: 'Move to higher ground immediately. Avoid walking or driving through moving water — 15cm can knock you off your feet.',
  },
  {
    keywords: ['fire', 'smoke', 'burning'],
    reply: 'Evacuate immediately. Do not use elevators. Stay low if there is smoke, and cover your nose and mouth with a damp cloth.',
  },
  {
    keywords: ['earthquake', 'shaking', 'building collapse', 'collapsed', 'trapped'],
    reply: 'Take cover under sturdy furniture and stay away from windows. Do not use elevators. If trapped, tap on a pipe or wall to signal your location.',
  },
  {
    keywords: ['injured', 'bleeding', 'unconscious', 'medical', 'heart attack', 'labor', 'pregnant'],
    reply: 'Call for medical help immediately using the SOS button. Keep the person still, calm, and warm while help is on the way.',
  },
];

const DEFAULT_ADVICE =
  'Stay calm and follow official advisories. If you are in immediate danger, use the SOS button to alert emergency services now.';

async function generateCitizenAdvice(message) {
  const key = process.env.GEMINI_API_KEY;
  console.log('=== CHAT DEBUG === KEY EXISTS:', !!key);
  if (!key) return DEFAULT_ADVICE;

  const models = [
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.0-flash',
    'gemini-1.5-flash',
  ];

  for (const model of models) {
    for (const version of ['v1beta', 'v1']) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `You are ResQLINK Safety Assistant for India. Give short, calm safety advice in simple English, max 3 lines. Emergency numbers: 112, 100 Police, 101 Fire, 108 Ambulance. User says: ${message}` }] }],
            }),
          }
        );
        const data = await res.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          console.log('WORKING MODEL FOUND:', version, model);
          return reply;
        } else {
          console.log('FAIL:', version, model, res.status);
        }
      } catch (e) { console.log('ERR', model, e.message); }
    }
  }

  const text = (message || '').toLowerCase();
  const match = CITIZEN_ADVICE_RULES.find((rule) => rule.keywords.some((kw) => text.includes(kw)));
  return match ? match.reply : DEFAULT_ADVICE;
}

const CATEGORY_SYNONYMS = {
  flood: ['flood', 'water', 'flooding'],
  fire: ['fire', 'burning', 'blaze'],
  earthquake: ['earthquake', 'quake'],
  medical: ['medical', 'injury', 'injured'],
  structural: ['structural', 'collapse', 'collapsed', 'building'],
};

function parseEOCQuery(message) {
  const text = (message || '').toLowerCase();
  const filter = {};
  const descriptionParts = [];

  for (const severity of ['critical', 'high', 'medium', 'low']) {
    if (text.includes(severity)) {
      filter.severity = severity;
      descriptionParts.push(`${severity} severity`);
      break;
    }
  }

  for (const [category, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    if (synonyms.some((s) => text.includes(s))) {
      filter.category = category;
      descriptionParts.push(category);
      break;
    }
  }

  if (/\bunverified\b|\bnot verified\b|\bpending\b/.test(text)) {
    filter['verification.trustState'] = 'pending';
    descriptionParts.push('unverified');
  } else if (/\bsuspicious\b|\bfake\b/.test(text)) {
    filter['verification.trustState'] = 'suspicious';
    descriptionParts.push('suspicious');
  } else if (/\bhighly trusted\b/.test(text)) {
    filter['verification.trustState'] = 'highly_trusted';
    descriptionParts.push('highly trusted');
  } else if (/\bverified\b|\bconfirmed\b/.test(text)) {
    filter['verification.trustState'] = { $in: ['verified', 'highly_trusted'] };
    descriptionParts.push('verified');
  }

  if (/\bresolved\b/.test(text)) {
    filter.status = 'resolved';
    descriptionParts.push('resolved');
  } else if (/\brejected\b|\bfake reports?\b/.test(text)) {
    filter.status = 'rejected';
    descriptionParts.push('rejected');
  } else if (/\bactive\b|\bopen\b|\bongoing\b/.test(text)) {
    filter.status = { $nin: ['resolved', 'rejected', 'merged'] };
    descriptionParts.push('active');
  } else if (/\bescalated\b/.test(text)) {
    filter.escalated = true;
    descriptionParts.push('escalated');
  }

  const description = descriptionParts.length ? descriptionParts.join(', ') : 'all incidents';
  return { filter, description };
}

module.exports = { generateCitizenAdvice, parseEOCQuery };