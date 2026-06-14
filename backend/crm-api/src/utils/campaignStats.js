import mongoose from "mongoose";
import Communication from "../models/Communication.js";
import { STATUS_RANK } from "../models/Communication.js";

// Funnel logic: a "clicked" message was also delivered, opened and read.
// So each funnel stage counts every communication at-or-past that stage.
export async function campaignStats(campaignId) {
  const id = typeof campaignId === "string"
    ? new mongoose.Types.ObjectId(campaignId)
    : campaignId;
  const rows = await Communication.aggregate([
    { $match: { campaignId: id } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  const byStatus = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const total = rows.reduce((s, r) => s + r.count, 0);

  const atOrPast = (stage) =>
    rows.reduce(
      (s, r) =>
        r._id !== "failed" && STATUS_RANK[r._id] >= STATUS_RANK[stage] ? s + r.count : s,
      0
    );

  return {
    audience: total,
    queued: byStatus.queued || 0,
    failed: byStatus.failed || 0,
    sentTotal: total - (byStatus.queued || 0), // handed to the channel service
    delivered: atOrPast("delivered"),
    opened: atOrPast("opened"),
    read: atOrPast("read"),
    clicked: atOrPast("clicked"),
    converted: atOrPast("converted")
  };
}
