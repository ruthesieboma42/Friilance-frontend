import { useState } from "react";
import { fmtCurrency } from "../utils";
import { apiFetch } from "../api";

const PAYMENT_BASE = typeof window !== "undefined"
  ? `${window.location.origin}/pay`
  : "https://pay.friilance.com/p";

function buildPaymentLink(account, amount, reference, clientName) {
  const payload = {
    acc: account.accountNumber,
    amt: amount,
    ref: reference,
    cur: account.currency,
    to: clientName || undefined,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };
  const encoded = btoa(JSON.stringify(payload));
  return `${PAYMENT_BASE}/${encoded}`;
}

export default function DepositModal({ account, onDone, onClose }) {
  const [step, setStep] = useState("form"); 
  const [form, setForm] = useState({ amount: "", reference: "", clientName: "" });
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [payError, setPayError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function generate(e) {
    e.preventDefault();
    const url = buildPaymentLink(account, parseFloat(form.amount), form.reference, form.clientName);
    setLink(url);
    setStep("link");
  }

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareLink() {
    if (navigator.share) {
      navigator.share({
        title: "Friilance Payment",
        text: `Pay ${fmtCurrency(form.amount, account.currency)} — ${form.reference}`,
        url: link,
      });
    } else {
      copyLink();
    }
  }

 
  async function payNow() {
    setPaying(true);
    setPayError("");
    try {
      await apiFetch(
        "/Accounts/PaymentLinkDeposit",
        {
          method: "POST",
          body: JSON.stringify({
            accountNumber: account.accountNumber,
            amount: parseFloat(form.amount),
            reference: form.reference,
            clientName: form.clientName || null,
            currency: account.currency,
          }),
        }
        
      );
      setPaid(true);
      onDone?.();
    } catch (err) {
      setPayError(err.message || "Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  function reset() {
    setStep("form");
    setForm({ amount: "", reference: "", clientName: "" });
    setLink("");
    setCopied(false);
    setPaid(false);
    setPayError("");
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>

        {step === "form" && (
          <>
            <div className="modal-title">Generate Payment Link</div>
            <div className="modal-sub">
              Share this link with your client; they pay, your account gets credited instantly.
            </div>

            <form onSubmit={generate}>
              <div className="form-group">
                <label className="form-label">Amount ({account.currency})</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.amount}
                  onChange={set("amount")}
                  placeholder="500000"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reference / Invoice No.</label>
                <input
                  className="form-input"
                  value={form.reference}
                  onChange={set("reference")}
                  placeholder="INV-2024-042"
                  required
                />
                <div className="form-hint">This appears on your statement as the transaction reference</div>
              </div>

              <div className="form-group">
                <label className="form-label">Client Name (optional)</label>
                <input
                  className="form-input"
                  value={form.clientName}
                  onChange={set("clientName")}
                  placeholder="Acme Corp"
                />
              </div>

              <div className="modal-divider" />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text2)", marginBottom: 16 }}>
                <span>Receiving into</span>
                <span>
                  <span className="mono" style={{ color: "var(--accent)" }}>{account.accountNumber}</span>
                  {" · "}{account.fullName}
                </span>
              </div>

              <button
                className="btn btn-primary"
                type="submit"
                style={{ width: "100%", justifyContent: "center" }}
                disabled={!form.amount || !form.reference}
              >
                Generate Link →
              </button>
            </form>
          </>
        )}

        {step === "link" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔗</div>
              <div className="modal-title">Payment Link Ready</div>
              <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>
                Send this to your client to collect{" "}
                <strong style={{ color: "var(--green)" }}>
                  {fmtCurrency(form.amount, account.currency)}
                </strong>
              </div>
            </div>

            <div className="payment-link-box">
              <div className="payment-link-label">Payment URL</div>
              <div className="payment-link-url">{link}</div>
              <div className="payment-link-actions">
                <button
                  className="btn btn-sm btn-primary"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={copyLink}
                >
                  {copied ? "✓ Copied!" : "Copy Link"}
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={shareLink}
                >
                  Share ↗
                </button>
              </div>
            </div>

            {/* Meta grid */}
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Amount",           value: fmtCurrency(form.amount, account.currency) },
                { label: "Reference",        value: form.reference },
                { label: "Receiving account",value: account.accountNumber },
                { label: "Expires in",       value: "24 hours" },
              ].map((r) => (
                <div key={r.label} style={{ background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
                  <div className="mono" style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>{r.label}</div>
                  <div className="mono" style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>{r.value}</div>
                </div>
              ))}
            </div>

           
            <div className="modal-divider" />

            {paid ? (
              <div className="alert alert-success">✓ Payment received! Your balance has been updated.</div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8, textAlign: "center" }}>
                  — I'm using this to simulate deposits —
                </div>
                {payError && <div className="alert alert-error">⚠ {payError}</div>}
                <button
                  className="btn btn-gold"
                  style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}
                  onClick={payNow}
                  disabled={paying}
                  type="button"
                >
                  {paying ? "Processing…" : `Pay ${fmtCurrency(form.amount, account.currency)} Now`}
                </button>
              </>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={reset}>
                New Link
              </button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>
                Done 
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
