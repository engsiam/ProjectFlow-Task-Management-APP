import { useEffect, useState } from "preact/hooks";
import { get, patch } from "../lib/api.ts";
import type { Notification } from "../lib/types.ts";
import { Icon } from "../components/ui.tsx";

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const unread = items.filter((item) => !item.read).length;

  async function load() {
    try {
      const data = await get<Notification[]>("/notifications");
      setItems(Array.isArray(data) ? data.slice(0, 6) : []);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function readAll() {
    await patch("/notifications/read-all");
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  }

  return (
    <div style={{ position: "relative" }}>
      <button class="btn btn-secondary icon-btn" onClick={() => setOpen(!open)} aria-label="Notifications">
        <Icon name="notifications" size={19} />
        {unread > 0 && (
          <span style={{ position: "absolute", top: "5px", right: "5px", minWidth: "17px", height: "17px", borderRadius: "999px", background: "var(--danger)", color: "white", fontSize: "10px", fontWeight: 800 }}>
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div class="card" style={{ position: "absolute", right: 0, top: "46px", width: "340px", padding: "14px", zIndex: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <strong class="headline">Notifications</strong>
            <button class="btn" style={{ minHeight: "30px", fontSize: "12px" }} onClick={readAll}>Mark all read</button>
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            {items.length === 0 && <p style={{ color: "var(--muted)", margin: "8px 0" }}>No notifications yet.</p>}
            {items.map((item) => (
              <a href="/notifications" class="panel" style={{ padding: "10px", display: "block" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "999px", marginTop: "6px", background: item.read ? "var(--border)" : "var(--accent)" }} />
                  <div>
                    <strong style={{ fontSize: "13px" }}>{item.title}</strong>
                    <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "12px" }}>{item.message}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
