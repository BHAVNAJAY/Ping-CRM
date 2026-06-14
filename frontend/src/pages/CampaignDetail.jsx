import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { api } from "../api.js";
import StatusBadge from "../components/StatusBadge.jsx";
import FilterChips from "../components/FilterChips.jsx";
import { exportPDF, exportExcel } from "../reportExport.js";

const STAGE_COLORS = ["#f4480a", "#e8390d", "#e8176a", "#c4145a", "#9a1048"];
const POLL_MS = 2000;

function pct(part, whole) {
  return whole ? `${Math.round((part / whole) * 100)}%` : "0%";
}

export default function CampaignDetail() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState("");
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const settledPolls = useRef(0);
  const lastSnapshot = useRef("");
  const [downloadOpen, setDownloadOpen] = useState(false);

  useEffect(() => {
    let timer;
    let cancelled = false;

    async function tick() {
      try {
        const data = await api.campaign(id);
        if (cancelled) return;
        setCampaign(data);
        setError("");
        if (data.insights && !insights) setInsights(data.insights);

        const snapshot = JSON.stringify(data.stats);
        if (snapshot === lastSnapshot.current) settledPolls.current += 1;
        else settledPolls.current = 0;
        lastSnapshot.current = snapshot;

        const stillMoving = settledPolls.current < 8;
        timer = setTimeout(tick, stillMoving ? POLL_MS : 10000);
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          timer = setTimeout(tick, 5000);
        }
      }
    }

    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [id]);

  async function download(format) {
  setDownloadOpen(false);
  try {
    const data = await api.report(id);
    if (format === "pdf") exportPDF(data);
    else exportExcel(data);
  } catch (e) {
    setError(e.message);
  }
}

  async function generateInsights() {
    setInsightsLoading(true);
    setInsightsError("");
    try {
      setInsights(await api.insights(id));
    } catch (e) {
      setInsightsError(e.message);
    } finally {
      setInsightsLoading(false);
    }
  }

  if (error && !campaign) {
    return <div className="card p-6 border-red-200 bg-red-50 text-sm text-red-700">{error}</div>;
  }
  if (!campaign) {
    return <div className="card p-10 text-center text-sm text-muted">Loading campaign...</div>;
  }

  const s = campaign.stats;
  const live = campaign.status === "sending" || (campaign.status === "sent" && (s.queued > 0 || settledPolls.current < 8));

  const funnel = [
    { stage: "Sent",      value: s.sentTotal },
    { stage: "Delivered", value: s.delivered },
    { stage: "Opened",    value: s.opened },
    { stage: "Clicked",   value: s.clicked },
    { stage: "Converted", value: s.converted }
  ];

  return (
    <div>
      
      {/* Header */}
      <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
      <Link to="/app/campaigns" className="text-sm font-medium text-primary hover:underline">← Back to campaigns</Link>
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
            {live && campaign.status !== "draft" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color:"#f4480a" }}>
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background:"#f4480a" }} />
                Live — receipts streaming in
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">Goal: {campaign.goal}</p>
        </div>
        <div className="flex items-center gap-4">
  <div className="text-right">
    <div className="text-xs font-semibold uppercase tracking-wide text-muted">Channel</div>
    <div className="font-semibold">{campaign.channel}</div>
  </div>
  <div className="relative">
    <button
      onClick={() => setDownloadOpen(!downloadOpen)}
      className="btn-secondary"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
      Download report
    </button>
    {downloadOpen && (
      <div className="absolute right-0 mt-1 w-36 rounded-lg border border-line bg-white shadow-lg z-20">
        <button onClick={() => download("pdf")} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-orange-50 rounded-t-lg">Download PDF</button>
        <button onClick={() => download("excel")} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-orange-50 rounded-b-lg border-t border-line">Download Excel</button>
      </div>
    )}
  </div>
</div>
      </div>

      <div className="mt-3"><FilterChips filter={campaign.filterJson} /></div>

      {/* Live analytics headline numbers */}
      <div className="mt-6 card p-5" style={{ border:"1.5px solid rgba(244,72,10,0.2)", background:"rgba(244,72,10,0.02)" }}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold text-base">Live Analytics</h2>
          {live && campaign.status !== "draft" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background:"rgba(244,72,10,0.08)", color:"#f4480a" }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background:"#f4480a" }} />
              Updating live
            </span>
          )}
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))" }}>
          {[
            { label: "Audience",  value: s.audience,                         sub: "total reached" },
            { label: "Sent",      value: s.sentTotal,                        sub: pct(s.sentTotal, s.audience) },
            { label: "Delivered", value: s.delivered,                        sub: pct(s.delivered, s.sentTotal) },
            { label: "Opened",    value: s.opened,                           sub: pct(s.opened, s.delivered) },
            { label: "Clicked",   value: s.clicked,                          sub: pct(s.clicked, s.opened) },
            { label: "Converted", value: s.converted,                        sub: pct(s.converted, s.sentTotal) },
            { label: "Failed",    value: s.failed,                           sub: pct(s.failed, s.sentTotal) },
            { label: "Queued",    value: s.queued,                           sub: "in flight" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="card p-4" style={{ textAlign:"center" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">{label}</div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: label === "Failed" ? "#dc2626" : label === "Converted" ? "#f4480a" : "#1a0805" }}>{value}</div>
              <div className="text-xs text-muted mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Funnel chart + AI insights */}
      <div className="mt-6 grid gap-6" style={{ gridTemplateColumns:"3fr 2fr" }}>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Delivery funnel</h2>
            <span className="text-xs text-muted">
              {s.failed > 0 && `${s.failed} failed · `}
              {s.queued > 0 ? `${s.queued} still queued` : "all callbacks landed"}
            </span>
          </div>
          <div style={{ height:280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ left:8, right:48, top:4, bottom:4 }}>
                <XAxis type="number" hide domain={[0, Math.max(s.audience, 1)]} />
                <YAxis
                  type="category" dataKey="stage" width={84}
                  axisLine={false} tickLine={false}
                  tick={{ fill:"#7a5a52", fontSize:13, fontWeight:500 }}
                />
                <Tooltip
                  cursor={{ fill:"rgba(244,72,10,0.04)" }}
                  contentStyle={{ borderRadius:10, border:"1px solid #f0e4df", fontSize:13 }}
                  formatter={(v) => [v.toLocaleString(), "Customers"]}
                />
                <Bar dataKey="value" radius={[0,6,6,0]} isAnimationActive={false} barSize={32}>
                  {funnel.map((_, i) => <Cell key={i} fill={STAGE_COLORS[i]} />)}
                  <LabelList dataKey="value" position="right" formatter={(v) => v.toLocaleString()} style={{ fill:"#1a0805", fontSize:12, fontWeight:600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI insights */}
        <div className="card p-6">
          <h2 className="font-semibold">AI Insights</h2>
          {!insights ? (
            <>
              <p className="mt-2 text-sm text-muted">Once receipts settle, get an AI explanation of what worked and what to do next.</p>
              {insightsError && <p className="mt-3 text-sm text-red-700">{insightsError}</p>}
              <button className="btn-primary mt-4" onClick={generateInsights} disabled={insightsLoading || s.sentTotal === 0}>
                {insightsLoading ? "Analysing..." : "Generate insights"}
              </button>
            </>
          ) : (
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Why it performed this way</div>
              <ul className="space-y-2.5 mb-5">
                {insights.reasons.map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background:"#f4480a" }} />
                    {r}
                  </li>
                ))}
              </ul>
              <div className="rounded-lg p-4" style={{ background:"rgba(244,72,10,0.06)", border:"1px solid rgba(244,72,10,0.15)" }}>
                <div className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color:"#f4480a" }}>Recommended next move</div>
                <p className="text-sm leading-relaxed text-ink">{insights.recommendation}</p>
              </div>
              <button className="btn-secondary mt-4" onClick={generateInsights} disabled={insightsLoading}>
                {insightsLoading ? "Re-analysing..." : "Re-run analysis"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Message preview */}
      <div className="mt-6 card p-6">
        <h2 className="font-semibold">Message sent</h2>
        <pre className="mt-3 whitespace-pre-wrap rounded-lg p-4 text-sm font-sans leading-relaxed" style={{ background:"#fdf8f4", border:"1px solid #f0e4df" }}>{campaign.message}</pre>
      </div>
    </div>
  );
}