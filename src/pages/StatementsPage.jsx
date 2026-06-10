import { useState, useEffect  } from "react";
import { apiFetch, apiFileFetch } from "../api";
import { fmtCurrency, fmtDate, fmtTime } from "../utils";
import TxBadge, { TxTypeLabel } from "../components/TxBadge";

 function StatementsPage({ accounts, token }) {
  const [accountId, setAccountId] = useState("");
  useEffect(() => {
  if (!accountId && accounts.length > 0) setAccountId(accounts[0].id);
  }, [accounts, accountId]);
  const [project, setProject]     = useState("");
  const [from, setFrom]           = useState("");
  const [to, setTo]               = useState("");
  const [statement, setStatement] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  

  async function fetchStatement(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      let url = `/Transactions/ViewStatement?accountId=${accountId}`;
      if (project) url += `&project=${encodeURIComponent(project)}`;
      if (from)    url += `&from=${from}`;
      if (to)      url += `&to=${to}`;
      setStatement(await apiFetch(url, {}, token));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadPDF() {
    try {
      let url = `/Transactions/DownloadStatement?accountId=${accountId}`;
      if (project) url += `&project=${encodeURIComponent(project)}`;
      if (from)    url += `&from=${from}`;
      if (to)      url += `&to=${to}`;
      const blob = await apiFileFetch(url, token);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `friilance-statement-${new Date().toISOString().slice(0, 7)}.pdf`;
      a.click();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      {/* Filter */}
      <div className="table-wrap" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Filter Statement</div>
        <form onSubmit={fetchStatement}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, alignItems: "end" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Account</label>
              <select className="form-select" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                <option value="">Select account…</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.fullName} — {a.accountNumber}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Project</label>
              <input className="form-input" value={project} onChange={(e) => setProject(e.target.value)} placeholder="All projects" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">From</label>
              <input className="form-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">To</label>
              <input className="form-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Loading…" : "View Statement"}</button>
            {statement && <button className="btn btn-ghost" type="button" onClick={downloadPDF}>↓ Download PDF</button>}
          </div>
        </form>
        {error && <div className="alert alert-error" style={{ marginTop: 12 }}>⚠ {error}</div>}
      </div>

      {/* Summary stats */}
      {statement && (
        <>
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            {[
              { label: "Opening Balance",  value: fmtCurrency(statement.openingBalance),  cls: "" },
              { label: "Total Income",     value: fmtCurrency(statement.totalIncome),     cls: "green" },
              { label: "Total Expenses",   value: fmtCurrency(statement.totalExpenses),   cls: "red" },
              { label: "Closing Balance",  value: fmtCurrency(statement.closingBalance),  cls: "accent" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className={`stat-value ${s.cls}`} style={{ fontSize: 22 }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="table-wrap">
            <div className="table-header">
              <div className="table-title">Transactions ({statement.transactions?.length || 0})</div>
              {statement.projectFilter && <span className="chip">{statement.projectFilter}</span>}
            </div>
            {statement.transactions?.length === 0 ? (
              <div className="empty"><div className="empty-icon">📭</div><div className="empty-title">No transactions found</div><div className="empty-desc">Try adjusting your filters</div></div>
            ) : (
              <table>
                <thead>
                  <tr><th>Date</th><th>Type</th><th>Reference</th><th>Project</th><th>From / To</th><th>Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {statement.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td style={{ fontSize: 11, color: "var(--text3)" }}>{fmtDate(tx.createdAt)}<br />{fmtTime(tx.createdAt)}</td>
                      <td><TxTypeLabel type={tx.type} /></td>
                      <td className="mono" style={{ fontSize: 11 }}>{tx.reference}</td>
                      <td>{tx.projectName && <span className="chip">{tx.projectName}</span>}</td>
                      <td>{tx.isIncoming ? tx.senderName || "External" : tx.recipientName || "—"}</td>
                      <td className="mono" style={{ color: tx.type === "Deposit" ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                        <td style={{ color: tx.isIncoming ? "var(--green)" : "var(--red)" }}>
                          {tx.isIncoming ? "+" : "-"}{fmtCurrency(tx.amount)}
                        </td>
                      </td>
                      <td><TxBadge status={tx.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default StatementsPage;