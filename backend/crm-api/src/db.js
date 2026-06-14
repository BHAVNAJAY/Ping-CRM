import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/ping";
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log(`[crm-api] MongoDB connected: ${uri.replace(/\/\/.*@/, "//<credentials>@")}`);
}
