# Ping — Backend

Two independent Express services that talk only over HTTP.

```
backend/
├── crm-api/            :4000  the brain — data, AI, campaigns, analytics
└── channel-service/    :4100  the vendor — async delivery simulation
```

## crm-api

| Route | What it does |
|---|---|
| `GET  /health` | Liveness + which AI provider is active |
| `GET  /api/customers` | Paginated, searchable customer table |
| `GET  /api/dashboard` | Real metrics computed from the data |
| `POST /api/segments/preview` | `{goal}` → AI/rule filter → validated → count + sample |
| `POST /api/campaigns/draft-message` | AI-drafted copy with `{name}` token |
| `POST /api/campaigns` | Create a draft campaign |
| `POST /api/campaigns/:id/send` | Create `Communication` rows, batch to channel service |
| `GET  /api/campaigns` / `GET /api/campaigns/:id` | List/detail with live funnel stats |
| `POST /api/campaigns/:id/insights` | AI analyst over the real stats |
| `POST /api/receipts` | **Idempotent, out-of-order-safe** callback sink |

### Data model (Mongoose)

- **Customer** — profile + denormalised `orderCount` / `totalSpend` / `lastOrderAt`, so segment queries are a single indexed `find` instead of a per-request join.
- **Order** — keeps the full timestamp (hour included) to power time-of-day insights.
- **Campaign** — goal, validated `filterJson`, channel, message, status (`draft → sending → sent`), cached insights.
- **Communication** — one row per (campaign × recipient); `status` + `appliedEvents` (the idempotency ledger).

Campaign stats are aggregated from `Communication` rows — no separate stats table.

### The receipts contract (read `src/routes/receipts.js`)

1. **Idempotency** — atomic `findOneAndUpdate` with `appliedEvents: { $ne: eventType }` + `$addToSet`. A duplicate matches nothing and is ACKed without side effects.
2. **Out-of-order safety** — the status write matches only if the current status ranks *below* the incoming event, in a single conditional `updateOne`. No regression, no races.

### Env (`.env.example`)

`MONGODB_URI`, `PORT`, `CHANNEL_SERVICE_URL`, `CRM_PUBLIC_URL`, and optionally `ANTHROPIC_API_KEY` *or* `OPENAI_API_KEY`. Without a key, deterministic fallbacks keep the whole loop working.

### Run

```bash
npm install
npm run seed   # 1,500 customers / ~8,000 orders, deterministic PRNG
npm run dev
```

## channel-service

A deliberately hostile vendor simulator:

- `POST /send` → validates, **returns 202 immediately**, processes in the background
- Simulates `sent → delivered → opened → read → clicked → converted` (or `failed`) with per-channel probabilities (WhatsApp opens better than Email, Email fails more, etc.)
- Callbacks are **staggered** over seconds, **~10% out of order**, **~6% duplicated**, and **retried with exponential backoff** on 5xx/network failure
- Knows nothing about the CRM beyond the `callbackUrl` it is handed

At scale: replace timers with a broker (Kafka/SQS) + worker consumers. Same shape, smaller scale.

```bash
npm install
npm run dev
```
