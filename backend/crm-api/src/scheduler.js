// Polls MongoDB every 60 seconds and fires any scheduled campaigns that are due.
import Campaign from "./models/Campaign.js";
import Customer from "./models/Customer.js";
import Communication from "./models/Communication.js";
import { filterToMongoQuery } from "./utils/segmentFilter.js";

const CHANNEL_URL = () => process.env.CHANNEL_SERVICE_URL || "http://localhost:4100";
const CRM_URL = () => process.env.CRM_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`;

async function fireCampaign(campaign) {
  console.log(`[scheduler] firing campaign "${campaign.name}" (${campaign._id})`);
  const customers = await Customer.find(filterToMongoQuery(campaign.filterJson))
    .select("name email phone").lean();
  if (!customers.length) {
    campaign.status = "sent";
    await campaign.save();
    return { fired: false, reason: "audience empty" };
  }

  campaign.status = "sending";
  campaign.audienceSize = customers.length;
  await campaign.save();

  const comms = await Communication.insertMany(
    customers.map((c) => ({
      campaignId: campaign._id,
      customerId: c._id,
      channel: campaign.channel,
      status: "queued"
    }))
  );

  const byId = Object.fromEntries(customers.map((c) => [String(c._id), c]));
  const messages = comms.map((comm) => {
    const cust = byId[String(comm.customerId)];
    return {
      communicationId: String(comm._id),
      recipient: campaign.channel === "Email" ? cust.email : cust.phone,
      channel: campaign.channel,
      message: campaign.message.replaceAll("{name}", cust.name.split(" ")[0])
    };
  });

  try {
    const MAX_RETRIES = 3;
    let resp;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        resp = await fetch(`${CHANNEL_URL()}/send`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            campaignId: String(campaign._id),
            callbackUrl: `${CRM_URL()}/api/receipts`,
            messages
          })
        });

        if (resp.status === 202) {
          campaign.status = "sent";
          await campaign.save();
          console.log(`[scheduler] campaign "${campaign.name}" sent after ${attempt} attempt(s)`);
          return { fired: true, count: comms.length };
        }

        // Retry only on temporary server errors (5xx, includes 503)
        if (resp.status >= 500 && attempt < MAX_RETRIES) {
          console.log(`[scheduler] Channel unavailable (attempt ${attempt}/${MAX_RETRIES}). Retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        throw new Error(`Channel service responded ${resp.status}`);
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          console.log(`[scheduler] Attempt ${attempt} failed: ${err.message}. Retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        throw err;
      }
    }
  } catch (err) {
    campaign.status = "draft";
    campaign.scheduledAt = null;
    await campaign.save();
    await Communication.deleteMany({ campaignId: campaign._id });
    console.error(`[scheduler] campaign "${campaign.name}" failed after 3 attempts:`, err.message);
    return { fired: false, reason: err.message };
  }
}

export function startScheduler() {
  console.log("[scheduler] started, polling every 60s");
  setInterval(async () => {
    try {
      const due = await Campaign.find({
        status: "scheduled",
        scheduledAt: { $lte: new Date() }
      });
      for (const campaign of due) {
        await fireCampaign(campaign);
      }
    } catch (err) {
      console.error("[scheduler] poll error:", err.message);
    }
  }, 60_000);
}