import { useState, createContext, useContext } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CampaignBuilder from "./pages/CampaignBuilder.jsx";
import Campaigns from "./pages/Campaigns.jsx";
import CampaignDetail from "./pages/CampaignDetail.jsx";
import Customers from "./pages/Customers.jsx";

export const ToastContext = createContext(null);
export function useToast() { return useContext(ToastContext); }

function RequireLogin({ children }) {
  const location = useLocation();
  const user = localStorage.getItem("ping_user");
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  const [toasts, setToasts] = useState([]);

  function addToast(message, type = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }

  return (
    <ToastContext.Provider value={addToast}>
      <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:8, pointerEvents:"none" }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding:"0.75rem 1.25rem", borderRadius:12, color:"#fff", fontSize:"0.875rem", fontWeight:600, background: t.type === "success" ? "linear-gradient(135deg,#f4480a,#e8176a)" : "#dc2626", boxShadow:"0 4px 16px rgba(0,0,0,0.15)" }}>
            {t.message}
          </div>
        ))}
      </div>

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/app/*"
          element={
            <RequireLogin>
              <Layout />
            </RequireLogin>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="campaigns/new" element={<CampaignBuilder />} />
          <Route path="campaigns/:id" element={<CampaignDetail />} />
          <Route path="customers" element={<Customers />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastContext.Provider>
  );
}