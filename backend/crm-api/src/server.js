import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import customersRouter from "./routes/customers.js";
import dashboardRouter from "./routes/dashboard.js";
import segmentsRouter from "./routes/segments.js";
import campaignsRouter from "./routes/campaigns.js";
import receiptsRouter from "./routes/receipts.js";
import { aiStatus } from "./services/ai.js";
import { startScheduler } from "./scheduler.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "crm-api", ai: aiStatus() }));

app.use("/api/customers", customersRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/segments", segmentsRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/receipts", receiptsRouter);

// Central error guard so a bad request never crashes the process
app.use((err, _req, res, _next) => {
  console.error("[crm-api] unhandled:", err);
  res.status(500).json({ error: "Internal error" });
});

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      const ai = aiStatus();
      console.log(`[crm-api] listening on :${PORT}`);
      console.log(`[crm-api] AI provider: ${ai.enabled ? ai.provider : "none (rule-based fallbacks active)"}`);
      startScheduler();
    });
  })
  .catch((err) => {
    console.error("[crm-api] failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
