import { Router } from "express";
import Customer from "../models/Customer.js";
import { customerChat } from "../services/ai.js";

const router = Router();

// GET /api/customers?search=&page=&limit=
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const search = (req.query.search || "").trim();

  const q = search
    ? {
        $or: [
          { name: new RegExp(search, "i") },
          { email: new RegExp(search, "i") },
          { city: new RegExp(search, "i") },
          { favItem: new RegExp(search, "i") }
        ]
      }
    : {};

  const [items, total] = await Promise.all([
    Customer.find(q).sort({ lastOrderAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Customer.countDocuments(q)
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

// POST /api/customers - add a customer manually
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, city, favItem, tags } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({ error: "name, email and phone are required" });
    }
    const customer = await Customer.create({
      name, email, phone,
      city: city || "Unknown",
      favItem: favItem || "Filter Coffee",
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(",").map((t) => t.trim()) : ["new"]),
      joinedAt: new Date(),
      orderCount: 0,
      totalSpend: 0,
      lastOrderAt: null
    });
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/customers/chat { question } - AI Q&A over customer data
router.post("/chat", async (req, res) => {
  try {
    const question = (req.body.question || "").trim();
    if (!question) return res.status(400).json({ error: "question is required" });

    // Gather aggregate stats to ground the answer
    const [total, byCity, byItem, byTag, topSpenders, recent] = await Promise.all([
      Customer.countDocuments(),
      Customer.aggregate([{ $group: { _id: "$city", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      Customer.aggregate([{ $group: { _id: "$favItem", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Customer.aggregate([{ $unwind: "$tags" }, { $group: { _id: "$tags", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Customer.find().sort({ totalSpend: -1 }).limit(5).select("name city favItem totalSpend orderCount").lean(),
      Customer.find().sort({ lastOrderAt: -1 }).limit(5).select("name city favItem lastOrderAt").lean()
    ]);

    const context = {
      totalCustomers: total,
      customersByCity: Object.fromEntries(byCity.map((r) => [r._id, r.count])),
      customersByFavouriteItem: Object.fromEntries(byItem.map((r) => [r._id, r.count])),
      customersByTag: Object.fromEntries(byTag.map((r) => [r._id, r.count])),
      topSpenders,
      mostRecentOrders: recent
    };

    const answer = await customerChat({ question, context });
    res.json({ answer });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;