import { useNavigate } from "react-router-dom";

const FEATURES = [
  { icon: "🎯", title: "AI Audience Builder", desc: "Describe your audience in plain English. Ping converts it into a precise customer segment — no SQL, no filters.", tag: "Natural language" },
  { icon: "✍️", title: "AI Message Drafting", desc: "Get a channel-appropriate, personalised message drafted instantly. Tweak it or send it — your call.", tag: "Per-customer personalisation" },
  { icon: "⏰", title: "Smart Send-Time Optimizer", desc: "Ping analyses your campaign type and audience ordering patterns to recommend the best send window.", tag: "Playbook-backed" },
  { icon: "📅", title: "Campaign Scheduling", desc: "Accept the suggested time or pick your own. Ping fires the campaign automatically at the scheduled moment.", tag: "Auto-fire" },
  { icon: "📊", title: "Live Analytics Funnel", desc: "Watch sent, delivered, opened, clicked, and converted update in real time as callbacks stream in.", tag: "Real-time" },
  { icon: "💡", title: "AI Post-Campaign Insights", desc: "After a campaign, Ping explains what worked, what didn't, and gives one concrete next recommendation.", tag: "Actionable" },
];

const STEPS = [
  { n: "1", title: "State your goal", desc: "Type what you want to achieve in plain English. No forms, no filter dropdowns." },
  { n: "2", title: "AI builds the audience", desc: "Ping converts your goal into a live customer segment with a count and sample preview." },
  { n: "3", title: "Draft, schedule, send", desc: "AI writes the message, suggests the best time, and fires the campaign at the right moment." },
  { n: "4", title: "Watch and learn", desc: "Track your funnel live and get an AI-written post-campaign analysis with a next step." },
];

const PLANS = [
  {
    tier: "Starter", price: "₹0", period: "/mo", featured: false,
    desc: "Perfect for small cafes getting started with data-driven campaigns.",
    features: ["Up to 500 customer profiles", "3 campaigns per month", "AI audience builder", "WhatsApp & SMS channels"],
    missing: ["AI message drafting", "Send-time optimizer", "AI insights"],
    cta: "Get started free"
  },
  {
    tier: "Growth", price: "₹2,999", period: "/mo", featured: true,
    desc: "For growing brands that want the full AI campaign loop — from audience to insight.",
    features: ["Up to 10,000 customer profiles", "Unlimited campaigns", "AI audience builder", "WhatsApp, SMS & Email", "AI message drafting", "Send-time optimizer & scheduling", "AI post-campaign insights"],
    missing: [],
    cta: "Start free trial"
  },
  {
    tier: "Enterprise", price: "Custom", period: "", featured: false,
    desc: "For large retail chains with complex data, multiple locations, and volume needs.",
    features: ["Unlimited profiles & campaigns", "All Growth features", "Dedicated onboarding", "Custom channel integrations", "SLA & priority support"],
    missing: [],
    cta: "Contact sales"
  },
];

export default function Landing() {
  const navigate = useNavigate();

  function goToApp() { navigate("/login"); }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#fdf8f4", color: "#1a0805", minHeight: "100vh" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .grad-text { background: linear-gradient(135deg,#f4480a,#e8176a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .grad-bg { background: linear-gradient(135deg,#f4480a,#e8176a); }
        .pill { display:inline-block; background:rgba(244,72,10,0.08); border:1px solid rgba(244,72,10,0.2); color:#f4480a; font-size:0.72rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; padding:0.3rem 0.85rem; border-radius:100px; margin-bottom:1rem; }
        .btn-main { border:none; cursor:pointer; padding:0.85rem 2rem; border-radius:10px; font-size:1rem; font-weight:700; color:#fff; transition:opacity .2s,transform .2s; }
        .btn-main:hover { opacity:.88; transform:translateY(-1px); }
        .btn-outline { background:transparent; border:1.5px solid rgba(26,8,5,0.15); color:#1a0805; padding:0.85rem 2rem; border-radius:10px; font-size:1rem; font-weight:600; cursor:pointer; transition:border-color .2s,transform .2s; }
        .btn-outline:hover { border-color:rgba(244,72,10,0.4); transform:translateY(-1px); }
        .card { background:#fff; border:1px solid #f0e4df; border-radius:16px; padding:2rem; transition:border-color .25s,transform .25s; }
        .card:hover { border-color:rgba(244,72,10,0.3); transform:translateY(-3px); }
        .section { padding:90px 6vw; }
        .eyebrow { font-size:0.72rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:#f4480a; margin-bottom:0.75rem; }
        .section-title { font-size:clamp(1.75rem,3.5vw,2.6rem); font-weight:800; letter-spacing:-0.025em; line-height:1.15; margin-bottom:1rem; }
        .section-sub { font-size:1rem; color:#7a5a52; max-width:500px; line-height:1.7; }
        .divider { border:none; border-top:1px solid #f0e4df; margin:0 6vw; }
        @media(max-width:800px){ .features-grid{grid-template-columns:1fr 1fr!important} .pricing-grid{grid-template-columns:1fr!important;max-width:400px;margin:0 auto} .about-grid{grid-template-columns:1fr!important} .how-steps{grid-template-columns:1fr 1fr!important} .nav-links{display:none!important} }
        @media(max-width:500px){ .features-grid{grid-template-columns:1fr!important} .how-steps{grid-template-columns:1fr!important} }
      `}</style>

      {/* NAV */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 6vw", height:64, background:"rgba(253,248,244,0.92)", backdropFilter:"blur(16px)", borderBottom:"1px solid #f0e4df" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src="/Ping_Logo_nobg.png" alt="Ping" style={{ height:95, objectFit:"contain", transform:"rotate(90deg)"}} />
        </div>
        <div className="nav-links" style={{ display:"flex", alignItems:"center", gap:"2rem" }}>
          {["About","Features","How it works","Pricing"].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g,"-")}`} style={{ color:"#7a5a52", textDecoration:"none", fontSize:"0.875rem", fontWeight:500 }}>{l}</a>
          ))}
        </div>
        <button className="grad-bg btn-main" style={{ padding:"0.45rem 1.1rem", fontSize:"0.875rem", borderRadius:8 }} onClick={goToApp}>Open app</button>
      </nav>

      {/* HERO */}
      {/* HERO */}
<section style={{ paddingTop:64, textAlign:"center", position:"relative", overflow:"hidden" }}>
  {/* Full width video */}
  <div style={{ width:"100%", position:"relative", boxShadow:"0 24px 80px rgba(244,72,10,0.12)", borderBottom:"1px solid rgba(244,72,10,0.15)" }}>
    <video
      autoPlay
      muted
      loop
      playsInline
      style={{ width:"100%", display:"block", maxHeight:540, objectFit:"cover" }}
    >
      <source src="/pingvid.mp4" type="video/mp4" />
    </video>
  </div>

  {/* Text content below video */}
  <div style={{ padding:"80px 6vw 90px", position:"relative" }}>
    <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:600, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(244,72,10,0.08) 0%,rgba(232,23,106,0.05) 40%,transparent 70%)", pointerEvents:"none" }} />
    <div style={{ position:"relative", maxWidth:680, margin:"0 auto" }}>
      <div className="pill">AI-Native Mini CRM</div>
      <h1 style={{ fontSize:"clamp(2.4rem,5.5vw,4.5rem)", fontWeight:900, lineHeight:1.06, letterSpacing:"-0.03em", marginBottom:"1.5rem" }}>
        Reach the right people.<br /><span className="grad-text">Every single time.</span>
      </h1>
      <p style={{ fontSize:"clamp(1rem,1.8vw,1.15rem)", color:"#7a5a52", maxWidth:520, margin:"0 auto 2.5rem", lineHeight:1.75 }}>
        Ping helps food and retail brands decide who to talk to, what to say, and when to say it — powered by AI that understands your customers.
      </p>
      <div style={{ display:"flex", gap:"1rem", justifyContent:"center", flexWrap:"wrap", marginBottom:"3.5rem" }}>
        <button className="grad-bg btn-main" onClick={goToApp}>Start a campaign</button>
        <a href="#features" style={{ textDecoration:"none" }}><button className="btn-outline">See how it works</button></a>
      </div>
      <div style={{ display:"flex", gap:"3rem", justifyContent:"center", flexWrap:"wrap" }}>
        {[["1,500+","Customer profiles"],["3","AI-powered steps"],["97%","Delivery accuracy"]].map(([n,l]) => (
          <div key={l}>
            <div style={{ fontSize:"2rem", fontWeight:900, letterSpacing:"-0.03em" }} className="grad-text">{n}</div>
            <div style={{ fontSize:"0.8rem", color:"#7a5a52", marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
</section>

      <hr className="divider" />

      {/* ABOUT */}
      <section id="about" className="section">
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div className="eyebrow">About Ping</div>
          <div className="about-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4rem", alignItems:"center", marginTop:"2.5rem" }}>
            <div>
              <h2 className="section-title">Marketing intelligence for brands that care about every customer</h2>
              <p className="section-sub">Most CRMs store data. Ping acts on it. We help marketers at cafes, restaurants, and D2C brands stop guessing and start reaching the shoppers most likely to respond — at the moment they're most likely to buy.</p>
              <p className="section-sub" style={{ marginTop:"1rem" }}>Built for the Saffron Cafe demo, but designed for any brand that wants AI-native campaign intelligence without the enterprise price tag.</p>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.85rem" }}>
              {["AI audience builder — type a goal, Ping finds the right segment","Smart send-time optimizer — recommends best time from real order history","Live campaign analytics — delivery, opens, clicks update in real time","AI post-campaign insights — plain-English explanation of what to do next"].map(t => (
                <div key={t} style={{ background:"rgba(244,72,10,0.05)", border:"1px solid rgba(244,72,10,0.15)", borderRadius:12, padding:"1rem 1.25rem", display:"flex", gap:"0.75rem", alignItems:"flex-start" }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:"linear-gradient(135deg,#f4480a,#e8176a)", flexShrink:0, marginTop:4 }} />
                  <p style={{ fontSize:"0.875rem", color:"#1a0805", fontWeight:500 }}>{t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* FEATURES */}
      <section id="features" className="section">
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div className="eyebrow">Features</div>
          <h2 className="section-title">Everything a modern marketer needs</h2>
          <p className="section-sub" style={{ marginBottom:"3rem" }}>Four tightly-integrated AI features covering the full campaign lifecycle.</p>
          <div className="features-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1.25rem" }}>
            {FEATURES.map(f => (
              <div key={f.title} className="card">
                <div style={{ fontSize:"1.5rem", marginBottom:"1rem", width:44, height:44, background:"rgba(244,72,10,0.07)", border:"1px solid rgba(244,72,10,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center" }}>{f.icon}</div>
                <h3 style={{ fontSize:"0.95rem", fontWeight:700, marginBottom:"0.5rem" }}>{f.title}</h3>
                <p style={{ fontSize:"0.85rem", color:"#7a5a52", lineHeight:1.65, marginBottom:"0.85rem" }}>{f.desc}</p>
                <span style={{ fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", background:"rgba(244,72,10,0.08)", border:"1px solid rgba(244,72,10,0.2)", color:"#f4480a", padding:"0.2rem 0.6rem", borderRadius:6 }}>{f.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="section">
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div className="eyebrow">How it works</div>
          <h2 className="section-title">From goal to insight in four steps</h2>
          <div className="how-steps" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"2rem", marginTop:"3rem" }}>
            {STEPS.map(s => (
              <div key={s.n} style={{ textAlign:"center" }}>
                <div className="grad-bg" style={{ width:52, height:52, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 1.25rem", color:"#fff", fontSize:"1.1rem", fontWeight:800, boxShadow:"0 0 20px rgba(244,72,10,0.3)" }}>{s.n}</div>
                <h4 style={{ fontSize:"0.95rem", fontWeight:700, marginBottom:"0.5rem" }}>{s.title}</h4>
                <p style={{ fontSize:"0.82rem", color:"#7a5a52", lineHeight:1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* PRICING */}
      <section id="pricing" className="section">
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div className="eyebrow">Pricing</div>
          <h2 className="section-title">Simple, transparent pricing</h2>
          <p className="section-sub" style={{ marginBottom:"3rem" }}>Start free, scale when you're ready. No per-seat surprises.</p>
          <div className="pricing-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1.5rem", alignItems:"stretch" }}>
            {PLANS.map(p => (
              <div key={p.tier} style={{ background:"#fff", border:`1.5px solid ${p.featured ? "rgba(244,72,10,0.45)" : "#f0e4df"}`, borderRadius:20, padding:"2.5rem 2rem", position:"relative", background: p.featured ? "linear-gradient(160deg,rgba(244,72,10,0.04),rgba(232,23,106,0.04))" : "#fff" }}>
                {p.featured && <div className="grad-bg" style={{ position:"absolute", top:-13, left:"50%", transform:"translateX(-50%)", color:"#fff", fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", padding:"0.3rem 1rem", borderRadius:100, whiteSpace:"nowrap" }}>Most popular</div>}
                <div style={{ fontSize:"0.78rem", fontWeight:700, color:"#7a5a52", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"0.6rem" }}>{p.tier}</div>
                <div style={{ fontSize: p.price === "Custom" ? "2rem" : "2.6rem", fontWeight:900, letterSpacing:"-0.04em", lineHeight:1, marginBottom:"0.2rem", ...(p.featured ? {} : {}) }}>
                  {p.featured ? <span className="grad-text">{p.price}</span> : p.price}
                  <span style={{ fontSize:"0.85rem", fontWeight:500, color:"#7a5a52" }}>{p.period}</span>
                </div>
                <p style={{ fontSize:"0.875rem", color:"#7a5a52", margin:"0.75rem 0 1.5rem", lineHeight:1.6 }}>{p.desc}</p>
                <hr style={{ border:"none", borderTop:"1px solid #f0e4df", marginBottom:"1.5rem" }} />
                <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:"0.65rem", marginBottom:"2rem" }}>
                  {p.features.map(f => <li key={f} style={{ display:"flex", gap:"0.6rem", fontSize:"0.875rem", alignItems:"flex-start" }}><span style={{ color:"#f4480a", fontWeight:800, flexShrink:0 }}>✓</span>{f}</li>)}
                  {p.missing.map(f => <li key={f} style={{ display:"flex", gap:"0.6rem", fontSize:"0.875rem", color:"#c4a99f", alignItems:"flex-start" }}><span style={{ flexShrink:0 }}>–</span>{f}</li>)}
                </ul>
                <button onClick={goToApp} style={{ width:"100%", padding:"0.85rem", borderRadius:10, fontSize:"0.9rem", fontWeight:700, cursor:"pointer", border: p.featured ? "none" : "1.5px solid #f0e4df", color: p.featured ? "#fff" : "#1a0805", background: p.featured ? "linear-gradient(135deg,#f4480a,#e8176a)" : "transparent", transition:"opacity .2s" }} onMouseOver={e=>e.target.style.opacity=0.85} onMouseOut={e=>e.target.style.opacity=1}>{p.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding:"2.5rem 6vw", borderTop:"1px solid #f0e4df", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"1rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <img src="/Ping_Logo_nobg.png" alt="Ping" style={{ height:90, objectFit:"contain", transform:"rotate(90deg)" }} />
        </div>
        <p style={{ fontSize:"0.8rem", color:"#7a5a52" }}>Ping - Reach the right people . 2026</p>
        <p style={{ fontSize:"0.8rem", color:"#7a5a52" }}>© 2026 Ping. All rights reserved.</p>
      </footer>
    </div>
  );
}