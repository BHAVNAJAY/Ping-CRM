import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: { type: String, required: true },
    city: { type: String, index: true },
    favItem: { type: String, index: true },
    tags: { type: [String], index: true, default: [] },
    joinedAt: { type: Date, required: true },

    // Denormalised aggregates (maintained by the seed script / order writes)
    // keeps segment queries to a simple indexed find instead of a join per request
    orderCount: { type: Number, default: 0, index: true },
    totalSpend: { type: Number, default: 0 },
    lastOrderAt: { type: Date, index: true }
  },
  { timestamps: true }
);

export default mongoose.model("Customer", customerSchema);
