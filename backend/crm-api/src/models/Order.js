import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    item: { type: String, required: true },
    amount: { type: Number, required: true },
    createdAt: { type: Date, required: true, index: true } // keeps the hour - powers time-of-day insights
  },
  { versionKey: false }
);

export default mongoose.model("Order", orderSchema);
