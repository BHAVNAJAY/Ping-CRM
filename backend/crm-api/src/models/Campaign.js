import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    goal: { type: String, required: true },
    filterJson: { type: Object, required: true },
    audienceDescription: { type: String, default: "" },
    audienceSize: { type: Number, default: 0 },
    channel: { type: String, enum: ["WhatsApp", "SMS", "Email"], required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["draft", "scheduled", "sending", "sent"], default: "draft" },
    scheduledAt: { type: Date, default: null },
    insights: { type: Object, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("Campaign", campaignSchema);