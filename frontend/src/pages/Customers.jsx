import { useEffect, useState, useRef } from "react";
import { api } from "../api.js";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const CITIES = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Kolkata", "Pune"];
const ITEMS = ["Biryani", "Filter Coffee", "Gulab Jamun", "Masala Dosa", "Paneer Tikka", "Cold Coffee", "Pizza"];

export default function Customers() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  // Add customer modal
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "Chennai", favItem: "Filter Coffee", tags: "new" });

  // AI chat
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([{ role: "ai", text: "Hi! Ask me anything about your customers — popular food items, top spenders, cities, tags, and more." }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEnd = useRef(null);

  function load() {
    setData(null);
    api.customers({ page, search: query }).then(setData).catch((e) => setError(e.message));
  }
  useEffect(() => { load(); }, [page, query]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatLoading]);

  async function addCustomer() {
    setAdding(true);
    setError("");
    try {
      await api.addCustomer(form);
      setShowAdd(false);
      setForm({ name: "", email: "", phone: "", city: "Chennai", favItem: "Filter Coffee", tags: "new" });
      setQuery(""); setPage(1); load();
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  }

  async function sendChat() {
    const q = chatInput.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const { answer } = await api.customerChat(q);
      setMessages((m) => [...m, { role: "ai", text: answer }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "ai", text: `Sorry, I couldn't answer that: ${e.message}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  const SUGGESTIONS = ["What food items do customers order?", "Who are the top spenders?", "Which cities have the most customers?"];

  return (
    <div>
      {/* Gradient header */}
      <div className="rounded-2xl p-6 text-white mb-6 flex items-center justify-between flex-wrap gap-4" style={{ background: "linear-gradient(135deg,#f4480a,#e8176a)" }}>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-white/85">Everyone Saffron Cafe can reach, with live order aggregates.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowChat(true)} className="inline-flex items-center gap-2 rounded-lg bg-white/15 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            Ask AI
          </button>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-white/90" style={{ color: "#e8176a" }}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14" /></svg>
            Add customer
          </button>
        </div>
      </div>

      {/* Stat cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="card p-4"><div className="text-xs font-semibold uppercase tracking-wide text-muted">Total customers</div><div className="mt-1 text-2xl font-bold text-ink">{data.total.toLocaleString()}</div></div>
          <div className="card p-4"><div className="text-xs font-semibold uppercase tracking-wide text-muted">Showing page</div><div className="mt-1 text-2xl font-bold text-ink">{data.page} / {data.pages}</div></div>
          <div className="card p-4"><div className="text-xs font-semibold uppercase tracking-wide text-muted">On this page</div><div className="mt-1 text-2xl font-bold text-ink">{data.items.length}</div></div>
          <div className="card p-4"><div className="text-xs font-semibold uppercase tracking-wide text-muted">Total reach</div><div className="mt-1 text-2xl font-bold text-ink">{data.total.toLocaleString()}</div></div>
        </div>
      )}

      <div className="flex gap-2 max-w-md">
        <input className="input" placeholder="Search name, email, city or favourite item" value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(1), setQuery(search))} />
        <button className="btn-secondary" onClick={() => (setPage(1), setQuery(search))}>Search</button>
      </div>

      {error && <div className="mt-6 card p-4 border-red-200 bg-red-50 text-sm text-red-700">{error}</div>}

      <div className="mt-6 card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-orange-50/70 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">City</th>
              <th className="px-5 py-3">Favourite</th>
              <th className="px-5 py-3 text-right">Orders</th>
              <th className="px-5 py-3 text-right">Spend</th>
              <th className="px-5 py-3">Last order</th>
              <th className="px-5 py-3">Tags</th>
            </tr>
          </thead>
          <tbody>
            {!data ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-muted">Loading customers...</td></tr>
            ) : data.items.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-muted">No customers match that search.</td></tr>
            ) : (
              data.items.map((c) => (
                <tr key={c._id} className="border-b border-line last:border-0 hover:bg-orange-50/30">
                  <td className="px-5 py-3"><div className="font-medium">{c.name}</div><div className="text-xs text-muted">{c.email}</div></td>
                  <td className="px-5 py-3">{c.city}</td>
                  <td className="px-5 py-3">{c.favItem}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{c.orderCount}</td>
                  <td className="px-5 py-3 text-right tabular-nums">₹{c.totalSpend.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3 whitespace-nowrap">{fmtDate(c.lastOrderAt)}</td>
                  <td className="px-5 py-3"><div className="flex flex-wrap gap-1">{c.tags.map((t) => (<span key={t} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "rgba(244,72,10,0.08)", color: "#f4480a" }}>{t}</span>))}</div></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>Page {data.page} of {data.pages} · {data.total.toLocaleString()} customers</span>
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="btn-secondary" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      {/* Add customer modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => !adding && setShowAdd(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-ink mb-4">Add customer</h2>
            <div className="space-y-3">
              <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="label">Email</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">City</label><select className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></div>
                <div><label className="label">Favourite item</label><select className="input" value={form.favItem} onChange={(e) => setForm({ ...form, favItem: e.target.value })}>{ITEMS.map((i) => <option key={i}>{i}</option>)}</select></div>
              </div>
              <div><label className="label">Tags (comma separated)</label><input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="new, vip" /></div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowAdd(false)} disabled={adding}>Cancel</button>
              <button className="btn-primary" onClick={addCustomer} disabled={adding || !form.name || !form.email || !form.phone}>{adding ? "Adding..." : "Add customer"}</button>
            </div>
          </div>
        </div>
      )}

      {/* AI chat drawer */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowChat(false)}>
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 text-white flex items-center justify-between" style={{ background: "linear-gradient(135deg,#f4480a,#e8176a)" }}>
              <div>
                <h2 className="font-bold">Customer AI</h2>
                <p className="text-xs text-white/85">Ask about your customer base</p>
              </div>
              <button onClick={() => setShowChat(false)} className="text-white/90 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "text-white" : "text-ink"}`}
                    style={{ background: m.role === "user" ? "linear-gradient(135deg,#f4480a,#e8176a)" : "#fdf8f4", border: m.role === "ai" ? "1px solid #f0e4df" : "none" }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && <div className="text-sm text-muted">Thinking...</div>}
              <div ref={chatEnd} />
            </div>
            <div className="p-3 border-t border-line">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => setChatInput(s)} className="rounded-full border border-line px-2.5 py-1 text-[11px] text-muted hover:border-primary hover:text-primary">{s}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="input" placeholder="Ask about customers..." value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} />
                <button className="btn-primary" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>Send</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}