// AI integration layer.
//
// Three jobs, all returning STRUCTURED, schema-validated output:
//   1. buildFilter(goal)        -> segment filter JSON
//   2. draftMessage(...)        -> campaign copy with {name} token
//   3. generateInsights(stats)  -> { reasons: [...], recommendation }
//
// Provider: Anthropic (preferred) or OpenAI, picked by which API key is set.
// If neither key is set, or if a call/validation fails, every function falls
// back to a deterministic rule-based implementation so the product keeps
// working end-to-end. The model NEVER touches the database - it only emits
// JSON that the backend validates and runs itself.

import { validateFilter, describeFilter } from "../utils/segmentFilter.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function provider() {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

export function aiStatus() {
  const p = provider();
  return { provider: p, enabled: p !== "none" };
}

/** Low-level: ask the LLM for a single completion, return raw text. */
async function complete({ system, user, maxTokens = 800 }) {
  const p = provider();
  if (p === "anthropic") {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }]
      })
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }
  if (p === "openai") {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });
    if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }
  throw new Error("No AI provider configured");
}

function extractJson(text) {
  // Strip markdown fences and grab the first {...} block.
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// ---------------------------------------------------------------------------
// 1. Natural-language audience builder
// ---------------------------------------------------------------------------

const FILTER_SYSTEM_PROMPT = `You translate a marketer's plain-English audience description into a JSON filter for a cafe CRM. Output ONLY a valid JSON object, no prose, no markdown.

Allowed keys (all optional, use only what the request implies):
  favItem          string  - a menu item, e.g. "Biryani"
  city             string  - a city name
  tags             array of strings, from: vip, lunch-buyer, weekend-regular, new, dormant
  minOrders        integer - minimum lifetime order count
  maxOrders        integer - maximum lifetime order count
  minTotalSpend    number  - minimum lifetime spend in rupees
  maxTotalSpend    number  - maximum lifetime spend in rupees
  lastOrderBefore  "YYYY-MM-DD" - last order strictly before this date (use for "haven't ordered since/this week/recently")
  lastOrderAfter   "YYYY-MM-DD" - last order on/after this date (use for "ordered recently/this month")
  joinedBefore     "YYYY-MM-DD"
  joinedAfter      "YYYY-MM-DD"

Today's date is {{TODAY}}. Resolve relative dates ("this week", "last month") against it.
"twice" means minOrders 2. "haven't ordered this week" means lastOrderBefore = start of this week.
Example input: "biryani buyers who ordered twice but haven't this week"
Example output: {"favItem":"Biryani","minOrders":2,"lastOrderBefore":"2026-06-08"}`;

export async function buildFilter(goal) {
  if (provider() !== "none") {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = await complete({
        system: FILTER_SYSTEM_PROMPT.replace("{{TODAY}}", today),
        user: goal,
        maxTokens: 400
      });
      const filter = validateFilter(extractJson(raw));
      return { filter, source: "ai" };
    } catch (err) {
      console.warn("[ai] buildFilter fell back to rules:", err.message);
    }
  }
  return { filter: ruleBasedFilter(goal), source: "rules" };
}

/** Deterministic fallback parser - covers the common phrasings. */
export function ruleBasedFilter(goal) {
  const g = goal.toLowerCase();
  const filter = {};

  const items = ["biryani", "paneer tikka", "butter chicken", "masala chai", "filter coffee", "veg thali", "mutton rolls", "gulab jamun"];
  for (const item of items) {
    if (g.includes(item)) {
      filter.favItem = item.replace(/\b\w/g, (c) => c.toUpperCase());
      break;
    }
  }

  const cities = ["chennai", "bengaluru", "bangalore", "mumbai", "delhi", "hyderabad", "pune"];
  for (const c of cities) {
    if (g.includes(c)) {
      filter.city = c === "bangalore" ? "Bengaluru" : c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  const tags = [];
  if (/\bvips?\b/.test(g)) tags.push("vip");
  if (g.includes("lunch")) tags.push("lunch-buyer");
  if (g.includes("weekend")) tags.push("weekend-regular");
  if (/\bnew\b/.test(g)) tags.push("new");
  if (g.includes("dormant") || g.includes("inactive") || g.includes("lapsed")) tags.push("dormant");
  if (tags.length) filter.tags = tags;

  if (g.includes("twice") || g.includes("two times") || g.includes("2 times")) filter.minOrders = 2;
  const atLeast = g.match(/at least (\d+)\s*(orders|times)/);
  if (atLeast) filter.minOrders = parseInt(atLeast[1], 10);
  const moreThan = g.match(/(?:more than|over)\s*(\d+)\s*(orders|times)/);
  if (moreThan) filter.minOrders = parseInt(moreThan[1], 10) + 1;

  const spendOver = g.match(/spent (?:over|more than|above)\s*(?:₹|rs\.?\s*)?(\d+)/);
  if (spendOver) filter.minTotalSpend = parseInt(spendOver[1], 10);

  const now = new Date();
  if (/(haven't|havent|have not|no order|not ordered).*(this week|in a week)/.test(g) || /this week/.test(g) && /haven|not/.test(g)) {
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    filter.lastOrderBefore = monday.toISOString().slice(0, 10);
  } else if (/(haven't|havent|have not|no order|not ordered).*(this month|in a month|30 days)/.test(g)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    filter.lastOrderBefore = d.toISOString().slice(0, 10);
  } else if (/(haven't|havent|have not|no order|not ordered|inactive|lapsed)/.test(g)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 14);
    filter.lastOrderBefore = d.toISOString().slice(0, 10);
  }
  if (/ordered (this|in the last) month|recent(ly)? (buyers|customers)/.test(g) && !filter.lastOrderBefore) {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    filter.lastOrderAfter = d.toISOString().slice(0, 10);
  }

  return validateFilter(filter);
}

// ---------------------------------------------------------------------------
// 2. Campaign message drafting
// ---------------------------------------------------------------------------

const CHANNEL_LIMITS = { SMS: 160, WhatsApp: 320, Email: 600 };

export async function draftMessage({ goal, filter, channel }) {
  const audience = describeFilter(filter);
  if (provider() !== "none") {
    try {
      const raw = await complete({
        system: `You write marketing copy for Saffron Cafe, a warm modern Indian cafe. Output ONLY a JSON object: {"message": "..."}.
Rules: friendly but not pushy; include the literal token {name} exactly once as the personalisation placeholder; no emojis; fit the channel (${channel}, max ${CHANNEL_LIMITS[channel] || 320} characters); end with a clear call to action.`,
        user: `Campaign goal: ${goal}\nAudience: ${audience}\nChannel: ${channel}`,
        maxTokens: 300
      });
      const { message } = extractJson(raw);
      if (typeof message === "string" && message.includes("{name}")) {
        return { message: message.trim(), source: "ai" };
      }
      throw new Error("Message missing {name} token");
    } catch (err) {
      console.warn("[ai] draftMessage fell back to template:", err.message);
    }
  }
  return { message: templateMessage({ goal, filter, channel }), source: "template" };
}

function templateMessage({ filter, channel }) {
  const item = filter.favItem || "your Saffron Cafe favourites";
  const offers = {
    WhatsApp: `Hi {name}, we miss you at Saffron Cafe. Your favourite ${item} is calling - enjoy 15% off your next order this week. Reply YES and we will hold a table for you.`,
    SMS: `Hi {name}, 15% off ${item} at Saffron Cafe this week. Show this message to redeem.`,
    Email: `Hi {name},\n\nIt has been a little while since your last visit to Saffron Cafe, and the ${item} has not been the same without you. This week only, enjoy 15% off your next order - dine in or take away.\n\nBook your table or order online today.\n\nWarm regards,\nTeam Saffron Cafe`
  };
  return offers[channel] || offers.WhatsApp;
}

// ---------------------------------------------------------------------------
// 3. AI insights - the analyst
// ---------------------------------------------------------------------------

export async function generateInsights({ campaign, stats }) {
  if (provider() !== "none") {
    try {
      const raw = await complete({
        system: `You are a marketing analyst for Saffron Cafe. Given campaign stats, output ONLY a JSON object:
{"reasons": ["...", "..."], "recommendation": "..."}
2-3 short, specific reasons the campaign performed the way it did (use the actual numbers and rates), then ONE concrete next move. No emojis, no prose outside the JSON.`,
        user: JSON.stringify({ goal: campaign.goal, channel: campaign.channel, audienceSize: campaign.audienceSize, audience: campaign.audienceDescription, stats }),
        maxTokens: 500
      });
      const parsed = extractJson(raw);
      if (Array.isArray(parsed.reasons) && typeof parsed.recommendation === "string") {
        return { ...parsed, source: "ai" };
      }
      throw new Error("Insights shape invalid");
    } catch (err) {
      console.warn("[ai] generateInsights fell back to heuristics:", err.message);
    }
  }
  return heuristicInsights({ campaign, stats });
}

function pct(part, whole) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

function heuristicInsights({ campaign, stats }) {
  const reasons = [];
  const deliveryRate = pct(stats.delivered, stats.sentTotal);
  const openRate = pct(stats.opened, stats.delivered);
  const clickRate = pct(stats.clicked, stats.opened);
  const convRate = pct(stats.converted, stats.sentTotal);

  reasons.push(
    deliveryRate >= 90
      ? `Delivery was healthy at ${deliveryRate}% - the contact data for this segment is in good shape.`
      : `${stats.failed} messages (${pct(stats.failed, stats.sentTotal)}%) failed to deliver, which capped the reachable audience from the start.`
  );
  reasons.push(
    openRate >= 50
      ? `An open rate of ${openRate}% suggests the audience match was strong - this segment recognises and engages with Saffron Cafe on ${campaign.channel}.`
      : `Open rate landed at ${openRate}% on ${campaign.channel}; the segment may be right but the channel or send timing is leaving attention on the table.`
  );
  if (stats.clicked > 0) {
    reasons.push(`${clickRate}% of openers clicked through, converting ${convRate}% of the full audience - the offer resonated with the most engaged slice.`);
  }

  const recommendation =
    convRate >= 5
      ? `Clone this campaign for the nearest lookalike segment (same favourite item, adjacent city) while the creative is proven.`
      : openRate < 50
        ? `Re-send to non-openers in 48 hours with a sharper first line, or test ${campaign.channel === "Email" ? "WhatsApp" : "Email"} for this segment.`
        : `Sweeten the call to action (e.g. a time-boxed 20% offer) for openers who did not click, since attention was won but the offer did not close.`;

  return { reasons, recommendation, source: "heuristics" };
}

// ---------------------------------------------------------------------------
// 4. Send-time suggester (playbook-based + audience order history)
// ---------------------------------------------------------------------------

const PLAYBOOK = [
  { type: "breakfast",   label: "Breakfast / morning coffee", days: [1,2,3,4,5], hour: 8,  minute: 0,  channels: ["WhatsApp","Email"], reason: "Catches the morning commute decision window (7:30–8:30 AM)." },
  { type: "lunch",       label: "Lunch offer",                days: [1,2,3,4,5], hour: 11, minute: 0,  channels: ["WhatsApp","SMS","Email"], reason: "Send just before the 11 AM–1 PM lunch window when ~60% of users prefer food messages." },
  { type: "snack",       label: "Afternoon snack / tea-time", days: [0,1,2,3,4,5,6], hour: 15, minute: 30, channels: ["WhatsApp","Email"], reason: "Bridges the lunch-to-dinner gap; taps into tea and snack cravings." },
  { type: "dinner",      label: "Dinner offer",               days: [2,3,4,5,6,0], hour: 17, minute: 30, channels: ["WhatsApp","SMS","Email"], reason: "Decision forms around 5:45 PM ahead of India's 6–10 PM dinner peak." },
  { type: "weekend",     label: "Friday / weekend night",     days: [4,5],        hour: 17, minute: 30, channels: ["Email","WhatsApp"], reason: "Friday and Saturday are prime for dinner rushes." },
  { type: "brunch",      label: "Weekend brunch",             days: [0,6],        hour: 9,  minute: 30, channels: ["WhatsApp","Email"], reason: "Reaches the leisurely weekend brunch crowd a little before it begins." },
  { type: "winback",     label: "Win-back / lapsed",          days: [2,3,4],      hour: 11, minute: 0,  channels: ["WhatsApp","Email"], reason: "Re-engage at a meal-decision moment; pair with a clear incentive." },
  { type: "vip",         label: "VIP / loyalty reward",       days: [2,3,4],      hour: 11, minute: 0,  channels: ["WhatsApp","Email"], reason: "A personal note lands best when people are relaxed, not during the peak rush." },
  { type: "flash",       label: "Flash sale",                 days: [0,1,2,3,4,5,6], hour: 11, minute: 30, channels: ["SMS","Email"], reason: "Urgency works best stacked on meal intent." },
  { type: "latenight",   label: "Late-night snack",           days: [5,6],        hour: 20, minute: 45, channels: ["WhatsApp","Email"], reason: "Reaches the night-owl crowd while staying before the 9 PM SMS cutoff." },
];

function detectCampaignType(goal) {
  const g = goal.toLowerCase();
  if (/breakfast|morning coffee|commute/.test(g))            return "breakfast";
  if (/brunch|sunday brunch|lazy sunday/.test(g))            return "brunch";
  if (/lunch|lunchbox|office lunch|midday/.test(g))          return "lunch";
  if (/late.?night|midnight|night.?owl/.test(g))             return "latenight";
  if (/snack|tea.?time|afternoon/.test(g))                   return "snack";
  if (/win.?back|lapsed|dormant|inactive|re.?engage/.test(g)) return "winback";
  if (/vip|loyalty|reward|exclusive/.test(g))                return "vip";
  if (/flash sale|next \d+ hour|limited time/.test(g))       return "flash";
  if (/weekend|friday|saturday/.test(g))                     return "weekend";
  // dinner foods + generic dinner/evening signals
  if (/dinner|evening|biryani|pizza|butter chicken|mutton|curry|thali|feast|offer|deal|bogo|buy one/.test(g)) return "dinner";
  return "dinner"; // sensible default
}

/** Returns next occurrence of a given hour:minute on allowed weekdays (0=Sun) */
function nextSlot(hour, minute, allowedDays) {
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(hour, minute, 0, 0);
    if (i === 0 && d <= now) continue; // already passed today
    if (allowedDays.includes(d.getDay())) return d;
  }
  // fallback: tomorrow same time
  const fallback = new Date(now);
  fallback.setDate(now.getDate() + 1);
  fallback.setHours(hour, minute, 0, 0);
  return fallback;
}

export async function suggestSendTime({ goal, channel }) {
  const type = detectCampaignType(goal);
  const entry = PLAYBOOK.find((p) => p.type === type) || PLAYBOOK[3]; // dinner default

  const suggested = nextSlot(entry.hour, entry.minute, entry.days);

  // Format for display
  const fmt = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true
  });

  return {
    suggestedAt: suggested.toISOString(),
    label: entry.label,
    displayTime: fmt.format(suggested),
    reason: entry.reason,
    recommendedChannels: entry.channels,
    channelNote: entry.channels.includes(channel)
      ? null
      : `Note: ${entry.label} campaigns perform best on ${entry.channels.join(" or ")}. You selected ${channel}.`
  };
}

// ---------------------------------------------------------------------------
// Customer data chatbot
// ---------------------------------------------------------------------------
export async function customerChat({ question, context }) {
  const provider = aiStatus();

  // Rule-based fallback: answer common questions directly from context
  function ruleAnswer() {
    const q = question.toLowerCase();
    if (/food|item|dish|order|popular|sell/.test(q)) {
      const items = Object.entries(context.customersByFavouriteItem).sort((a, b) => b[1] - a[1]);
      return `The food items ordered by customers are: ${items.map(([k, v]) => `${k} (${v} customers)`).join(", ")}. The most popular is ${items[0][0]}.`;
    }
    if (/city|cities|location|where/.test(q)) {
      const cities = Object.entries(context.customersByCity).sort((a, b) => b[1] - a[1]);
      return `Customers are spread across: ${cities.map(([k, v]) => `${k} (${v})`).join(", ")}.`;
    }
    if (/top|spend|spender|valuable|vip|best/.test(q)) {
      return `Top spenders: ${context.topSpenders.map((c) => `${c.name} (₹${c.totalSpend.toLocaleString("en-IN")}, ${c.orderCount} orders)`).join("; ")}.`;
    }
    if (/how many|total|count|number/.test(q)) {
      return `You have ${context.totalCustomers.toLocaleString()} customers in total.`;
    }
    if (/tag|segment|group|vip|dormant|new/.test(q)) {
      const tags = Object.entries(context.customersByTag).sort((a, b) => b[1] - a[1]);
      return `Customer tags: ${tags.map(([k, v]) => `${k} (${v})`).join(", ")}.`;
    }
    return `I can answer questions about food items ordered, customer cities, top spenders, customer counts, and tags. Here's a quick overview: ${context.totalCustomers} total customers, favourite items include ${Object.keys(context.customersByFavouriteItem).slice(0, 4).join(", ")}.`;
  }

  if (!provider.enabled) return ruleAnswer();

  const system = `You are a helpful CRM data analyst for Saffron Cafe. Answer the user's question about their customer base using ONLY the data provided in the context. Be concise and specific with numbers. If the data doesn't contain the answer, say so. Context data (JSON): ${JSON.stringify(context)}`;

  try {
    if (provider.provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
          max_tokens: 500,
          system,
          messages: [{ role: "user", content: question }]
        })
      });
      if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return data.content[0].text.trim();
    } else {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          max_tokens: 500,
          messages: [
            { role: "system", content: system },
            { role: "user", content: question }
          ]
        })
      });
      if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return data.choices[0].message.content.trim();
    }
  } catch (err) {
    console.error("[ai] customerChat fell back to rules:", err.message);
    return ruleAnswer();
  }
}