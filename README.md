# Ping — Reach the right people

An AI campaign copilot for **Saffron Cafe**. A marketer states a goal in plain English; Ping builds the audience, drafts the message, sends it through a separate channel service, and explains what happened.

> **The one committed bet:** one hero loop, done well —
> Goal in plain English → AI builds the audience → AI drafts the message → send through the channel service → async callbacks flow back → analytics update live → AI explains the result.

## What's in this repo

```
ping/
├── frontend/                  React + Vite + Tailwind app
└── backend/
    ├── crm-api/               Express + MongoDB (Mongoose) — customers, AI, campaigns, receipts, analytics
    └── channel-service/       Express — standalone delivery vendor simulator (async callbacks)
```

The CRM API and the channel service are **two separate processes that only talk over HTTP** — that's the system-design centrepiece.

## Architecture

```
            ┌─────────────────────────┐
            │   FRONTEND (React)      │  :5173
            └────────────┬────────────┘
                         │ REST
                         ▼
   ┌─────────────────────────────────────────┐
   │   CRM API  (Express + Mongoose)  :4000  │
   │   - customers / orders                  │
   │   - AI audience builder (NL -> filter)  │
   │   - campaigns + analytics + insights    │
   │   - POST /send  -> channel service      │
   │   - POST /api/receipts <- callbacks     │
   └──────┬──────────────────────▲───────────┘
          │ POST /send            │ POST /api/receipts
          │ (batch, 202 ACK)      │ (staggered, out-of-order, dupes)
          ▼                       │
   ┌─────────────────────────────────────────┐
   │   CHANNEL SERVICE (Express)      :4100  │
   │   - ACKs immediately, processes async   │
   │   - simulates delivered/opened/read/    │
   │     clicked/converted/failed lifecycle  │
   │   - retries callbacks with backoff      │
   └─────────────────────────────────────────┘
                         │
                         ▼
                  MongoDB  (ping db)
```

## Prerequisites

- Node.js 18+ (uses native `fetch`)
- MongoDB running locally (`mongodb://localhost:27017`) **or** a MongoDB Atlas connection string

## Quickstart (4 terminals, ~3 minutes)

**1. CRM API**
```bash
cd backend/crm-api
cp .env.example .env        # edit MONGODB_URI if not using localhost; add AI key if you have one
npm install
npm run seed                # 1,500 Saffron Cafe customers + ~8,000 orders
npm run dev                 # http://localhost:4000
```

**2. Channel service**
```bash
cd backend/channel-service
cp .env.example .env
npm install
npm run dev                 # http://localhost:4100
```

**3. Frontend**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

**4. Use it**
1. Open http://localhost:5173 → Sign in (mock auth).
2. New campaign → type: *"biryani buyers who ordered twice but haven't this week"*.
3. Build audience → Draft the message → Launch.
4. Watch the funnel fill **live** as the channel service streams receipts back.
5. Generate insights — the AI analyst explains the numbers and recommends a next move.

## AI configuration (optional but recommended)

In `backend/crm-api/.env`, set **one** of:

```
ANTHROPIC_API_KEY=sk-ant-...
# or
OPENAI_API_KEY=sk-...
```

| | With a key | Without a key |
|---|---|---|
| NL → audience filter | LLM emits JSON, validated with **zod** | Deterministic rule-based parser |
| Message drafting | LLM, channel-length aware, `{name}` token enforced | Channel-specific templates |
| Campaign insights | LLM analyst over the real stats | Heuristic analysis over the real stats |

Every AI call returns **structured, schema-validated output with a safe fallback** — the model only ever emits JSON; the backend validates it and runs the query itself. The model never touches the database.

## The async channel loop (graded hardest, built hardest)

- **202-and-process-later** — the channel service ACKs the batch immediately, then simulates each message's lifecycle on timers.
- **At-least-once delivery** — ~6% of callbacks are deliberately duplicated; ~10% arrive out of order; callback POSTs retry with exponential backoff.
- **Idempotency** (CRM side) — an atomic `$addToSet` gate on `(communicationId, eventType)`; duplicates are acknowledged and ignored.
- **Out-of-order safety** (CRM side) — status only moves forward through a rank (`queued → sent → delivered → opened → read → clicked → converted`); a late `delivered` can never regress a `clicked`. `failed` is terminal and only applies during the send phase.

> At real volume this would be a broker (Kafka/SQS) with worker consumers. The in-process queue + timers model the same async, at-least-once, idempotent-consumer pattern — same shape, smaller scale.

## Conscious tradeoffs (deliberately cut)

- Campaign forecasting (indefensible fake numbers)
- Multi-industry configuration (committed to one brand: Saffron Cafe)
- Recommendation centre, generic bolted-on chatbot
- Real authentication (mocked by design)
- Scheduling / send-time optimisation

## Deploying

- **Frontend** → Vercel (set `VITE_API_URL` to the deployed CRM API URL)
- **CRM API + channel service** → Render (two services from `backend/`; set `CHANNEL_SERVICE_URL`, `CRM_PUBLIC_URL`, `MONGODB_URI`)
- **Database** → MongoDB Atlas free tier

Per-service READMEs live in `backend/` and `frontend/`.
