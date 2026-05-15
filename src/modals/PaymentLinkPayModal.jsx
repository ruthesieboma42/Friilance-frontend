import { useState } from "react";
import { apiFetch } from "../api";
import { fmtCurrency } from "../utils";


function decodePaymentLink(raw) {
  try {
    const url = raw.trim();
    const base64 = url.split("/").pop();
    const json = atob(base64);
    const payload = JSON.parse(json);

   
    if (!payload.acc || !payload.amt || !payload.ref || !payload.cur) return null;

   
    if (payload.exp && Date.now() > payload.exp) {
      return { expired: true, ...payload };
    }

    return payload;
  } catch {
    return null;
  }
}

export default function PaymentLinkPayModal({ onDone, onClose }) {
  const [step, setStep]     = useState("paste");   // "paste" | "preview" | "done"
  const [raw, setRaw]       = useState("");
  const [payload, setPayload] = useState(null);
  const [parseError, setParseError] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  function handleParse(e) {
    e.preventDefault();
    setParseError("");
    const decoded = decodePaymentLink(raw);

    if (!decoded) {
      setParseError("This doesn't look like a valid Friilance payment link. Please check and try again.");
      return;
    }
    if (decoded.expired) {
      setParseError("This payment link has expired (links are valid for 24 hours).");
      return;
    }

    setPayload(decoded);
    setStep("preview");
  }

  async function handlePay() {
    if (!payload) return;
    setPaying(true);
    setPayError("");

    try {
     
      await apiFetch(
        "/Accounts/PaymentLinkDeposit",
        {
          method: "POST",
          body: JSON.stringify({
            accountNumber: payload.acc,
            amount:        payload.amt,
            reference:     payload.ref,
            clientName:    payload.to || null,
            currency:      payload.cur,
          }),
        }
       
      );

      setStep("done");
      onDone?.();
    } catch (err) {
      
      if (err.message?.includes("already been paid") || err.message?.includes("409")) {
        setPayError("This payment link has already been paid.");
      } else {
        setPayError(err.message || "Payment failed. Please try again.");
      }
    } finally {
      setPaying(false);
    }
  }

  function reset() {
    setStep("paste");
    setRaw("");
    setPayload(null);
    setParseError("");
    setPayError("");
  }

 
  const expiresIn = payload?.exp
    ? Math.max(0, Math.round((payload.exp - Date.now()) / 1000 / 60 / 60))
    : null;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} type="button">✕</button>

       
        {step === "paste" && (
          <>
            <div className="modal-title">Pay a Payment Link</div>
            <div className="modal-sub">
              Paste a Friilance payment link you received and we'll handle the rest.
            </div>

            {parseError && <div className="alert alert-error">⚠ {parseError}</div>}

            <form onSubmit={handleParse}>
              <div className="form-group">
                <label className="form-label">Payment Link</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: 80, resize: "vertical", lineHeight: 1.5 }}
                  value={raw}
                  onChange={(e) => { setRaw(e.target.value); setParseError(""); }}
                  placeholder="Paste your payment link here…"
                  required
                />
              </div>

              <button
                className="btn btn-primary"
                type="submit"
                style={{ width: "100%", justifyContent: "center" }}
                disabled={!raw.trim()}
              >
                Preview Payment 
              </button>
            </form>
          </>
        )}

        
        {step === "preview" && payload && (
          <>
            <div className="modal-title">Confirm Payment</div>
            <div className="modal-sub">Review the details before sending.</div>

            {payError && <div className="alert alert-error">⚠ {payError}</div>}

            
            <div style={{
              textAlign: "center",
              padding: "20px 0 24px",
              borderBottom: "1px solid var(--border)",
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)", marginBottom: 8, letterSpacing: 1 }}>
                AMOUNT DUE
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.5, color: "var(--text)" }}>
                {fmtCurrency(payload.amt, payload.cur)}
              </div>
            </div>

           
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {[
                { label: "Receiving Account", value: payload.acc },
                { label: "Reference",         value: payload.ref },
                { label: "Currency",          value: payload.cur },
                { label: "Link expires in",   value: expiresIn !== null ? `~${expiresIn}h` : "—" },
                ...(payload.to ? [{ label: "Payee", value: payload.to }] : []),
              ].map((r) => (
                <div
                  key={r.label}
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 12px",
                  }}
                >
                  <div className="mono" style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>
                    {r.label.toUpperCase()}
                  </div>
                  <div className="mono" style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>
                    {r.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={reset}
                type="button"
              >
                 Back
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={handlePay}
                disabled={paying}
                type="button"
              >
                {paying
                  ? <><span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" /></>
                  : `Pay ${fmtCurrency(payload.amt, payload.cur)} →`}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div className="modal-title" style={{ marginBottom: 6 }}>Payment Sent!</div>
              <div style={{ fontSize: 13, color: "var(--text2)" }}>
                {fmtCurrency(payload?.amt, payload?.cur)} sent to{" "}
                <span className="mono" style={{ color: "var(--accent)" }}>{payload?.acc}</span>
              </div>
            </div>

            <div style={{
              background: "var(--green-soft)",
              border: "1px solid rgba(52,211,153,0.25)",
              borderRadius: "var(--radius-sm)",
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}>
              <span style={{ fontSize: 18 }}>✓</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green)" }}>Transaction confirmed</div>
                <div className="mono" style={{ fontSize: 11, color: "rgba(52,211,153,0.7)", marginTop: 2 }}>
                  Ref: {payload?.ref}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={reset}
                type="button"
              >
                Pay Another
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={onClose}
                type="button"
              >
                Done 
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
