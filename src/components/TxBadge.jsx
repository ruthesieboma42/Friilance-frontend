export default function TxBadge({ status }) {
  const normalized =
    typeof status === "string"
      ? status.trim().toLowerCase()
      : status;

  if (normalized === "success" || normalized === "completed" || normalized === 1)
    return <span className="badge green">Completed</span>;

  if (normalized === "failed" || normalized === 0)
    return <span className="badge red">Failed</span>;

  return <span className="badge yellow">Pending</span>;
}

export function TxTypeLabel({ type }) {
  const map = { Deposit: "↓ Deposit", Transfer: "↑ Transfer", BulkTransfer: "⇉ Bulk" };
  return <span style={{ fontSize: 12, color: "var(--text2)" }}>{map[type] || type}</span>;
}