import { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch } from "../api";
import { fmtCurrency, fmtDate } from "../utils";
import TxBadge from "../components/TxBadge";
import OpenAccountModal from "../modals/OpenAccountModal";
import DepositModal from "../modals/DepositModal";
import TransferModal from "../modals/TransferModal";
import BulkTransferModal from "../modals/BulkTransferModal";
import PaymentLinkPayModal from "../modals/PaymentLinkPayModal";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

function DashboardPage({ accounts, token, onRefresh, showToast }) {
  const safeAccounts = useMemo(
    () => (Array.isArray(accounts) ? accounts : []),
    [accounts]
  );

  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [balance, setBalance]   = useState(null);
  const [txns, setTxns]         = useState([]);
  const [loadingTxns, setLoadingTxns] = useState(false);

  const [openAccountModal, setOpenAccountModal]   = useState(false);
  const [depositTarget, setDepositTarget]         = useState(null);
  const [transferTarget, setTransferTarget]       = useState(null);
  const [bulkTarget, setBulkTarget]               = useState(null);
  const [showPayLinkModal, setShowPayLinkModal]   = useState(false); // ← NEW

  const acc = useMemo(() => {
    if (safeAccounts.length === 0) return null;
    return safeAccounts.find((a) => a.id === selectedAccountId) || safeAccounts[0];
  }, [safeAccounts, selectedAccountId]);

  const loadAccountData = useCallback(async (accountId) => {
    if (!accountId || !token) return;
    setLoadingTxns(true);
    try {
      const [bal, stmt] = await Promise.all([
        apiFetch(`/Accounts/GetBalanceById?id=${accountId}`, {}, token),
        apiFetch(`/Transactions/ViewStatement?accountId=${accountId}`, {}, token),
      ]);
      setBalance(bal);
      setTxns(Array.isArray(stmt?.transactions) ? stmt.transactions : []);
    } catch {
      setBalance(null);
      setTxns([]);
    } finally {
      setLoadingTxns(false);
    }
  }, [token]);

  useEffect(() => {
    if (acc?.id) loadAccountData(acc.id);
  }, [acc?.id, loadAccountData]);

  async function handleTransferDone() {
    showToast("Transfer sent!", "success");
    await onRefresh();
    if (acc?.id) loadAccountData(acc.id);
    setTransferTarget(null);
  }

  async function handleDepositDone() {
    showToast("Payment link ready!", "success");
    await onRefresh();
    if (acc?.id) loadAccountData(acc.id);
    setDepositTarget(null);
  }

  async function handlePayLinkDone() {
    showToast("Payment sent!", "success");
    await onRefresh();
    if (acc?.id) loadAccountData(acc.id);
  }

  const totalBalance  = safeAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalIncome   = balance?.totalIncome   ?? 0;
  const totalExpenses = balance?.totalExpenses ?? 0;

  const chartData = useMemo(() => {
    const grouped = {};
    txns.forEach((tx) => {
      const day = fmtDate(tx.createdAt);
      if (!grouped[day]) grouped[day] = { date: day, income: 0, expenses: 0 };
      if (tx.isIncoming) grouped[day].income += tx.amount;
      else grouped[day].expenses += tx.amount;
    });
    return Object.values(grouped).slice(-7);
  }, [txns]);

  const recentTxns = txns.slice(0, 6);
  const displayName = (a) => a?.fullName || `${a?.firstName ?? ""} ${a?.lastName ?? ""}`.trim() || "—";

  return (
    <div className="page">

      <div className="page-header">
        <div>
          <div className="page-header-title">Overview</div>
          {acc && (
            <div className="mono" style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>
              {acc.accountNumber} · {acc.currency}
            </div>
          )}
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-ghost"
            onClick={() => setShowPayLinkModal(true)}
            type="button"
          >
            Pay via Link
          </button>
          <button className="btn btn-primary" onClick={() => acc && setDepositTarget(acc)} disabled={!acc} type="button">
            Get Payment Link
          </button>
          <button className="btn btn-gold" onClick={() => acc && setTransferTarget(acc)} disabled={!acc} type="button">
            Send Money
          </button>
          <button className="btn btn-ghost" onClick={() => setOpenAccountModal(true)} type="button">
            + New Account
          </button>
        </div>
      </div>

      <div className="stat-grid stat-grid-4">
        <div className="stat-card">
          <div className="stat-label">Total Transactions</div>
          <div className="stat-value">{txns.length}</div>
          <div className="stat-sub">On selected account</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Portfolio Balance</div>
          <div className="stat-value">{fmtCurrency(totalBalance)}</div>
          <div className="stat-sub">{safeAccounts.length} account{safeAccounts.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Income</div>
          <div className="stat-value">{fmtCurrency(totalIncome, acc?.currency)}</div>
          <div className="stat-sub">All deposits received</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value red">{fmtCurrency(totalExpenses, acc?.currency)}</div>
          <div className="stat-sub">All transfers sent</div>
        </div>
      </div>

      {safeAccounts.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          {safeAccounts.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAccountId(a.id)}
              type="button"
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: 20,
                border: "1px solid",
                borderColor: acc?.id === a.id ? "var(--accent)" : "var(--border2)",
                background: acc?.id === a.id ? "var(--accent-soft)" : "transparent",
                color: acc?.id === a.id ? "var(--accent)" : "var(--text2)",
                fontFamily: "var(--font)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {displayName(a)}
              <span className="mono" style={{ fontSize: 10, marginLeft: 6, opacity: 0.7 }}>
                {a.accountNumber}
              </span>
            </button>
          ))}
        </div>
      )}

      {safeAccounts.length === 0 && (
        <div className="table-wrap">
          <div className="empty">
            <div className="empty-icon">🏦</div>
            <div className="empty-title">No accounts yet</div>
            <div className="empty-desc">Open your first freelance account to get started</div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setOpenAccountModal(true)} type="button">
              Open Account
            </button>
          </div>
        </div>
      )}

      {acc && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

          {/* Chart */}
          <div className="table-wrap" style={{ padding: 24 }}>
            <div className="table-header" style={{ marginBottom: 20, padding: 0, border: "none" }}>
              <div className="table-title">Cash Flow</div>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>Last 7 days</span>
            </div>
            {chartData.length === 0 ? (
              <div className="empty" style={{ padding: "40px 0" }}>
                <div className="empty-icon">📊</div>
                <div className="empty-title">No data yet</div>
                <div className="empty-desc">Transactions will appear here</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b6bff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b6bff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f87171" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text3)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text3)" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtCurrency(v)} width={70} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, fontSize: 12 }}
                    formatter={(val) => fmtCurrency(val)}
                  />
                  <Area type="monotone" dataKey="income"   stroke="#3b6bff" strokeWidth={2} fill="url(#incomeGrad)" name="Income" />
                  <Area type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} fill="url(#expGrad)"    name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="table-wrap">
            <div className="table-header">
              <div className="table-title">Recent Transactions</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button className="btn btn-xs btn-ghost" onClick={() => setBulkTarget(acc)} type="button">⇉ Bulk Pay</button>
              </div>
            </div>

            {loadingTxns ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
              </div>
            ) : recentTxns.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📭</div>
                <div className="empty-title">No transactions yet</div>
                <div className="empty-desc">Get a payment link or make a transfer to get started</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTxns.map((tx) => {
                    const isIncoming = tx.isIncoming;
;
                    return (
                      <tr key={tx.id}>
                        <td>
                          <div className="td-icon">
                            <div className={`tx-logo ${isIncoming ? "income" : "expense"}`}>
                              {tx.type === "Deposit" ? "↓" : tx.type === "BulkTransfer" ? "⇉" : "↑"}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>
                                {isIncoming ? tx.senderName || "Payment received" : tx.recipientName || "Transfer sent"}
                              </div>
                              {tx.projectName && (
                                <span className="chip" style={{ marginTop: 2 }}>{tx.projectName}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="mono" style={{ fontWeight: 700, fontSize: 13, color: isIncoming ? "var(--green)" : "var(--red)" }}>
                            {isIncoming ? "+" : "−"}{fmtCurrency(tx.amount, tx.currency)}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text2)" }}>{fmtDate(tx.createdAt)}</td>
                        <td><TxBadge status={tx.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {openAccountModal && (
        <OpenAccountModal
          token={token}
          onDone={() => { showToast("Account created!", "success"); onRefresh(); setOpenAccountModal(false); }}
          onClose={() => setOpenAccountModal(false)}
        />
      )}
      {depositTarget && (
        <DepositModal
          account={depositTarget}
          token={token}
          onDone={handleDepositDone}
          onClose={() => setDepositTarget(null)}
        />
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
          onDone={() => { showToast("Bulk transfer complete!", "success"); onRefresh(); setBulkTarget(null); }}
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

export default DashboardPage;
