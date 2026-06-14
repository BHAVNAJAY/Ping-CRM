const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "content-type": "application/json" },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  health: () => request("/health"),
  dashboard: () => request("/api/dashboard"),
  customers: ({ page = 1, search = "" } = {}) =>
    request(`/api/customers?page=${page}&limit=25&search=${encodeURIComponent(search)}`),
  previewSegment: (body) => request("/api/segments/preview", { method: "POST", body: JSON.stringify(body) }),
  draftMessage: (body) => request("/api/campaigns/draft-message", { method: "POST", body: JSON.stringify(body) }),
  createCampaign: (body) => request("/api/campaigns", { method: "POST", body: JSON.stringify(body) }),
  sendCampaign: (id) => request(`/api/campaigns/${id}/send`, { method: "POST" }),
  campaigns: () => request("/api/campaigns"),
  campaign: (id) => request(`/api/campaigns/${id}`),
  suggestSendTime: (body) => request("/api/campaigns/suggest-send-time", { method: "POST", body: JSON.stringify(body) }),
  scheduleCampaign: (id, scheduledAt) => request(`/api/campaigns/${id}/schedule`, { method: "POST", body: JSON.stringify({ scheduledAt }) }),
  insights: (id) => request(`/api/campaigns/${id}/insights`, { method: "POST" }),
  deleteCampaign: (id) => request(`/api/campaigns/${id}`, { method: "DELETE" }),
  report: (id) => request(`/api/campaigns/${id}/report`),
  addCustomer: (body) => request("/api/customers", { method: "POST", body: JSON.stringify(body) }),
  customerChat: (question) => request("/api/customers/chat", { method: "POST", body: JSON.stringify({ question }) }),
};
