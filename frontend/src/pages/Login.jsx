import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  function signIn() {
    localStorage.setItem("ping_user", JSON.stringify({ name: "Sarah", role: "Marketing Manager" }));
    navigate("/app/dashboard");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8" style={{ background: "#fdf8f4" }}>
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <img src="/Ping_Logo_nobg.png" alt="Ping" style={{ height: 200, objectFit: "contain", transform: "rotate(90deg)" }} />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted">Sign in to your Saffron Cafe workspace.</p>

          <div className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" className="input" defaultValue="sarah@saffroncafe.in" readOnly />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" className="input" defaultValue="demo-password" readOnly />
            </div>
            <button onClick={signIn} className="btn-primary w-full">Sign in</button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-col justify-center p-14 text-white" style={{ background: "linear-gradient(135deg,#f4480a 0%,#e8176a 100%)" }}>
        <p className="text-sm font-semibold uppercase tracking-widest text-white/70">AI campaign copilot</p>
        <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight">
          State the goal.<br />Ping runs the campaign.
        </h2>
        <p className="mt-5 max-w-md text-white/80 leading-relaxed">
          Describe an audience in plain English. Ping builds the segment, drafts the message, sends it through the channel service, and explains what happened.
        </p>
        <div className="mt-10 rounded-xl bg-white/10 border border-white/15 p-5 max-w-md">
          <p className="text-xs uppercase tracking-wide text-white/60 font-semibold">Try a goal like</p>
          <p className="mt-2 font-medium">"Win back biryani buyers who ordered twice but haven't this week"</p>
        </div>
      </div>
    </div>
  );
}