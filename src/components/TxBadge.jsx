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


export function TxTypeLabel({ type, isIncoming }) {
  if (type === "Deposit") return <span>↓ Deposit</span>;
  if (type === "BulkTransfer") return <span>{isIncoming ? "↓" : "⇉"} Bulk</span>;
  return <span>{isIncoming ? "↓" : "↑"} Transfer</span>;
}