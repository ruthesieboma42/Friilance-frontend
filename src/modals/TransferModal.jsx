import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../api";
import { fmtCurrency, initials } from "../utils";

export default function TransferModal({ account, token, onDone, onClose }) {
  const [form, setForm] = useState({
    recipientAccountNumber: "",
    amount: "",
    projectName: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recipient, setRecipient] = useState(null);   // resolved recipient details
  const [lookingUp, setLookingUp] = useState(false);
  const lookupTimeout = useRef(null);

  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  
  useEffect(() => {
    const num = form.recipientAccountNumber.trim();
    setRecipient(null);

    if (num.length < 6) return; // too short to bother

    clearTimeout(lookupTimeout.current);
    lookupTimeout.current = setTimeout(async () => {
      setLookingUp(true);
      try {
        const res = await apiFetch(
          `/Accounts/LookupByAccountNumber?accountNumber=${encodeURIComponent(num)}`,
          {},
          token
        );
        setRecipient(res);
      } catch {
        setRecipient(null); 
      } finally {
        setLookingUp(false);
      }
    }, 600);

    return () => clearTimeout(lookupTimeout.current);
  }, [form.recipientAccountNumber, token]);

  async function submit(e) {
    e.preventDefault();

    if (!account?.id) {
      setError("No source account selected.");
      return;
    }

    const amount = Number.parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }

    if (amount > account.balance) {
      setError(`Insufficient balance. Available: ${fmtCurrency(account.balance, account.currency)}`);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await apiFetch(
        `/Transactions/Transfer?accountId=${account.id}`,
        {
          method: "POST",
          body: JSON.stringify({
            recipientAccountNumber: form.recipientAccountNumber.trim(),
            amount,
            projectName: form.projectName.trim() || null,
            description: form.description.trim() || null,
          }),
        },
        token
      );

      onDone?.(res);
      onClose?.();
    } catch (err) {
      setError(err.message || "Transfer failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!account) return null;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} type="button">✕</button>

        <div className="modal-title">Send Money</div>
        <div className="modal-sub">
          From <span className="mono">{account.accountNumber}</span>
          {" · "}
          <span style={{ color: "var(--green)" }}>{fmtCurrency(account.balance, account.currency)}</span>
          {" available"}
        </div>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Recipient Account Number</label>
            <input
              className={`form-input mono${recipient ? " verified" : ""}`}
              value={form.recipientAccountNumber}
              onChange={set("recipientAccountNumber")}
              placeholder="FRLXXXXXXXXX"
              required
            />

            {/* Live lookup feedback */}
            {lookingUp && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--text3)" }}>
                Looking up account…
              </div>
            )}

            {recipient && (
              <div className="recipient-pill">
                <div className="recipient-pill-avatar">
                  {initials(recipient.fullName)}
                </div>
                <div>
                  <div className="recipient-pill-name">✓ {recipient.fullName}</div>
                  <div className="recipient-pill-role">{recipient.freelancerRole} · {recipient.currency}</div>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Amount ({account.currency})</label>
            <input
              className="form-input"
              type="number"
              min="1"
              step="0.01"
              value={form.amount}
              onChange={set("amount")}
              placeholder="10000"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input
                className="form-input"
                value={form.projectName}
                onChange={set("projectName")}
                placeholder="Website Redesign"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                className="form-input"
                value={form.description}
                onChange={set("description")}
                placeholder="UI Design fee"
              />
            </div>
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />

          <button
            className="btn btn-primary"
            type="submit"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={loading}
          >
            {loading ? "Sending…" : `Send ${form.amount ? fmtCurrency(form.amount, account.currency) : ""} →`}
          </button>
        </form>
      </div>
    </div>
  );
}
