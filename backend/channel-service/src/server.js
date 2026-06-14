// PING CHANNEL SERVICE
// A standalone delivery vendor simulator. Completely independent of the CRM:
// it knows nothing about customers or campaigns, only batches of messages and
// a callback URL.
//
// Contract:
//   POST /send { campaignId, callbackUrl, messages: [{communicationId, recipient, channel, message}] }
//     -> 202 Accepted immediately; processing continues in the background.
//
// For every accepted message it simulates a realistic lifecycle
//   sent -> delivered -> opened -> read -> clicked -> converted   (or failed)
// with channel-specific probabilities, then POSTs each event to callbackUrl:
//   { communicationId, eventType, eventId, occurredAt, reason? }
//
// Deliberately hostile delivery semantics (this is the point of the demo):
//   - STAGGERED   events fire over seconds, not instantly
//   - OUT OF ORDER ~10% of events get a shuffled delay so a later lifecycle
//                 stage can arrive before an earlier one
//   - DUPLICATES  ~6% of events are sent twice (at-least-once delivery)
//   - RETRIES     failed callback POSTs retry with exponential backoff
//
// At real volume this would be a broker (Kafka/SQS) with worker consumers;
// an in-process queue + timers models the same async, at-least-once,
// idempotent-consumer pattern at demo scale.

import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "node:crypto";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 4100;

// Per-channel lifecycle probabilities
const CHANNEL_PROFILE = {
  WhatsApp: { fail: 0.05, open: 0.7, read: 0.85, click: 0.3, convert: 0.25 },
  SMS:      { fail: 0.08, open: 0.45, read: 0.9, click: 0.15, convert: 0.2 },
  Email:    { fail: 0.1, open: 0.35, read: 0.8, click: 0.2, convert: 0.15 }
};

const FAILURE_REASONS = [
  "Recipient unreachable",
  "Invalid number/address",
  "Provider timeout",
  "Carrier rejected message"
];

const rand = Math.random;
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

// ---------------------------------------------------------------------------
// Callback dispatcher with retry + backoff
// ---------------------------------------------------------------------------
async function postReceipt(callbackUrl, event, attempt = 1) {
  const MAX_ATTEMPTS = 4;
  try {
    const res = await fetch(callbackUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event)
    });
    if (!res.ok && res.status >= 500) throw new Error(`CRM responded ${res.status}`);
    // 2xx and 4xx are both final: 4xx means the event itself is bad, retrying won't fix it.
  } catch (err) {
    if (attempt >= MAX_ATTEMPTS) {
      console.error(`[channel] receipt ${event.eventType}/${event.communicationId} dropped after ${attempt} attempts: ${err.message}`);
      return;
    }
    const backoff = 500 * 2 ** (attempt - 1) + randInt(0, 250); // 0.5s, 1s, 2s + jitter
    setTimeout(() => postReceipt(callbackUrl, event, attempt + 1), backoff);
  }
}

function scheduleReceipt(callbackUrl, communicationId, eventType, delayMs, reason) {
  // ~10% of events get extra random jitter big enough to leapfrog the next
  // lifecycle stage -> genuine out-of-order arrivals at the CRM.
  const jitter = rand() < 0.1 ? randInt(1500, 4000) : 0;

  setTimeout(() => {
    const event = {
      communicationId,
      eventType,
      eventId: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      ...(reason ? { reason } : {})
    };
    postReceipt(callbackUrl, event);

    // ~6% duplicates: same logical event fired again shortly after,
    // with a different eventId - exactly what real webhook providers do.
    if (rand() < 0.06) {
      setTimeout(() => postReceipt(callbackUrl, { ...event }), randInt(300, 2000));
    }
  }, delayMs + jitter);
}

// ---------------------------------------------------------------------------
// Lifecycle simulation for one message
// ---------------------------------------------------------------------------
function simulateLifecycle(callbackUrl, msg) {
  const profile = CHANNEL_PROFILE[msg.channel] || CHANNEL_PROFILE.WhatsApp;
  let t = randInt(200, 1500); // provider accepts the message

  scheduleReceipt(callbackUrl, msg.communicationId, "sent", t);

  if (rand() < profile.fail) {
    t += randInt(500, 3000);
    scheduleReceipt(callbackUrl, msg.communicationId, "failed", t, FAILURE_REASONS[randInt(0, FAILURE_REASONS.length - 1)]);
    return;
  }

  t += randInt(800, 4000);
  scheduleReceipt(callbackUrl, msg.communicationId, "delivered", t);

  if (rand() >= profile.open) return;
  t += randInt(2000, 9000);
  scheduleReceipt(callbackUrl, msg.communicationId, "opened", t);

  if (rand() >= profile.read) return;
  t += randInt(1000, 5000);
  scheduleReceipt(callbackUrl, msg.communicationId, "read", t);

  if (rand() >= profile.click) return;
  t += randInt(1500, 7000);
  scheduleReceipt(callbackUrl, msg.communicationId, "clicked", t);

  if (rand() >= profile.convert) return;
  t += randInt(3000, 12000);
  scheduleReceipt(callbackUrl, msg.communicationId, "converted", t);
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => res.json({ ok: true, service: "channel-service" }));

app.post("/send", (req, res) => {
  const { campaignId, callbackUrl, messages } = req.body || {};

  if (!callbackUrl || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "callbackUrl and a non-empty messages array are required" });
  }
  const invalid = messages.find((m) => !m.communicationId || !m.recipient || !m.channel || !m.message);
  if (invalid) {
    return res.status(400).json({ error: "Every message needs communicationId, recipient, channel, message" });
  }

  // ACK immediately - this is the async contract. Processing happens after.
  res.status(202).json({ accepted: messages.length, campaignId: campaignId || null });

  console.log(`[channel] accepted batch of ${messages.length} (campaign ${campaignId}) -> callbacks to ${callbackUrl}`);

  // Stagger batch processing so a big send visibly "drains" over time
  messages.forEach((msg, i) => {
    setTimeout(() => simulateLifecycle(callbackUrl, msg), Math.floor(i / 25) * 400 + randInt(0, 300));
  });
});

app.listen(PORT, () => console.log(`[channel-service] listening on :${PORT}`));
