import { Router } from "express";
import Customer from "../models/Customer.js";
import { buildFilter } from "../services/ai.js";
import { validateFilter, filterToMongoQuery, describeFilter } from "../utils/segmentFilter.js";

const router = Router();

// POST /api/segments/preview  { goal } | { filter }
// Natural language goes through the AI (or rule fallback); an explicit filter
// object (e.g. after the user tweaks chips in the UI) is validated directly.
router.post("/preview", async (req, res) => {
  try {
    let filter, source;
    if (req.body.filter) {
      filter = validateFilter(req.body.filter);
      source = "manual";
    } else if (typeof req.body.goal === "string" && req.body.goal.trim()) {
      ({ filter, source } = await buildFilter(req.body.goal.trim()));
    } else {
      return res.status(400).json({ error: "Provide a goal (string) or a filter (object)." });
    }

    const query = filterToMongoQuery(filter);
    const [count, sample] = await Promise.all([
      Customer.countDocuments(query),
      Customer.find(query).limit(5).select("name city favItem orderCount lastOrderAt").lean()
    ]);

    res.json({ filter, source, description: describeFilter(filter), count, sample });
  } catch (err) {
    res.status(400).json({ error: `Could not build that audience: ${err.message}` });
  }
});

export default router;
