import { useState } from "react";
import { apiFetch } from "../api";
import myImage from "../assets/auth.jpg";



export default function AuthPage({ onAuth }) {
  const [tab, setTab]     = useState("login");
  const [form, setForm]   = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "login") {
        const res = await apiFetch("/Authentication/login", {
          method: "POST",
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        onAuth(res.token, { email: res.email });
      } else {
        await apiFetch("/Authentication/register", {
          method: "POST",
          body: JSON.stringify({ email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName }),
        });
       
        setTab("login");
        setError("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-left">
        <div className="auth-brand">
          Friilance
          <span className="auth-brand-dot" />
        </div>
        <div className="auth-tagline">
          Pay collaborators. Track projects. Move money.
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab${tab === "login" ? " active" : ""}`}
            onClick={() => { setTab("login"); setError(""); }}
            type="button"
          >
            Sign In
          </button>
          <button
            className={`auth-tab${tab === "register" ? " active" : ""}`}
            onClick={() => { setTab("register"); setError(""); }}
            type="button"
          >
            Create Account
          </button>
        </div>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <form onSubmit={submit}>
          {tab === "register" && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="form-input" value={form.firstName} onChange={set("firstName")} placeholder="Ada" required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" value={form.lastName} onChange={set("lastName")} placeholder="Adanna" required />
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" required />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            style={{ width: "100%", justifyContent: "center", padding: "12px", borderRadius: "var(--radius-sm)", marginTop: 4 }}
            disabled={loading}
          >
            {loading
              ? <><span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" /></>
              : tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {tab === "register" && (
          <p style={{ marginTop: 16, fontSize: 12, color: "var(--text3)", textAlign: "center" }}>
            After registering, open a Friilance account from the dashboard to start transacting.
          </p>
        )}
      </div>

      
          <div className="auth-right">
              <img 
                src={myImage} 
                alt="Lady holding a briefcase" 
                style={{
                width: "100%",
                height: "80vh",
                objectFit: "cover",
                objectPosition: "center center",
                borderRadius: "16px",
                margin: "auto",
                display: "block",
              }}
              />
            </div>
            </div>
         
      
  );
}
