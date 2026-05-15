import { useState, useCallback, useEffect } from "react";
import "./styles/index.css";

import { apiFetch } from "./api";
import Toast from "./components/Toast";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import TransferPage from "./pages/TransferPage";
import StatementsPage from "./pages/StatementsPage";

const NAV_ITEMS = [
  { id: "dashboard",  icon: "⊞", label: "Dashboard" },
  { id: "transfers",  icon: "⇄", label: "Transfers" },
  { id: "statements", icon: "◎", label: "Statements" },
];

const PAGE_TITLES = {
  dashboard:  "Dashboard",
  transfers:  "Transfers",
  statements: "Statements",
};

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("frl_token") || "");
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("frl_user") || "{}"); }
    catch { return {}; }
  });

  const [page, setPage]         = useState("dashboard");
  const [accounts, setAccounts] = useState([]);
  const [toast, setToast]       = useState(null);

  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type });
  }, []);

  const fetchAccounts = useCallback(async () => {
    if (!token) { setAccounts([]); return; }
    try {
      const res = await apiFetch("/Accounts/MyAccounts", {}, token);
      setAccounts(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
      setAccounts([]);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (token) fetchAccounts();
  }, [fetchAccounts, token]);

  function onAuth(t, u) {
    setToken(t);
    setUser(u);
    sessionStorage.setItem("frl_token", t);
    sessionStorage.setItem("frl_user", JSON.stringify(u));
  }

  function logout() {
    setToken("");
    setUser({});
    setAccounts([]);
    setPage("dashboard");
    sessionStorage.clear();
  }

  if (!token) return <AuthPage onAuth={onAuth} />;

  
  const displayName = accounts[0]?.fullName || user?.email?.split("@")[0] || "Freelancer";

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-text">Friilance</div>
          <div className="logo-dot" />
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item${page === item.id ? " active" : ""}`}
              onClick={() => setPage(item.id)}
              type="button"
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontSize: 11, color: "var(--text3)", padding: "0 2px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </div>
          <button className="logout-btn" onClick={logout} type="button">
            <span>⏻</span> Logout
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="page-title">{PAGE_TITLES[page]}</div>
          <div className="topbar-right">
            <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--mono)" }}>
              {accounts.length} account{accounts.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {page === "dashboard" && (
          <DashboardPage
            accounts={accounts}
            token={token}
            onRefresh={fetchAccounts}
            showToast={showToast}
          />
        )}

        {page === "transfers" && (
          <TransferPage
            accounts={accounts}
            token={token}
            showToast={showToast}
            onRefresh={fetchAccounts}
          />
        )}

        {page === "statements" && (
          <StatementsPage
            accounts={accounts}
            token={token}
          />
        )}
      </main>

      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
