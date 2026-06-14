import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const user = JSON.parse(localStorage.getItem("ping_user") || "{}");

  useEffect(() => {
    api.dashboard().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="card p-6 border-red-200 bg-red-50 text-sm text-red-700">
        Could not reach the CRM API: {error}. Start it with <code className="font-mono">npm run dev</code> in <code className="font-mono">backend/crm-api</code>.
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const statCards = stats ? [
    { label: "Customers", value: stats.customers.toLocaleString(), sub: "in your database", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" },
    { label: "Orders", value: stats.orders.toLocaleString(), sub: `${inr(stats.totalRevenue)} total revenue`, icon: "M9 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-6-4M3 6h18M16 10a4 4 0 01-8 0" },
    { label: "Campaigns", value: stats.campaigns, sub: `${stats.messagesDelivered.toLocaleString()} messages delivered`, icon: "M3 11l18-8-8 18-2-8-8-2z" },
    { label: "Revenue influenced", value: inr(stats.revenueInfluenced), sub: `${stats.conversions} conversions`, icon: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" },
  ] : [];

  return (
    <div>
      {/* Welcome banner */}
      <div className="rounded-2xl p-7 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg,#f4480a 0%,#e8176a 100%)" }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", right: 60, bottom: -60, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div className="relative">
          <p className="text-sm font-medium text-white/80">{greeting},</p>
          <h1 className="text-3xl font-extrabold tracking-tight mt-0.5">{user.name || "Sarah"} 👋</h1>
          <p className="mt-2 text-white/85 max-w-xl text-sm leading-relaxed">
            Here's how Saffron Cafe is performing today. Ready to reach the right people with your next campaign?
          </p>
          <Link to="/app/campaigns/new" className="inline-flex items-center gap-2 mt-5 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-white/90" style={{ color: "#e8176a" }}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14" /></svg>
            Create a campaign
          </Link>
        </div>
      </div>

      {/* Company details */}
      <div className="mt-6 card p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl flex items-center justify-center text-2xl" style={{ background: "rgba(244,72,10,0.08)", border: "1px solid rgba(244,72,10,0.15)" }}>
            ☕
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink">Saffron Cafe</h2>
            <p className="text-sm text-muted">Premium coffee & dining · Chennai, India</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Workspace</div>
            <div className="text-sm font-medium text-ink">{user.role || "Marketing Manager"}</div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-line pt-5">
          <div>
            <div className="text-xs text-muted">Industry</div>
            <div className="text-sm font-semibold text-ink mt-0.5">Food & Beverage</div>
          </div>
          <div>
            <div className="text-xs text-muted">Channels</div>
            <div className="text-sm font-semibold text-ink mt-0.5">WhatsApp, SMS, Email</div>
          </div>
          <div>
            <div className="text-xs text-muted">Plan</div>
            <div className="text-sm font-semibold text-ink mt-0.5">Growth</div>
          </div>
          <div>
            <div className="text-xs text-muted">Region</div>
            <div className="text-sm font-semibold text-ink mt-0.5">India (IST)</div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      {!stats ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-3 w-20 bg-orange-100 rounded" />
              <div className="mt-3 h-8 w-24 bg-orange-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => (
            <div key={s.label} className="card p-5 transition hover:border-primary/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">{s.label}</span>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(244,72,10,0.07)" }}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" style={{ color: "#f4480a" }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon} /></svg>
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold tracking-tight text-ink">{s.value}</div>
              <div className="text-xs text-muted mt-1">{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Run the loop */}
      <div className="mt-6 card p-6">
        <h2 className="font-semibold">Run the loop</h2>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Type a campaign goal in plain English. Ping translates it into a real audience, drafts the message, hands the batch to the channel service, and the funnel fills live as delivery receipts stream back.
        </p>
        <Link to="/app/campaigns/new" className="btn-secondary mt-4">Open the campaign builder</Link>
      </div>
    </div>
  );
}