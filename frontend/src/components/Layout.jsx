import { NavLink, Outlet, useNavigate } from "react-router-dom";

const navItems = [
  { to: "/app/dashboard", label: "Dashboard", icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" },
  { to: "/app/campaigns/new", label: "New campaign", icon: "M12 5v14m-7-7h14" },
  { to: "/app/campaigns", label: "Campaigns", icon: "M3 11l18-8-8 18-2-8-8-2z" },
  { to: "/app/customers", label: "Customers", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" }
];

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("ping_user") || "{}");

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-line bg-white flex flex-col">
        <div className="px-5 py-6 border-b border-line flex justify-center">
  <img src="/Ping_Logo_nobg.png" alt="Ping" style={{ height: 100, objectFit: "contain", transform: "rotate(90deg)" }} />
</div>
        

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app/campaigns"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-primary-light text-primary" : "text-muted hover:bg-orange-50 hover:text-ink"
                }`
              }
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-line">
          <div className="text-sm font-semibold text-ink">{user.name || "Sarah"}</div>
          <div className="text-xs text-muted">{user.role || "Marketing Manager"} · Saffron Cafe</div>
          <button
            onClick={() => { localStorage.removeItem("ping_user"); navigate("/login"); }}
            className="mt-2 text-xs font-medium text-primary hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0" style={{ background:"#fdf8f4" }}>
        <div className="max-w-7xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}