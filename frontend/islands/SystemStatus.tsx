import { useEffect, useState } from "preact/hooks";
import { HEALTH_URL } from "../lib/constants.ts";

export default function SystemStatus({ compact }: { compact?: boolean }) {
  const [online, setOnline] = useState<boolean | null>(null);

  async function check() {
    try {
      const response = await fetch(HEALTH_URL);
      setOnline(response.ok);
    } catch {
      setOnline(false);
    }
  }

  useEffect(() => {
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  const color = online === null
    ? "var(--warning)"
    : online
    ? "var(--success)"
    : "var(--danger)";
  const label = online === null
    ? "Checking API"
    : online
    ? "API online"
    : "API offline";

  return (
    <button
      type="button"
      onClick={check}
      title="Retry API health check"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: compact ? "center" : undefined,
        gap: "8px",
        color: "var(--muted)",
        background: "transparent",
        border: 0,
        padding: 0,
        width: compact ? "100%" : undefined,
      }}
    >
      <span
        style={{
          width: "9px",
          height: "9px",
          borderRadius: "999px",
          background: color,
          boxShadow: `0 0 0 4px color-mix(in srgb, ${color}, transparent 82%)`,
        }}
      />
      {!compact && <span style={{ fontSize: "12px", fontWeight: 800 }}>{label}</span>}
    </button>
  );
}
