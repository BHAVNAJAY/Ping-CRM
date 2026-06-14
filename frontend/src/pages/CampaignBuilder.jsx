import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import FilterChips from "../components/FilterChips.jsx";
import { useToast } from "../App.jsx";

const EXAMPLES = [
  "Win back biryani buyers who ordered twice but haven't this week",
  "Thank our VIPs in Chennai with an exclusive tasting invite",
  "Nudge dormant customers who spent over 1000 to come back",
  "Welcome new customers who joined this month"
];

const CHANNELS = ["WhatsApp", "SMS", "Email"];

const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 8; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? "AM" : "PM";
      slots.push({ label: `${hh}:${String(m).padStart(2, "0")} ${ampm}`, hour: h, minute: m });
    }
  }
  slots.push({ label: "12:00 AM", hour: 0, minute: 0 });
  return slots;
})();

const todayStr = () => new Date().toISOString().slice(0, 10);
const buildISO = (dateStr, hour, minute) => {
  const d = new Date(dateStr);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

function StepDot({ n, active, done, label }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition"
        style={{
          background: done || active ? "linear-gradient(135deg,#f4480a,#e8176a)" : "#f0e4df",
          color: done || active ? "#fff" : "#7a5a52"
        }}
      >
        {done ? "✓" : n}
      </div>
      <span className="text-xs font-medium" style={{ color: active || done ? "#1a0805" : "#7a5a52" }}>{label}</span>
    </div>
  );
}

export default function CampaignBuilder() {
  const navigate = useNavigate();
  const addToast = useToast();

  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState(null);
  const [channel, setChannel] = useState("WhatsApp");
  const [message, setMessage] = useState("");
  const [messageSource, setMessageSource] = useState("");
  const [name, setName] = useState("");

  const [sendTimeData, setSendTimeData] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(todayStr());
  const [scheduleSlot, setScheduleSlot] = useState(null);
  const [sendMode, setSendMode] = useState(null);

  const [building, setBuilding] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [fetchingTime, setFetchingTime] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");

  const step = !audience ? 1 : !message ? 2 : !sendTimeData ? 3 : 4;

  async function buildAudience(goalText) {
    const g = (goalText ?? goal).trim();
    if (!g) return;
    setError(""); setBuilding(true); setAudience(null); setMessage(""); setSendTimeData(null); setSendMode(null);
    try {
      setAudience(await api.previewSegment({ goal: g }));
    } catch (e) { setError(e.message); } finally { setBuilding(false); }
  }

  async function draft(ch = channel) {
    setError(""); setDrafting(true);
    try {
      const r = await api.draftMessage({ goal, filter: audience.filter, channel: ch });
      setMessage(r.message); setMessageSource(r.source);
    } catch (e) { setError(e.message); } finally { setDrafting(false); }
  }

  async function fetchSendTime() {
    setError(""); setFetchingTime(true);
    try {
      const r = await api.suggestSendTime({ goal, channel });
      setSendTimeData(r);
      const sug = new Date(r.suggestedAt);
      const slot = TIME_SLOTS.find((s) => s.hour === sug.getHours() && s.minute === sug.getMinutes())
        || TIME_SLOTS.reduce((b, s) => Math.abs(s.hour * 60 + s.minute - (sug.getHours() * 60 + sug.getMinutes())) < Math.abs(b.hour * 60 + b.minute - (sug.getHours() * 60 + sug.getMinutes())) ? s : b, TIME_SLOTS[0]);
      setScheduleSlot(slot);
      setScheduleDate(sug.toISOString().slice(0, 10));
    } catch (e) { setError(e.message); } finally { setFetchingTime(false); }
  }

  async function launch() {
    setError(""); setLaunching(true);
    try {
      const campaign = await api.createCampaign({ name: name.trim() || undefined, goal, filter: audience.filter, channel, message });
      if (sendMode === "now") {
        await api.sendCampaign(campaign._id);
        addToast(`"${campaign.name}" sent to ${audience.count.toLocaleString()} customers!`);
      } else {
        await api.scheduleCampaign(campaign._id, buildISO(scheduleDate, scheduleSlot.hour, scheduleSlot.minute));
        addToast(`"${campaign.name}" scheduled for ${scheduleSlot.label}`);
      }
      navigate(`/app/campaigns/${campaign._id}`);
    } catch (e) { setError(e.message); setLaunching(false); }
  }

  return (
    <div className="max-w-7xl">
      {/* Header with step indicator */}
      <div className="rounded-2xl p-6 text-white mb-6" style={{ background: "linear-gradient(135deg,#f4480a,#e8176a)" }}>
        <h1 className="text-2xl font-extrabold tracking-tight">New campaign</h1>
        <p className="mt-1 text-sm text-white/85">State the goal in plain English. Ping builds the audience, drafts the message, picks the time, and sends.</p>
      </div>

      <div className="card p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
        <StepDot n={1} active={step === 1} done={step > 1} label="Audience" />
        <div className="h-px flex-1 mx-2" style={{ background: "#f0e4df", minWidth: 20 }} />
        <StepDot n={2} active={step === 2} done={step > 2} label="Message" />
        <div className="h-px flex-1 mx-2" style={{ background: "#f0e4df", minWidth: 20 }} />
        <StepDot n={3} active={step === 3} done={step > 3} label="Send time" />
        <div className="h-px flex-1 mx-2" style={{ background: "#f0e4df", minWidth: 20 }} />
        <StepDot n={4} active={step === 4} done={false} label="Launch" />
      </div>

      {/* Step 1 - goal */}
      <div className="card p-6">
        <label className="label" htmlFor="goal">Campaign goal, in plain English</label>
        <textarea
          id="goal" rows={2} className="input resize-none text-base"
          placeholder='e.g. "biryani buyers who ordered twice but haven&apos;t this week"'
          value={goal} onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); buildAudience(); } }}
        />
        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => { setGoal(ex); buildAudience(ex); }}
                className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-primary hover:text-primary">
                {ex.length > 44 ? ex.slice(0, 44) + "..." : ex}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => buildAudience()} disabled={building || !goal.trim()}>
            {building ? "Building audience..." : "Build audience"}
          </button>
        </div>
      </div>

      {error && <div className="mt-4 card border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Step 2 - audience */}
      {audience && (
        <div className="mt-6 card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">Audience</div>
              <div className="mt-1.5 text-3xl font-bold tracking-tight">
                {audience.count.toLocaleString()} <span className="text-base font-medium text-muted">customers</span>
              </div>
              <p className="mt-1 text-sm text-muted">{audience.description}</p>
            </div>
            <span className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(244,72,10,0.08)", color: "#f4480a" }}>
              {audience.source === "ai" ? "Built by AI" : audience.source === "rules" ? "Rule parser" : "Manual filter"}
            </span>
          </div>
          <div className="mt-4"><FilterChips filter={audience.filter} /></div>
          {audience.sample.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Sample of who this reaches</div>
              <div className="grid gap-1.5">
                {audience.sample.map((c) => (
                  <div key={c._id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted">{c.city} · {c.favItem} · {c.orderCount} orders</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {audience.count === 0 ? (
            <p className="mt-4 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">No customers match. Try widening the goal.</p>
          ) : !message && (
            <div className="mt-5 flex items-center gap-3">
              <select className="input w-auto" value={channel} onChange={(e) => setChannel(e.target.value)}>
                {CHANNELS.map((c) => <option key={c}>{c}</option>)}
              </select>
              <button className="btn-primary" onClick={() => draft()} disabled={drafting}>
                {drafting ? "Drafting message..." : "Draft the message"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3 - message */}
      {audience && message && (
        <div className="mt-6 card p-6">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Message · {channel}</div>
            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(232,23,106,0.08)", color: "#e8176a" }}>
              {messageSource === "ai" ? "Drafted by AI" : "Template"}
            </span>
          </div>
          <textarea rows={channel === "Email" ? 8 : 4} className="input mt-3 font-normal" value={message} onChange={(e) => setMessage(e.target.value)} />
          <p className="mt-2 text-xs text-muted">
            <code className="rounded bg-orange-50 px-1.5 py-0.5 font-mono">{"{name}"}</code> is replaced with each customer's first name at send time.
            {!message.includes("{name}") && <span className="text-amber-700"> Tip: add {"{name}"} back for personalisation.</span>}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <select className="input w-auto" value={channel} onChange={(e) => { setChannel(e.target.value); draft(e.target.value); }}>
              {CHANNELS.map((c) => <option key={c}>{c}</option>)}
            </select>
            <button className="btn-secondary" onClick={() => draft()} disabled={drafting}>{drafting ? "Redrafting..." : "Redraft"}</button>
          </div>

          {/* Step 4 - send time */}
          {!sendTimeData ? (
            <div className="mt-6 border-t border-line pt-5">
              <button className="btn-primary" onClick={fetchSendTime} disabled={fetchingTime}>
                {fetchingTime ? "Analysing best send time..." : "Suggest best send time"}
              </button>
              <p className="mt-2 text-xs text-muted">Ping analyses your campaign type and recommends the best time to reach this audience.</p>
            </div>
          ) : (
            <div className="mt-6 border-t border-line pt-5">
              <div className="rounded-xl p-4 mb-5" style={{ background: "rgba(244,72,10,0.05)", border: "1px solid rgba(244,72,10,0.2)" }}>
                <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#f4480a" }}>{sendTimeData.label} · AI Suggestion</div>
                <div className="text-lg font-bold text-ink">{sendTimeData.displayTime}</div>
                <p className="mt-1 text-sm text-muted">{sendTimeData.reason}</p>
                {sendTimeData.channelNote && <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{sendTimeData.channelNote}</p>}
              </div>
              <div className="flex gap-3 mb-5">
                <button onClick={() => setSendMode("now")} className="flex-1 rounded-xl border-2 p-3 text-sm font-semibold transition"
                  style={{ borderColor: sendMode === "now" ? "#f4480a" : "#f0e4df", background: sendMode === "now" ? "linear-gradient(135deg,#f4480a,#e8176a)" : "#fff", color: sendMode === "now" ? "#fff" : "#1a0805" }}>
                  Send now
                </button>
                <button onClick={() => setSendMode("schedule")} className="flex-1 rounded-xl border-2 p-3 text-sm font-semibold transition"
                  style={{ borderColor: sendMode === "schedule" ? "#f4480a" : "#f0e4df", background: sendMode === "schedule" ? "linear-gradient(135deg,#f4480a,#e8176a)" : "#fff", color: sendMode === "schedule" ? "#fff" : "#1a0805" }}>
                  Schedule for later
                </button>
              </div>
              {sendMode === "schedule" && scheduleSlot && (
                <div className="rounded-xl border border-line p-4 mb-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Pick date and time</div>
                  <div className="flex gap-3 flex-wrap">
                    <input type="date" className="input w-auto" value={scheduleDate} min={todayStr()} onChange={(e) => setScheduleDate(e.target.value)} />
                    <select className="input w-auto" value={`${scheduleSlot.hour}:${scheduleSlot.minute}`}
                      onChange={(e) => { const [h, m] = e.target.value.split(":").map(Number); setScheduleSlot(TIME_SLOTS.find((s) => s.hour === h && s.minute === m)); }}>
                      {TIME_SLOTS.map((s) => <option key={s.label} value={`${s.hour}:${s.minute}`}>{s.label}</option>)}
                    </select>
                  </div>
                  <p className="mt-2 text-xs text-muted">Campaign will fire automatically at the scheduled time.</p>
                </div>
              )}
              {sendMode && (
                <div>
                  <label className="label" htmlFor="name">Campaign name (optional)</label>
                  <div className="flex gap-3">
                    <input id="name" className="input" placeholder={goal.slice(0, 60) || "Campaign name"} value={name} onChange={(e) => setName(e.target.value)} />
                    <button className="btn-primary shrink-0" onClick={launch} disabled={launching || !message.trim()}>
                      {launching ? "Launching..." : sendMode === "now" ? `Send to ${audience.count.toLocaleString()}` : `Schedule for ${scheduleSlot?.label}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}