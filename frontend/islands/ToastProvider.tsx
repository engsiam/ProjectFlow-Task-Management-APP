import { useEffect, useState } from "preact/hooks";

type Toast = { id: number; message: string; tone?: "success" | "danger" | "warning" };

export default function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<Omit<Toast, "id">>).detail;
      const toast = { id: Date.now(), ...detail };
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== toast.id)), 3600);
    }
    addEventListener("projectflow:toast", onToast);
    return () => removeEventListener("projectflow:toast", onToast);
  }, []);

  return (
    <div style={{ position: "fixed", right: "16px", bottom: "80px", zIndex: 80, display: "grid", gap: "8px" }}>
      {toasts.map((toast) => (
        <div class={`badge badge-${toast.tone ?? "success"}`} style={{ minHeight: "38px", padding: "0 14px" }}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
