import { useEffect, useState } from "preact/hooks";
import { get, patch } from "../lib/api.ts";
import { requireClientAuth } from "../lib/auth.ts";
import type { Notification } from "../lib/types.ts";
import { Badge, Button, EmptyState, Icon, Skeleton } from "../components/ui.tsx";

export default function NotificationsClient() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    requireClientAuth();
    setLoading(true);
    const data = await get<Notification[]>("/notifications").catch(() => []);
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: string) {
    await patch(`/notifications/${id}/read`);
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, read: true } : item));
  }

  async function readAll() {
    await patch("/notifications/read-all");
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  }

  if (loading) return <Skeleton height={360} />;

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
        <div>
          <p class="mono" style={{ margin: 0, color: "var(--muted)", fontSize: "11px" }}>INBOX</p>
          <h2 class="headline" style={{ margin: "4px 0 0", fontSize: "32px" }}>Notifications</h2>
        </div>
        <Button onClick={readAll}><Icon name="done_all" size={18} /> Mark all read</Button>
      </section>
      {items.length === 0
        ? <EmptyState icon="notifications_off" title="All clear" body="Notifications for assignments, mentions, and invitations appear here." />
        : (
          <div class="card" style={{ padding: "14px", display: "grid", gap: "10px" }}>
            {items.map((item) => (
              <article class="panel" style={{ padding: "14px", display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "10px" }}>
                  <span class="brand-mark" style={{ width: "34px", height: "34px", background: item.read ? "var(--surface-2)" : "var(--primary)", color: item.read ? "var(--muted)" : "white" }}><Icon name="notifications" size={18} /></span>
                  <div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}><strong>{item.title}</strong>{!item.read && <Badge tone="warning">Unread</Badge>}</div>
                    <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>{item.message}</p>
                  </div>
                </div>
                <button class="btn btn-secondary" disabled={item.read} onClick={() => markRead(item.id)}>Mark read</button>
              </article>
            ))}
          </div>
        )}
    </div>
  );
}
