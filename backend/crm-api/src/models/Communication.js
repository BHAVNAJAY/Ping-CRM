import mongoose from "mongoose";

// One row per (campaign x recipient). Status only ever moves FORWARD through
// STATUS_RANK - that is the out-of-order safety guarantee.
export const STATUS_RANK = {
  queued: 0,
  sent: 1,
  failed: 1,     // terminal failure branch off queued/sent
  delivered: 2,
  opened: 3,
  read: 4,
  clicked: 5,
  converted: 6
};

const communicationSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    channel: { type: String, required: true },
    status: { type: String, default: "queued", index: true },
    sentAt: { type: Date },
    failureReason: { type: String },
    // Idempotency ledger: every eventType already applied to this communication.
    // Duplicate callbacks are detected and ignored against this list.
    appliedEvents: { type: [String], default: [] }
  },
  { timestamps: true }
);

communicationSchema.index({ campaignId: 1, status: 1 });

export default mongoose.model("Communication", communicationSchema);
