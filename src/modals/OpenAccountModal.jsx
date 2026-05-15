import { useState } from "react";
import { apiFetch } from "../api";

export default function OpenAccountModal({ token, onDone, onClose }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", currency: "NGN", freelancerRole: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch(
        "/Accounts/CreateNewAccount",
        { method: "POST", body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName, email: form.email, currency: form.currency, freelancerRole: form.freelancerRole }) },
        token
      );
      onDone(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">Open New Account</div>
        <div className="modal-sub">Create a freelance account to send and receive money</div>
        {error && <div className="alert alert-error">⚠ {error}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-input" value={form.firstName} onChange={set("firstName")} placeholder="Ada" required />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" value={form.lastName} onChange={set("lastName")} placeholder="Lovelace" required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={set("email")} placeholder="ada@example.com" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-select" value={form.currency} onChange={set("currency")}>
                <option value="NGN">NGN – Naira</option>
                <option value="USD">USD – Dollar</option>
                <option value="EUR">EUR – Euro</option>
                <option value="GBP">GBP – Pound</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Freelancer Role</label>
              <input className="form-input" value={form.freelancerRole} onChange={set("freelancerRole")} placeholder="UI Designer, Dev..." required />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} disabled={loading}>
            {loading ? "Creating…" : "Create Account →"}
          </button>
        </form>
      </div>
    </div>
  );
}
