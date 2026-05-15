import { useEffect } from "react";

export default function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const borderColor =
    type === "error" ? "var(--red)" : type === "success" ? "var(--green)" : "var(--border2)";

  return (
    <div className="toast" style={{ borderColor }}>
      <span>{type === "error" ? "⚠️" : type === "success" ? "✓" : "ℹ"}</span>
      {msg}
    </div>
  );
}
