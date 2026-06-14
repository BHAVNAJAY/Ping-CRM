// Seed Saffron Cafe with realistic customers + orders.
// Run: npm run seed   (drops and recreates customers/orders/campaigns/communications)

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./db.js";
import Customer from "./models/Customer.js";
import Order from "./models/Order.js";
import Campaign from "./models/Campaign.js";
import Communication from "./models/Communication.js";

// Deterministic PRNG so re-seeding gives the same demo data
let seedState = 20260611;
function rand() {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

const FIRST = ["Aarav","Ananya","Vikram","Priya","Rahul","Sneha","Karthik","Divya","Arjun","Meera","Rohan","Kavya","Aditya","Ishita","Nikhil","Pooja","Sanjay","Lakshmi","Varun","Riya","Harish","Anjali","Suresh","Nandini","Manoj","Shruti","Deepak","Tara","Ramesh","Aisha","Gautam","Swati","Vijay","Neha","Pranav","Keerthi","Ashwin","Maya","Rajesh","Sonia"];
const LAST = ["Sharma","Iyer","Patel","Reddy","Nair","Kumar","Menon","Gupta","Rao","Singh","Krishnan","Joshi","Pillai","Chopra","Das","Mehta","Banerjee","Verma","Srinivasan","Kapoor"];
const CITIES = [
  { name: "Chennai", weight: 30 },
  { name: "Bengaluru", weight: 25 },
  { name: "Mumbai", weight: 15 },
  { name: "Hyderabad", weight: 12 },
  { name: "Delhi", weight: 10 },
  { name: "Pune", weight: 8 }
];
const MENU = [
  { item: "Biryani", price: [220, 380], weight: 28 },
  { item: "Butter Chicken", price: [260, 420], weight: 14 },
  { item: "Paneer Tikka", price: [180, 300], weight: 14 },
  { item: "Veg Thali", price: [150, 250], weight: 12 },
  { item: "Masala Chai", price: [40, 80], weight: 12 },
  { item: "Filter Coffee", price: [50, 90], weight: 10 },
  { item: "Mutton Rolls", price: [120, 200], weight: 6 },
  { item: "Gulab Jamun", price: [60, 120], weight: 4 }
];

function weightedPick(list) {
  const total = list.reduce((s, x) => s + x.weight, 0);
  let r = rand() * total;
  for (const x of list) {
    r -= x.weight;
    if (r <= 0) return x;
  }
  return list[list.length - 1];
}

// Cafe-shaped order hours: lunch and dinner peaks, weekend brunch bump
function orderHour(isWeekend) {
  const r = rand();
  if (isWeekend && r < 0.2) return randInt(10, 12);          // brunch
  if (r < 0.45) return randInt(12, 14);                       // lunch peak
  if (r < 0.55) return randInt(15, 17);                       // chai window
  if (r < 0.9) return randInt(19, 22);                        // dinner peak
  return randInt(8, 23);
}

async function main() {
  await connectDB();
  console.log("[seed] clearing collections...");
  await Promise.all([
    Customer.deleteMany({}),
    Order.deleteMany({}),
    Campaign.deleteMany({}),
    Communication.deleteMany({})
  ]);

  const NUM_CUSTOMERS = 1500;
  const now = new Date();
  const customers = [];

  console.log(`[seed] generating ${NUM_CUSTOMERS} customers + orders...`);

  for (let i = 0; i < NUM_CUSTOMERS; i++) {
    const first = pick(FIRST);
    const last = pick(LAST);
    const name = `${first} ${last}`;
    const city = weightedPick(CITIES).name;
    const favourite = weightedPick(MENU);

    // Customer lifecycle archetypes drive realistic recency/frequency spread
    const archetype = rand();
    let numOrders, daysSinceLastOrder;
    if (archetype < 0.12) {        // champions
      numOrders = randInt(12, 30); daysSinceLastOrder = randInt(0, 6);
    } else if (archetype < 0.35) { // regulars
      numOrders = randInt(5, 12);  daysSinceLastOrder = randInt(2, 20);
    } else if (archetype < 0.65) { // occasional
      numOrders = randInt(2, 5);   daysSinceLastOrder = randInt(7, 60);
    } else if (archetype < 0.85) { // at risk / dormant
      numOrders = randInt(2, 8);   daysSinceLastOrder = randInt(45, 180);
    } else {                       // one-and-done / new
      numOrders = 1;               daysSinceLastOrder = randInt(0, 90);
    }

    const joinedDaysAgo = Math.max(daysSinceLastOrder + randInt(10, 540), 14);
    const joinedAt = new Date(now.getTime() - joinedDaysAgo * 86400000);

    const orders = [];
    let totalSpend = 0;
    let lastOrderAt = null;
    for (let o = 0; o < numOrders; o++) {
      // Most recent order is exactly daysSinceLastOrder ago; rest spread back to join date
      const daysAgo =
        o === 0 ? daysSinceLastOrder : randInt(daysSinceLastOrder, joinedDaysAgo - 1);
      const d = new Date(now.getTime() - daysAgo * 86400000);
      const isWeekend = [0, 6].includes(d.getDay());
      d.setHours(orderHour(isWeekend), randInt(0, 59), randInt(0, 59), 0);

      // 65% of orders are the favourite item, rest from the wider menu
      const menuItem = rand() < 0.65 ? favourite : weightedPick(MENU);
      const amount = randInt(menuItem.price[0], menuItem.price[1]);
      orders.push({ item: menuItem.item, amount, createdAt: d });
      totalSpend += amount;
      if (!lastOrderAt || d > lastOrderAt) lastOrderAt = d;
    }

    const tags = [];
    if (totalSpend > 4000 || numOrders >= 15) tags.push("vip");
    if (orders.filter((o) => o.createdAt.getHours() >= 12 && o.createdAt.getHours() <= 14).length / orders.length > 0.4) tags.push("lunch-buyer");
    if (orders.filter((o) => [0, 6].includes(o.createdAt.getDay())).length / orders.length > 0.4) tags.push("weekend-regular");
    if (joinedDaysAgo <= 45) tags.push("new");
    if (daysSinceLastOrder >= 60) tags.push("dormant");

    customers.push({
      doc: {
        name,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
        phone: `+91 9${String(randInt(100000000, 999999999))}`,
        city,
        favItem: favourite.item,
        tags,
        joinedAt,
        orderCount: numOrders,
        totalSpend,
        lastOrderAt
      },
      orders
    });
  }

  const inserted = await Customer.insertMany(customers.map((c) => c.doc));

  const orderDocs = [];
  inserted.forEach((cust, idx) => {
    for (const o of customers[idx].orders) {
      orderDocs.push({ customerId: cust._id, ...o });
    }
  });
  await Order.insertMany(orderDocs, { ordered: false });

  console.log(`[seed] done: ${inserted.length} customers, ${orderDocs.length} orders`);
  console.log(`[seed] sample segment sizes:`);
  console.log(`        Biryani lovers: ${await Customer.countDocuments({ favItem: "Biryani" })}`);
  console.log(`        VIPs:           ${await Customer.countDocuments({ tags: "vip" })}`);
  console.log(`        Dormant:        ${await Customer.countDocuments({ tags: "dormant" })}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
