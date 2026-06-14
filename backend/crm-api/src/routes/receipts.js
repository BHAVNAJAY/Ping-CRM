import { Router } from "express";
import mongoose from "mongoose";
import Communication, { STATUS_RANK } from "../models/Communication.js";

const router = Router();

// POST /api/receipts - async events from the channel service.
//
// The channel service delivers AT LEAST ONCE: events can arrive duplicated,
// out of order, or both. Two guarantees protect state here:
//
//   1. IDEMPOTENCY - the (communicationId, eventType) pair is recorded in
//      appliedEvents via an atomic $addToSet guard. A duplicate event matches
//      nothing on its second arrival and is acknowledged without side effects.
//
//   2. OUT-OF-ORDER SAFETY - status only moves FORWARD through STATUS_RANK.
//      The status write is a single conditional update that matches only if
//      the current status ranks strictly below the incoming event, so a late
//      "delivered" can never regress a communication already "clicked", and
//      concurrent callbacks cannot race each other into a bad state.
//
//      "failed" is terminal: it applies only from queued/sent, and no later
//      success event overwrites it.
router.post("/", async (req, res) => {
  const { communicationId, eventType, occurredAt, reason } = req.body || {};

  if (!mongoose.isValidObjectId(communicationId) || !STATUS_RANK.hasOwnProperty(eventType)) {
    return res.status(400).json({ error: "communicationId and a valid eventType are required" });
  }

  // --- Gate 1: idempotency. Matches only if this eventType was never applied.
  const gated = await Communication.findOneAndUpdate(
    { _id: communicationId, appliedEvents: { $ne: eventType } },
    { $addToSet: { appliedEvents: eventType } }
  );

  if (!gated) {
    const exists = await Communication.exists({ _id: communicationId });
    if (!exists) return res.status(404).json({ error: "Unknown communicationId" });
    // Duplicate delivery - acknowledge (200) so the channel stops retrying.
    return res.json({ ok: true, duplicate: true });
  }

  // --- Gate 2: forward-only status transition, atomic in one update.
  const incomingRank = STATUS_RANK[eventType];
  const advanceableFrom =
    eventType === "failed"
      ? ["queued", "sent"] // failure can only interrupt the send phase
      : Object.keys(STATUS_RANK).filter(
          (s) => s !== "failed" && STATUS_RANK[s] < incomingRank
        );

  const set = { status: eventType };
  if (eventType === "sent") set.sentAt = occurredAt ? new Date(occurredAt) : new Date();
  if (eventType === "failed") set.failureReason = reason || "Provider failure";

  const result = await Communication.updateOne(
    { _id: communicationId, status: { $in: advanceableFrom } },
    { $set: set }
  );

  res.json({ ok: true, applied: eventType, advanced: result.modifiedCount === 1 });
});

export default router;
