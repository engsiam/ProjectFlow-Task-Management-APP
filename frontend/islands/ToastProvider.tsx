import { useEffect, useState } from "preact/hooks";
import { Icon } from "../components/ui.tsx";

type Toast = {
  id: number;
  message: string;
  tone?: "success" | "danger" | "warning";
};

const TONE_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  success: { bg: "color-mix(in srgb, var(--success), transparent 88%)", border: "color-mix(in srgb, var(--success), transparent 60%)", icon: "check_circle" },
  danger: { bg: "color-mix(in srgb, var(--danger), transparent 88%)", border: "color-mix(in srgb, var(--danger), transparent 60%)", icon: "error" },
  warning: { bg: "color-mix(in srgb, var(--warning), transparent 88%)", border: "color-mix(in srgb, var(--warning), transparent 60%)", icon: "warning" },
};

export default function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<{ message: string; tone?: Toast["tone"] }>).detail;
      const toast: Toast = { id: Date.now(), tone: "success", ...detail };
      setToasts((prev) => [...prev, toast]);
      setTimeout(
        () => setToasts((prev) => prev.filter((item) => item.id !== toast.id)),
        4000,
      );
    }
    addEventListener("projectflow:toast", onToast);
    return () => removeEventListener("projectflow:toast", onToast);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: "16px",
        bottom: "80px",
        zIndex: 80,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => {
        const colors = TONE_COLORS[toast.tone ?? "success"];
        return (
          <div
            key={toast.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minHeight: "40px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              color: toast.tone === "danger" ? "var(--danger)" : toast.tone === "warning" ? "var(--warning)" : "var(--success)",
              fontSize: "14px",
              fontWeight: 600,
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              pointerEvents: "auto",
              animation: "toast-slide-in 0.25s ease-out",
              maxWidth: "360px",
            }}
          >
            <Icon name={colors.icon} size={20} />
            <span style={{ flex: 1, color: "var(--text)" }}>{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              style={{
                border: 0, background: "transparent", cursor: "pointer",
                padding: 0, display: "flex", color: "var(--muted)",
              }}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
