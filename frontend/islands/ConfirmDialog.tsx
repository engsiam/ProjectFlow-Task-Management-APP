import { Button, Icon } from "../components/ui.tsx";

export default function ConfirmDialog(
  { title, body, confirmLabel = "Confirm", onCancel, onConfirm }: {
    title: string;
    body: string;
    confirmLabel?: string;
    onCancel: () => void;
    onConfirm: () => void;
  },
) {
  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal" style={{ maxWidth: "440px", padding: "20px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span class="brand-mark" style={{ background: "var(--danger)" }}>
            <Icon name="warning" />
          </span>
          <h2 class="headline" style={{ margin: 0 }}>{title}</h2>
        </div>
        <p style={{ color: "var(--muted)" }}>{body}</p>
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
        >
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
