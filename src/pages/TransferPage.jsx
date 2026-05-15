import { useState, useEffect, useCallback } from "react";
import { fmtCurrency, fmtDate, fmtTime } from "../utils";
import { apiFetch } from "../api";
import TransferModal from "../modals/TransferModal";
import BulkTransferModal from "../modals/BulkTransferModal";
import PaymentLinkPayModal from "../modals/PaymentLinkPayModal";
import TxBadge, { TxTypeLabel } from "../components/TxBadge";

function TransferPage({ accounts, token, showToast, onRefresh }) {
  const [mode, setMode]                         = useState("single");
  const [transferTarget, setTransferTarget]     = useState(null);
  const [bulkTarget, setBulkTarget]             = useState(null);
  const [showPayLinkModal, setShowPayLinkModal] = useState(false);

  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || "");
  const [txns, setTxns]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const displayName = (a) =>
    a?.fullName || `${a?.firstName ?? ""} ${a?.lastName ?? ""}`.trim() || "—";

  const fetchHistory = useCallback(async (accountId) => {
    if (!accountId || !token) return;
    setLoading(true);
    setError("");
    try {
      const stmt = await apiFetch(
        `/Transactions/ViewStatement?accountId=${accountId}`,
        {},
        token
      );
      setTxns(Array.isArray(stmt?.transactions) ? stmt.transactions : []);
    } catch (err) {
      setError(err.message || "Failed to load transactions.");
      setTxns([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (selectedAccountId) fetchHistory(selectedAccountId);
  }, [selectedAccountId, fetchHistory]);

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  async function handleTransferDone() {
    showToast("Transfer sent!", "success");
    setTransferTarget(null);
    await onRefresh?.();
    fetchHistory(selectedAccountId);
  }

  async function handleBulkDone() {
    showToast("Bulk transfer complete!", "success");
    setBulkTarget(null);
    await onRefresh?.();
    fetchHistory(selectedAccountId);
  }

  async function handlePayLinkDone() {
    showToast("Payment sent!", "success");
    await onRefresh?.();
    fetchHistory(selectedAccountId);
  }

  const empty = (
    <div className="empty">
      <div className="empty-icon">🏦</div>
      <div className="empty-title">No accounts</div>
      <div className="empty-desc">Create an account from the Dashboard first</div>
    </div>
  );

  return (
    <div className="page">

      <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
        <button
          className={`btn ${mode === "single" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMode("single")}
        >
           Single Transfer
        </button>
        <button
          className={`btn ${mode === "bulk" ? "btn-gold" : "btn-ghost"}`}
          onClick={() => setMode("bulk")}
        >
           Bulk Transfer
        </button>

        <div style={{ width: 1, height: 28, background: "var(--border2)", margin: "0 4px" }} />

        <button
          className="btn btn-ghost"
          onClick={() => setShowPayLinkModal(true)}
          type="button"
        >
           Pay via Link
        </button>
      </div>

      {accounts.length === 0 && empty}

      {accounts.length > 0 && mode === "single" && (
        <>
          <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: 16 }}>
            Select an account to transfer from:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
            {accounts.map((a) => (
              <div key={a.id} className="account-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{displayName(a)}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--text3)" }}>{a.accountNumber}</div>
                  </div>
                  <span className="chip">{a.freelancerRole}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: "var(--text)", marginBottom: 12 }}>
                  {fmtCurrency(a.balance, a.currency)}
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: "100%", justifyContent: "center", borderRadius: "var(--radius-sm)" }}
                  onClick={() => setTransferTarget(a)}
                >
                  Send Money
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {accounts.length > 0 && mode === "bulk" && (
        <>
          <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: 16 }}>
            Select an account to run bulk transfer from:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
            {accounts.map((a) => (
              <div key={a.id} className="account-card">
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{displayName(a)}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--text3)", marginBottom: 12 }}>{a.accountNumber}</div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 12 }}>
                  {fmtCurrency(a.balance, a.currency)}
                </div>
                <button
                  className="btn btn-gold btn-sm"
                  style={{ width: "100%", justifyContent: "center", borderRadius: "var(--radius-sm)" }}
                  onClick={() => setBulkTarget(a)}
                >
                  Upload Excel
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {accounts.length > 0 && (
        <div className="table-wrap">
          <div className="table-header">
            <div className="table-title">Transfer History</div>

            {accounts.length > 1 && (
              <select
                className="form-select"
                style={{ width: "auto", fontSize: 12, padding: "5px 10px" }}
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {displayName(a)} — {a.accountNumber}
                  </option>
                ))}
              </select>
            )}

            <button
              className="btn btn-xs btn-ghost"
              onClick={() => fetchHistory(selectedAccountId)}
              disabled={loading}
              type="button"
            >
              ↻ Refresh
            </button>
          </div>

          {error && (
            <div className="alert alert-error" style={{ margin: "12px 20px" }}>⚠ {error}</div>
          )}

          {loading ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
            </div>
          ) : txns.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📭</div>
              <div className="empty-title">No transactions yet</div>
              <div className="empty-desc">Transfers you send or receive will appear here</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>From / To</th>
                  <th>Reference</th>
                  <th>Project</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((tx) => {
                  const isIncoming = tx.type === "Deposit";
                  const counterparty = isIncoming
                    ? tx.senderName || "External"
                    : tx.recipientName || "—";

                  return (
                    <tr key={tx.id}>
                      <td>
                        <div className="td-icon">
                          <div className={`tx-logo ${isIncoming ? "income" : "expense"}`}>
                            {tx.type === "Deposit" ? "↓" : tx.type === "BulkTransfer" ? "⇉" : "↑"}
                          </div>
                          <TxTypeLabel type={tx.type} />
                        </div>
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 500 }}>{counterparty}</td>
                      <td>
                        <span className="mono" style={{ fontSize: 11, color: "var(--text3)" }}>
                          {tx.reference}
                        </span>
                      </td>
                      <td>
                        {tx.projectName
                          ? <span className="chip">{tx.projectName}</span>
                          : <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ fontSize: 11, color: "var(--text2)", whiteSpace: "nowrap" }}>
                        {fmtDate(tx.createdAt)}
                        <br />
                        <span style={{ color: "var(--text3)" }}>{fmtTime(tx.createdAt)}</span>
                      </td>
                      <td>
                        <span
                          className="mono"
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: isIncoming ? "var(--green)" : "var(--red)",
                          }}
                        >
                          {isIncoming ? "+" : "−"}{fmtCurrency(tx.amount, tx.currency)}
                        </span>
                      </td>
                      <td>
                        <TxBadge status={tx.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {transferTarget && (
        <TransferModal
          account={transferTarget}
          token={token}
          onDone={handleTransferDone}
          onClose={() => setTransferTarget(null)}
        />
      )}
      {bulkTarget && (
        <BulkTransferModal
          account={bulkTarget}
          token={token}
          onDone={handleBulkDone}
          onClose={() => setBulkTarget(null)}
          showToast={showToast}
        />
      )}
      {showPayLinkModal && (
        <PaymentLinkPayModal
          token={token}
          onDone={handlePayLinkDone}
          onClose={() => setShowPayLinkModal(false)}
        />
      )}
    </div>
  );
}

export default TransferPage;
