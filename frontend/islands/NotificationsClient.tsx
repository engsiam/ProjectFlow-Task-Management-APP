import { useEffect, useState } from "preact/hooks";
import { getList, patch } from "../lib/api.ts";
import { requireClientAuth } from "../lib/auth.ts";
import { toast } from "../lib/toast.ts";
import {
  emitNotificationUpdate,
  subscribeNotificationUpdates,
} from "../lib/notification-events.ts";
import type { Notification } from "../lib/types.ts";
import {
  Badge,
  Button,
  EmptyState,
  Icon,
  Skeleton,
} from "../components/ui.tsx";
import { notificationHref, notificationIcon } from "../lib/notification-nav.ts";

export default function NotificationsClient() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  async function load() {
    requireClientAuth();
    setLoading(true);
    const data = await getList<Notification>("/notifications", { limit: 100 })
      .catch(() => []);
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    return subscribeNotificationUpdates((detail) => {
      if (detail.type === "read-one") {
        setItems((prev) =>
          prev.map((item) =>
            item.id === detail.id ? { ...item, read: true } : item
          )
        );
        return;
      }
      if (detail.type === "read-all") {
        setItems((prev) => prev.map((item) => ({ ...item, read: true })));
        return;
      }
      load();
    });
  }, []);

  async function markRead(id: string) {
    const target = items.find((item) => item.id === id);
    if (!target || target.read || busyId) return;

    setBusyId(id);
    setItems((prev) =>
      prev.map((item) => item.id === id ? { ...item, read: true } : item)
    );
    emitNotificationUpdate({ type: "read-one", id });

    try {
      await patch(`/notifications/${id}/read`);
      toast("Marked as read.", "success");
    } catch {
      await load();
      emitNotificationUpdate({ type: "refresh" });
    } finally {
      setBusyId(null);
    }
  }

  async function readAll() {
    if (markingAll || items.every((item) => item.read)) return;

    setMarkingAll(true);
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    emitNotificationUpdate({ type: "read-all" });

    try {
      await patch("/notifications/read-all");
      toast("All marked as read.", "success");
    } catch {
      await load();
      emitNotificationUpdate({ type: "refresh" });
    } finally {
      setMarkingAll(false);
    }
  }

  if (loading) return <Skeleton height={360} />;

  const unread = items.filter((item) => !item.read).length;

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div>
          <p
            class="mono"
            style={{ margin: 0, color: "var(--muted)", fontSize: "11px" }}
          >
            INBOX
          </p>
          <h2 class="headline" style={{ margin: "4px 0 0", fontSize: "32px" }}>
            Notifications
          </h2>
        </div>
        <Button onClick={readAll} disabled={!unread || markingAll}>
          <Icon name="done_all" size={18} /> Mark all read
        </Button>
      </section>
      {items.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Badge tone={unread ? "warning" : "success"}>
            {unread ? `${unread} unread` : "Inbox caught up"}
          </Badge>
          <span style={{ color: "var(--muted)", fontSize: "13px" }}>
            {items.length} total notification{items.length === 1 ? "" : "s"}
          </span>
        </div>
      )}
      {items.length === 0
        ? (
          <EmptyState
            icon="notifications_off"
            title="All clear"
            body="Notifications for assignments, mentions, and invitations appear here."
          />
        )
        : (
          <div
            class="card"
            style={{ padding: "14px", display: "grid", gap: "10px" }}
          >
            {items.map((item) => (
              <div
                key={item.id}
                class="panel"
                style={{
                  padding: "0",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "0",
                  alignItems: "stretch",
                  overflow: "hidden",
                }}
              >
                <a
                  href={notificationHref(item)}
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "14px",
                    textDecoration: "none",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      background: item.read
                        ? "var(--surface-2)"
                        : "color-mix(in srgb, var(--primary), transparent 85%)",
                      color: item.read ? "var(--muted)" : "var(--primary)",
                    }}
                  >
                    <Icon name={notificationIcon(item)} size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        flexWrap: "nowrap",
                      }}
                    >
                      <strong>
                        {item.title?.length > 60
                          ? item.title.slice(0, 60) + "…"
                          : item.title}
                      </strong>
                      {!item.read && <Badge tone="warning">Unread</Badge>}
                    </div>
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "var(--muted)",
                        fontSize: "13px",
                      }}
                    >
                      {item.message?.length > 120
                        ? item.message.slice(0, 120) + "…"
                        : item.message}
                    </p>
                  </div>
                </a>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 14px 0 0",
                  }}
                >
                  <button
                    type="button"
                    class="btn btn-secondary"
                    style={{
                      whiteSpace: "nowrap",
                      fontSize: "12px",
                      minHeight: "30px",
                    }}
                    disabled={item.read || busyId === item.id || markingAll}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      markRead(item.id);
                    }}
                  >
                    {item.read
                      ? "Read"
                      : busyId === item.id
                      ? "Saving..."
                      : "Mark read"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
