import { z } from "zod";

// The ONLY shape the AI is allowed to produce. Anything else is rejected
// before it gets near the database - the model never touches data directly.
export const filterSchema = z
  .object({
    favItem: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).max(10).optional(),
    minOrders: z.number().int().min(0).optional(),
    maxOrders: z.number().int().min(0).optional(),
    minTotalSpend: z.number().min(0).optional(),
    maxTotalSpend: z.number().min(0).optional(),
    lastOrderBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    lastOrderAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    joinedBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    joinedAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  })
  .strict();

/** Validate an unknown object (e.g. raw LLM output) into a safe filter. */
export function validateFilter(raw) {
  return filterSchema.parse(raw);
}

/** Translate a validated filter into a Mongo query against Customer. */
export function filterToMongoQuery(filter) {
  const q = {};
  if (filter.favItem) q.favItem = new RegExp(`^${escapeRegex(filter.favItem)}$`, "i");
  if (filter.city) q.city = new RegExp(`^${escapeRegex(filter.city)}$`, "i");
  if (filter.tags?.length) q.tags = { $in: filter.tags.map((t) => t.toLowerCase()) };

  if (filter.minOrders != null || filter.maxOrders != null) {
    q.orderCount = {};
    if (filter.minOrders != null) q.orderCount.$gte = filter.minOrders;
    if (filter.maxOrders != null) q.orderCount.$lte = filter.maxOrders;
  }
  if (filter.minTotalSpend != null || filter.maxTotalSpend != null) {
    q.totalSpend = {};
    if (filter.minTotalSpend != null) q.totalSpend.$gte = filter.minTotalSpend;
    if (filter.maxTotalSpend != null) q.totalSpend.$lte = filter.maxTotalSpend;
  }
  if (filter.lastOrderBefore || filter.lastOrderAfter) {
    q.lastOrderAt = {};
    if (filter.lastOrderBefore) q.lastOrderAt.$lt = endOfDay(filter.lastOrderBefore);
    if (filter.lastOrderAfter) q.lastOrderAt.$gte = new Date(filter.lastOrderAfter);
  }
  if (filter.joinedBefore || filter.joinedAfter) {
    q.joinedAt = {};
    if (filter.joinedBefore) q.joinedAt.$lt = endOfDay(filter.joinedBefore);
    if (filter.joinedAfter) q.joinedAt.$gte = new Date(filter.joinedAfter);
  }
  return q;
}

/** Human-readable description of a filter, for the UI and AI prompts. */
export function describeFilter(filter) {
  const parts = [];
  if (filter.favItem) parts.push(`favourite item is ${filter.favItem}`);
  if (filter.city) parts.push(`in ${filter.city}`);
  if (filter.tags?.length) parts.push(`tagged ${filter.tags.join(", ")}`);
  if (filter.minOrders != null) parts.push(`at least ${filter.minOrders} orders`);
  if (filter.maxOrders != null) parts.push(`at most ${filter.maxOrders} orders`);
  if (filter.minTotalSpend != null) parts.push(`spent over ₹${filter.minTotalSpend}`);
  if (filter.maxTotalSpend != null) parts.push(`spent under ₹${filter.maxTotalSpend}`);
  if (filter.lastOrderBefore) parts.push(`no order since ${filter.lastOrderBefore}`);
  if (filter.lastOrderAfter) parts.push(`ordered after ${filter.lastOrderAfter}`);
  if (filter.joinedAfter) parts.push(`joined after ${filter.joinedAfter}`);
  if (filter.joinedBefore) parts.push(`joined before ${filter.joinedBefore}`);
  return parts.length ? `Customers whose ${parts.join(", ")}` : "All customers";
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function endOfDay(yyyyMmDd) {
  const d = new Date(yyyyMmDd);
  d.setHours(23, 59, 59, 999);
  return d;
}
