# Ping — Frontend

React + Vite + Tailwind. Royal blue `#2541CC` / purple `#7C3AED` / white, no emojis in the product UI.

## Screens

1. **Login** — mocked by design ("Sarah · Marketing Manager · Saffron Cafe")
2. **Dashboard** — customers, orders, campaigns, revenue influenced (all computed from real data)
3. **Campaign builder** — the hero: plain-English goal → audience count + sample → AI-drafted message → channel → launch
4. **Campaigns** — list with live delivered/converted counts
5. **Campaign detail** — funnel (Sent → Delivered → Opened → Clicked → Converted, recharts) that fills live via polling, plus the AI insights panel

## Live updates

Campaign detail polls every 2s while receipts are still landing, then backs off to 10s once the funnel stops moving (~16s unchanged). The green "Receipts streaming in" pulse shows while live.

## Run

```bash
cp .env.example .env    # VITE_API_URL, default http://localhost:4000
npm install
npm run dev             # http://localhost:5173
```

## Build

```bash
npm run build           # outputs to dist/, deploy anywhere static (Vercel)
```
