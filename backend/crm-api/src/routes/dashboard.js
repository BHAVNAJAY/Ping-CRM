import { Router } from "express";
import Customer from "../models/Customer.js";
import Order from "../models/Order.js";
import Campaign from "../models/Campaign.js";
import Communication from "../models/Communication.js";

const router = Router();

// GET /api/dashboard - real metrics computed from the data
router.get("/", async (_req, res) => {
  const [customers, orders, campaigns, revenueAgg, delivered, converted] = await Promise.all([
    Customer.countDocuments(),
    Order.countDocuments(),
    Campaign.countDocuments(),
    Order.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    Communication.countDocuments({ status: { $in: ["delivered", "opened", "read", "clicked", "converted"] } }),
    Communication.countDocuments({ status: "converted" })
  ]);

  const totalRevenue = Math.round(revenueAgg[0]?.total || 0);
  const avgOrder = orders ? totalRevenue / orders : 0;

  res.json({
    customers,
    orders,
    campaigns,
    totalRevenue,
    messagesDelivered: delivered,
    conversions: converted,
    // conversions x average order value = revenue this tool helped create
    revenueInfluenced: Math.round(converted * avgOrder)
  });
});

export default router;
