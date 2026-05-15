import { useState, useRef } from "react";
import { BASE } from "../api";
import { fmtCurrency } from "../utils";
import React from "react";

export default function BulkTransferModal({
  account,
  token,
  onDone,
  onClose,
  showToast,
}) {
  const [step, setStep] = useState("upload");
  const [dragging, setDragging] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const fileRef = useRef(null);

  async function uploadFile(file) {
    if (!file || !account?.id) return;

    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      if (projectName.trim()) {
        fd.append("projectName", projectName.trim());
      }

      const res = await fetch(
        `${BASE}/accounts/bulk-transfers/PreviewUploadedDocument?accountId=${account.id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: fd,
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.title || "Upload failed");
      }

      const data = await res.json();
      setPreview(data);
      setStep("preview");
    } catch (err) {
      showToast?.(err.message || "Upload failed", "error");
    } finally {
      setLoading(false);
    }
  }

  const DownloadStaticFile = () => {
    const link = document.createElement("a");
    link.href = "/template.xlsx";
    link.download = "bulk_transfer_template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  async function executeBulk() {
    if (!account?.id || !preview?.bulkTransferId) return;

    setLoading(true);

    try {
      const res = await fetch(
        `${BASE}/accounts/bulk-transfers/PostBulkTransfer?accountId=${account.id}&bulkTransferId=${preview.bulkTransferId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.title || "Execution failed");
      }

      const data = await res.json();
      setResult(data);
      setStep("result");
    } catch (err) {
      showToast?.(err.message || "Execution failed", "error");
    } finally {
      setLoading(false);
    }
  }

  const handleFile = (file) => {
    if (file) uploadFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const hasErrors = (preview?.validationErrors?.length || 0) > 0;

  if (!account) return null;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <button className="modal-close" onClick={onClose} type="button">
          ✕
        </button>

        <div className="modal-title">Bulk Transfer</div>
        <div className="modal-sub">Upload an excel document to pay multiple collaborators</div>

        {step === "upload" && (
          <>
          
            <div className="form-group">
              <label className="form-label">Project Name (optional)</label>
              <input
                className="form-input"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Website Redesign"
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button
                 type="button"
                  className="btn btn-ghost btn-sm"
                 onClick={DownloadStaticFile}
             >
                 ↓ Download Sample File
              </button>
            </div>

            <div
              className={`upload-zone${dragging ? " drag" : ""}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <input
                type="file"
                ref={fileRef}
                accept=".xlsx,.xls"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />

              {loading ? (
                <>
                  <div className="upload-icon">⏳</div>
                  <div className="upload-title">Parsing your file…</div>
                </>
              ) : (
                <>
                  <div className="upload-icon">📊</div>
                  <div className="upload-title">Drop your Excel file here</div>
                  <div className="upload-desc">
                    .xlsx or .xls with columns: Name, AccountNumber, Amount, Project
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {step === "preview" && preview && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {[
                { label: "Recipients", value: preview.totalRecipients, cls: "" },
                {
                  label: "Total Amount",
                  value: fmtCurrency(preview.totalAmount, account.currency),
                  cls: "accent",
                },
                {
                  label: "Errors",
                  value: preview.validationErrors?.length || 0,
                  cls: hasErrors ? "red" : "green",
                },
              ].map((s) => (
                <div key={s.label} className="stat-card" style={{ padding: "14px 16px" }}>
                  <div className="stat-label">{s.label}</div>
                  <div className={`stat-value ${s.cls}`} style={{ fontSize: 22 }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {hasErrors && (
              <div
                className="alert alert-error"
                style={{ flexDirection: "column", alignItems: "flex-start" }}
              >
                {preview.validationErrors.map((e, i) => (
                  <div key={i}>• {e}</div>
                ))}
              </div>
            )}

            <div
              className="table-wrap"
              style={{ maxHeight: 260, overflowY: "auto", marginBottom: 20 }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Account</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.items?.map((item, i) => (
                    <tr key={i}>
                      <td>{item.recipientName}</td>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {item.accountNumber}
                      </td>
                      <td className="mono">{fmtCurrency(item.amount, account.currency)}</td>
                      <td>
                        {item.isValid ? (
                          <span className="badge green">Valid</span>
                        ) : (
                          <span className="badge red">{item.validationError}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setStep("upload")} type="button">
                ← Back
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={executeBulk}
                disabled={loading || hasErrors}
                type="button"
              >
                {loading ? "Executing…" : `Execute: Pay ${preview.totalRecipients} people`}
              </button>
            </div>
          </>
        )}

        {step === "result" && result && (
          <>
            <div
              className={`alert ${result.failureCount === 0 ? "alert-success" : "alert-error"}`}
              style={{ marginBottom: 16 }}
            >
              {result.failureCount === 0
                ? `✓ All ${result.successCount} transfers completed!`
                : `⚠ ${result.successCount} succeeded, ${result.failureCount} failed`}
            </div>

            <div style={{ marginBottom: 16, fontSize: 13, color: "var(--text2)" }}>
              Total transferred:{" "}
              <span className="mono" style={{ color: "var(--green)" }}>
                {fmtCurrency(result.totalAmountTransferred, account.currency)}
              </span>
            </div>

            <div
              className="table-wrap"
              style={{ maxHeight: 260, overflowY: "auto", marginBottom: 20 }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Account</th>
                    <th>Amount</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results?.map((r, i) => (
                    <tr key={i}>
                      <td>{r.recipientName}</td>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {r.accountNumber}
                      </td>
                      <td className="mono">{fmtCurrency(r.amount, account.currency)}</td>
                      <td>
                        {r.success ? (
                          <span className="badge green">Done</span>
                        ) : (
                          <span className="badge red">{r.failureReason}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => {
                onDone?.();
                onClose?.();
              }}
              type="button"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}