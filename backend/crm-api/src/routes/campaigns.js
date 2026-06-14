import { Router } from "express";
import mongoose from "mongoose";
import Campaign from "../models/Campaign.js";
import Customer from "../models/Customer.js";
import Communication from "../models/Communication.js";
import { validateFilter, filterToMongoQuery, describeFilter } from "../utils/segmentFilter.js";
import { campaignStats } from "../utils/campaignStats.js";
import { draftMessage, generateInsights, suggestSendTime } from "../services/ai.js";

const router = Router();
const CHANNEL_URL = () => process.env.CHANNEL_SERVICE_URL || "http://localhost:4100";
const CRM_URL = () => process.env.CRM_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`;

// POST /api/campaigns/draft-message  { goal, filter, channel }
router.post("/draft-message", async (req, res) => {
  try {
    const filter = validateFilter(req.body.filter || {});
    const channel = req.body.channel || "WhatsApp";
    const result = await draftMessage({ goal: req.body.goal || "", filter, channel });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/campaigns  { name?, goal, filter, channel, message }
router.post("/", async (req, res) => {
  try {
    const { goal, channel, message } = req.body;
    if (!goal || !channel || !message) {
      return res.status(400).json({ error: "goal, channel and message are required." });
    }
    const filter = validateFilter(req.body.filter || {});
    const audienceSize = await Customer.countDocuments(filterToMongoQuery(filter));
    if (audienceSize === 0) {
      return res.status(400).json({ error: "This audience matches 0 customers - widen the filter before launching." });
    }

    const campaign = await Campaign.create({
      name: req.body.name?.trim() || goal.slice(0, 60),
      goal,
      filterJson: filter,
      audienceDescription: describeFilter(filter),
      audienceSize,
      channel,
      message,
      status: "draft"
    });
    res.status(201).json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/send - the hero hand-off to the channel service
router.post("/:id/send", async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });
  if (campaign.status !== "draft") return res.status(409).json({ error: `Campaign already ${campaign.status}` });

  const customers = await Customer.find(filterToMongoQuery(campaign.filterJson))
    .select("name email phone")
    .lean();
  if (!customers.length) return res.status(400).json({ error: "Audience is now empty." });

  campaign.status = "sending";
  campaign.audienceSize = customers.length;
  await campaign.save();

  // 1 Communication row per recipient, status=queued
  const comms = await Communication.insertMany(
    customers.map((c) => ({
      campaignId: campaign._id,
      customerId: c._id,
      channel: campaign.channel,
      status: "queued"
    }))
  );

  // Personalise + batch to the channel service
  const byId = Object.fromEntries(customers.map((c) => [String(c._id), c]));
  const messages = comms.map((comm) => {
    const cust = byId[String(comm.customerId)];
    return {
      communicationId: String(comm._id),
      recipient: campaign.channel === "Email" ? cust.email : cust.phone,
      channel: campaign.channel,
      message: campaign.message.replaceAll("{name}", cust.name.split(" ")[0])
    };
  });

  try {
    const resp = await fetch(`${CHANNEL_URL()}/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        campaignId: String(campaign._id),
        callbackUrl: `${CRM_URL()}/api/receipts`,
        messages
      })
    });
    if (resp.status !== 202) throw new Error(`Channel service responded ${resp.status}`);
  } catch (err) {
    campaign.status = "draft";
    await campaign.save();
    await Communication.deleteMany({ campaignId: campaign._id });
    return res.status(502).json({ error: `Channel service unreachable: ${err.message}. Is it running on ${CHANNEL_URL()}?` });
  }

  campaign.status = "sent"; // accepted by the channel; receipts will stream in
  await campaign.save();
  res.json({ ok: true, queued: comms.length, campaignId: campaign._id });
});

// GET /api/campaigns - list with light stats
router.get("/", async (_req, res) => {
  const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
  const withStats = await Promise.all(
    campaigns.map(async (c) => ({ ...c, stats: await campaignStats(c._id) }))
  );
  res.json(withStats);
});

// GET /api/campaigns/:id - detail + funnel stats (polled by the UI)
router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  const campaign = await Campaign.findById(req.params.id).lean();
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });
  const stats = await campaignStats(campaign._id);
  res.json({ ...campaign, stats });
});

// POST /api/campaigns/suggest-send-time  { goal, channel }
router.post("/suggest-send-time", async (req, res) => {
  try {
    const { goal = "", channel = "WhatsApp" } = req.body;
    const suggestion = await suggestSendTime({ goal, channel });
    res.json(suggestion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/schedule  { scheduledAt }
router.post("/:id/schedule", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    if (campaign.status !== "draft") return res.status(409).json({ error: `Campaign already ${campaign.status}` });
    const { scheduledAt } = req.body;
    if (!scheduledAt) return res.status(400).json({ error: "scheduledAt is required" });
    const date = new Date(scheduledAt);
    if (isNaN(date.getTime()) || date <= new Date()) {
      return res.status(400).json({ error: "scheduledAt must be a future date/time" });
    }
    campaign.scheduledAt = date;
    campaign.status = "scheduled";
    await campaign.save();
    res.json({ ok: true, scheduledAt: campaign.scheduledAt, campaignId: campaign._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/insights - the AI analyst
router.post("/:id/insights", async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });
  const stats = await campaignStats(campaign._id);
  if (stats.sentTotal === 0) return res.status(400).json({ error: "Send the campaign first - there is nothing to analyse yet." });

  const insights = await generateInsights({ campaign, stats });
  campaign.insights = { ...insights, generatedAt: new Date() };
  await campaign.save();
  res.json(campaign.insights);
});

// DELETE /api/campaigns/:id - remove a campaign and its communications
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    await Communication.deleteMany({ campaignId: campaign._id });
    res.json({ ok: true, deleted: req.params.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/campaigns/:id/report - JSON report data for PDF/Excel export
router.get("/:id/report", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const campaign = await Campaign.findById(req.params.id).lean();
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    const stats = await campaignStats(campaign._id);
    res.json({ campaign, stats });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
export default router;
