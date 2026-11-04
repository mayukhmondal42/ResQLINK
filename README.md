# ResQLINK

An AI-assisted emergency operations platform connecting citizens, an emergency
operations center (EOC), and rescue teams on one real-time map — built on the
**MERN stack** (MongoDB, Express, React, Node.js).

This is a deliberately **scoped-down** version of a much larger original spec
(see `docs/original-specs/` for the full vision). Rather than half-build eight
portals and a dozen features, this delivers three roles and a focused feature
set completely, so it's honest, demoable, and defensible in an interview.
The "Roadmap / What I'd Build Next" section below lists what was cut and why —
that's a feature for an interview, not a gap, because it shows you understand
scope and tradeoffs.


## What it actually does

- **JWT auth with refresh tokens**, role-based access control (citizen, EOC, rescue team, hospital, shelter)
- **Citizens** submit SOS alerts / incident reports on a live Leaflet map (OpenStreetMap, no API key needed)
- Every report is run through an **AI triage service** (Google Gemini free tier, JSON-structured output) that suggests severity, category, and needed resources — with an **offline rule-based fallback** so the app is 100% demoable with zero external accounts
- A lightweight **duplicate-detection service** (geo-proximity + Jaccard text similarity — no paid vector DB) auto-merges near-identical reports from the same area
- **Socket.IO** pushes every new report, status change, and facility update to every open dashboard in real time — no polling
- The **EOC dashboard** shows a live operational map, an AI-generated situation summary, and one-click status advancement (reported → acknowledged → dispatched → in progress → resolved)
- The **Rescue team console** shows assigned jobs plus unassigned high-priority incidents to self-assign
- **Hospital and Shelter portals** let facility staff self-register their facility and push live bed/occupancy capacity updates, broadcast instantly to every dashboard's map
- **Multi-layer fake-report defense**: every incident gets a 0-100 trust score combining GPS consistency (30%), crowd confirm/dispute votes (25%), authority sign-off (25%), and AI text-confidence (20%) — states are Pending / Suspicious / Verified / Highly Trusted, fully interactive (anyone can vote, EOC/rescue can verify or reject) and not gated behind demo mode
- **Organization verification documents**: hospital/shelter/rescue/NGO/volunteer accounts upload an ID/registration image at signup (stored as-is, no paid file storage needed); EOC reviews and approves/rejects it from the dashboard — a stand-in for the government-official check a real deployment would need
- **Smart calamity map**: each incident renders as a category-specific icon (🌊 flood, 🔥 fire, 🚑 medical, etc.) colored by risk level (green/yellow/orange/red), critical incidents pulse, and resolved/rejected incidents fade to grey — live over Socket.IO the instant status changes
- **EOC broadcast alerts**: a "high risk notification" bar the EOC can push to every connected dashboard's top bar instantly, plus retract when the risk passes
- **Emergency contact directory**: EOC dashboard lists every hospital/shelter/rescue team/NGO with phone number and live facility capacity, in one place
- **AI incident summaries, kept short on purpose**: instead of reproducing the citizen's paragraph, every report gets a terse 1-2 sentence briefing — e.g. a report about "40 people trapped after a dam overflow" becomes *"Flood reported. Approximately 40 people affected. Immediate evacuation recommended."* — extracting the affected-person count when mentioned and picking an action phrase from severity, so EOC staff triaging a long queue get the headline, not the essay
- **AI resource recommendation checklist**: every incident gets a dispatch checklist (e.g. ✓ 3 Ambulances, ✓ 2 Rescue boats, ✓ Police unit, ✓ Temporary shelter — Estimated response: 15 minutes) shown on every incident card. This is **deliberately a deterministic rule table, not an LLM guess** — see the "Architecture notes" section for why that's a safety decision
- **Bottom-right assistant chatbot**, role-aware from one shared endpoint: citizens get instant safety guidance ("Water is entering my house" → move-to-higher-ground advice + nearest shelter with live distance) while EOC gets natural-language incident search ("Show all unverified flood reports" → parsed into a live filtered list, clickable straight into the dashboard)
- A **seed script** builds a reproducible "Mumbai Flood" demo scenario (5 accounts, 4 facilities, 5 incidents with varied trust states — including one caught and rejected as unreliable) so you can demo instantly

## Tech stack

| Layer      | Choice                                                                 |
|------------|-------------------------------------------------------------------------|
| Frontend   | React 18 + Vite, Tailwind CSS, React Router, TanStack Query, react-leaflet |
| Backend    | Node.js + Express                                                      |
| Database   | MongoDB (Atlas free tier), Mongoose ODM, 2dsphere geo indexes           |
| Auth       | JWT access tokens (in-memory) + httpOnly refresh-token cookie          |
| Realtime   | Socket.IO                                                               |
| Maps       | OpenStreetMap tiles + Leaflet (free, no key)                            |
| AI         | Google Gemini free tier, with an offline mock fallback                  |
| Deployment | Vercel (frontend), Render/Railway (backend), MongoDB Atlas (DB)         |

---

## Project structure

```
ResQLINK/
├── server/
│   ├── src/
│   │   ├── config/db.js            # Mongo connection (fails soft, not hard)
│   │   ├── models/                 # User, Incident, Facility (Mongoose schemas)
│   │   ├── middleware/             # auth (JWT), error handler
│   │   ├── controllers/            # business logic per resource
│   │   ├── routes/                 # Express routers
│   │   ├── services/                # aiService, duplicateService, socketService
│   │   ├── seed/demoSeed.js         # Mumbai Flood demo data
│   │   └── server.js                # app entry point
│   ├── package.json
│   └── .env.example
└── client/
    ├── src/
    │   ├── api/axiosClient.js       # axios instance + silent token refresh
    │   ├── context/                 # AuthContext, SocketContext
    │   ├── components/               # Navbar, IncidentMap, IncidentCard, SeverityBadge, ProtectedRoute
    │   ├── pages/                    # Landing, Login, Register, 3 dashboards, ReportIncident
    │   └── App.jsx / main.jsx
    ├── package.json
    └── .env.example
```

---

## Running it with Docker (recommended if you have Docker installed)

This spins up MongoDB, the backend, and the frontend together — no MongoDB
Atlas account needed for local development.

```bash
cd ResQLINK
cp server/.env.example server/.env
```

Edit `server/.env` and set `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (generate
with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
— you'll need Node installed just for this one command, or use any online
random-hex generator). Leave `MONGO_URI` as-is; docker-compose overrides it
automatically to point at the local Mongo container. Leave `GEMINI_API_KEY`
blank to use the offline mock AI.

```bash
docker compose up --build
```

First run takes a minute or two (pulling the Mongo image, installing npm
packages). Once it's up, seed the demo data:

```bash
docker compose exec server npm run seed
```

Then open **http://localhost:5173**. The server runs at **http://localhost:5000**,
MongoDB at **localhost:27017** (reachable with MongoDB Compass if you want to
browse the data visually).

Useful commands:

```bash
docker compose down              # stop everything
docker compose down -v           # stop and wipe the Mongo data volume too
docker compose logs -f server   # tail server logs
docker compose up --build        # rebuild after changing package.json or Dockerfiles
```

Editing files under `server/src` or `client/src` on your host reflects
into the running containers automatically (both dev servers have hot
reload). If you only change dependencies (`package.json`), re-run with `--build`.

> The client/server Dockerfiles here are dev-mode (hot reload). For a
> production-style container build, see `client/Dockerfile.prod` (a
> multi-stage build that serves the compiled static app via nginx) — not
> wired into `docker-compose.yml` by default since Vercel/Render remain the
> simpler path to a live deployed URL for a portfolio project.

---

## Running it without Docker (manual setup)

### 1. server

```bash
cd server
cp .env.example .env
npm install
```

Edit `.env`:
- **Fastest path (no external accounts):** leave `MONGO_URI` and `GEMINI_API_KEY`
  blank and `DEMO_MODE=true`. The API will boot, but you'll need a real
  `MONGO_URI` for any request that touches the database (a free MongoDB
  Atlas cluster takes about 5 minutes to set up: https://www.mongodb.com/atlas).
- Generate JWT secrets quickly:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

Once `MONGO_URI` is set:

```bash
npm run seed   # populates the Mumbai Flood demo scenario
npm run dev    # starts the API on http://localhost:5000
```


### 2. client

```bash
cd client
cp .env.example .env
npm install
npm run dev    # starts on http://localhost:5173
```

Open http://localhost:5173, click a demo role button on the login page to
autofill credentials, and sign in.

---

## Skills this project demonstrates

Full MERN CRUD · JWT auth with refresh-token rotation · role-based
authorization middleware · MongoDB geospatial queries (`2dsphere`, `$near`) ·
real-time architecture with Socket.IO · external API integration with a
graceful degradation strategy · a from-scratch similarity algorithm · a
multi-signal weighted trust/verification system · file-to-base64 handling
without a storage service · React Query for server-state caching · protected
routing · responsive Tailwind UI.
