import { Button, Icon } from "../components/ui.tsx";

const variantConfig = {
  danger: {
    icon: "warning",
    bg: "rgba(239,68,68,0.15)",
    color: "#ef4444",
    btnClass: "btn-danger",
  },
  primary: {
    icon: "info",
    bg: "rgba(99,102,241,0.15)",
    color: "#6366f1",
    btnClass: "btn-primary",
  },
} as const;

export default function ConfirmDialog(
  { title, body, confirmLabel = "Confirm", variant = "danger", onCancel, onConfirm }: {
    title: string;
    body: string;
    confirmLabel?: string;
    variant?: "danger" | "primary";
    onCancel: () => void;
    onConfirm: () => void;
  },
) {
  const cfg = variantConfig[variant];

  return (
    <div class="confirm-backdrop" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div class="confirm-modal">
        <div class="confirm-icon-wrap" style={{ background: cfg.bg, color: cfg.color }}>
          <Icon name={cfg.icon} size={28} />
        </div>
        <h2 class="confirm-title">{title}</h2>
        <p class="confirm-body">{body}</p>
        <div class="confirm-actions">
          <button type="button" class="btn" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            class={`btn ${cfg.btnClass}`}
            onClick={onConfirm}
            style={{ minWidth: "100px" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
