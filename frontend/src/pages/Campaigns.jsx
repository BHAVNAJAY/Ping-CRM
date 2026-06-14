import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { exportPDF, exportExcel } from "../reportExport.js";

const fmt = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadMenu, setDownloadMenu] = useState(null);

  function load() {
    api.campaigns().then(setCampaigns).catch((e) => setError(e.message));
  }
  useEffect(() => { load(); }, []);

  async function download(c, format) {
    setDownloadMenu(null);
    try {
      const data = await api.report(c._id);
      if (format === "pdf") exportPDF(data);
      else exportExcel(data);
    } catch (e) {
      setError(e.message);
    }
  }

  async function doDelete() {
    setDeleting(true);
    try {
      await api.deleteCampaign(confirmDelete._id);
      setConfirmDelete(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div onClick={() => setDownloadMenu(null)}>
      <div className="rounded-2xl p-6 text-white mb-6 flex items-center justify-between flex-wrap gap-4" style={{ background: "linear-gradient(135deg,#f4480a,#e8176a)" }}>
  <div>
    <h1 className="text-2xl font-extrabold tracking-tight">Campaigns</h1>
    <p className="mt-1 text-sm text-white/85">Every campaign you've launched, newest first. Download reports or track live performance.</p>
  </div>
  <Link to="/app/campaigns/new" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-white/90" style={{ color: "#e8176a" }}>
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14" /></svg>
    New campaign
  </Link>
</div>

{campaigns && campaigns.length > 0 && (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
    {[
      { label: "Total campaigns", value: campaigns.length },
      { label: "Total reach", value: campaigns.reduce((s, c) => s + (c.audienceSize || 0), 0).toLocaleString() },
      { label: "Delivered", value: campaigns.reduce((s, c) => s + (c.stats?.delivered || 0), 0).toLocaleString() },
      { label: "Conversions", value: campaigns.reduce((s, c) => s + (c.stats?.converted || 0), 0).toLocaleString() },
    ].map((m) => (
      <div key={m.label} className="card p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">{m.label}</div>
        <div className="mt-1 text-2xl font-bold tracking-tight text-ink">{m.value}</div>
      </div>
    ))}
  </div>
)}

      {error && <div className="mt-6 card p-4 border-red-200 bg-red-50 text-sm text-red-700">{error}</div>}

      {!campaigns ? (
        <div className="mt-6 card p-10 text-center text-muted text-sm">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="mt-6 card p-12 text-center">
          <h2 className="font-semibold">No campaigns yet</h2>
          <p className="mt-1 text-sm text-muted">Describe a goal in plain English and Ping will run the whole loop.</p>
          <Link to="/app/campaigns/new" className="btn-primary mt-5">Create your first campaign</Link>
        </div>
      ) : (
        <div className="mt-6 card overflow-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-orange-50/70 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-5 py-3">Campaign</th>
                <th className="px-5 py-3">Channel</th>
                <th className="px-5 py-3 text-right">Audience</th>
                <th className="px-5 py-3 text-right">Delivered</th>
                <th className="px-5 py-3 text-right">Converted</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c._id} className="border-b border-line last:border-0 hover:bg-orange-50/30">
                  <td className="px-5 py-3">
                    <Link to={`/app/campaigns/${c._id}`} className="font-medium text-primary hover:underline">{c.name}</Link>
                    <div className="text-xs text-muted truncate max-w-xs">{c.goal}</div>
                  </td>
                  <td className="px-5 py-3">{c.channel}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{c.audienceSize.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{c.stats.delivered.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{c.stats.converted.toLocaleString()}</td>
                  <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3 whitespace-nowrap text-muted">{fmt(c.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDownloadMenu(downloadMenu === c._id ? null : c._id); }}
                          title="Download report"
                          className="rounded-lg border border-line p-2 text-muted transition hover:border-primary hover:text-primary"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                          </svg>
                        </button>
                        {downloadMenu === c._id && (
                          <div className="absolute right-0 mt-1 w-36 rounded-lg border border-line bg-white shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => download(c, "pdf")} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-orange-50 rounded-t-lg">Download PDF</button>
                            <button onClick={() => download(c, "excel")} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-orange-50 rounded-b-lg border-t border-line">Download Excel</button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(c); }}
                        title="Delete campaign"
                        className="rounded-lg border border-line p-2 text-muted transition hover:border-red-400 hover:text-red-500"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-ink">Delete campaign?</h2>
            <p className="mt-2 text-sm text-muted">
              This will permanently delete <span className="font-semibold text-ink">"{confirmDelete.name}"</span> and all its communication records. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</button>
              <button onClick={doDelete} disabled={deleting} className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50" style={{ background: "#dc2626" }}>
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}