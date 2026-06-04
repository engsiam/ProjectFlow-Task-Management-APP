import { useEffect, useRef, useState } from "preact/hooks";
import { get, getList, patch } from "../lib/api.ts";
import {
  emitNotificationUpdate,
  subscribeNotificationUpdates,
} from "../lib/notification-events.ts";
import type { Notification } from "../lib/types.ts";
import { Icon } from "../components/ui.tsx";
import { toast } from "../lib/toast.ts";
import { notificationHref, notificationIcon } from "../lib/notification-nav.ts";

export default function NotificationDropdown() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [updating, setUpdating] = useState(false);

  async function load() {
    try {
      const [data, unreadData] = await Promise.all([
        getList<Notification>("/notifications", { limit: 6 }),
        get<{ count: number }>("/notifications/unread-count"),
      ]);
      setItems(data.slice(0, 6));
      setUnread(unreadData.count ?? 0);
    } catch {
      setItems([]);
      setUnread(0);
    }
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
        setUnread((prev) => Math.max(0, prev - 1));
        return;
      }
      if (detail.type === "read-all") {
        setItems((prev) => prev.map((item) => ({ ...item, read: true })));
        setUnread(0);
        return;
      }
      load();
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    load();

    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    globalThis.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      globalThis.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function readAll() {
    if (!unread || updating) return;

    setUpdating(true);
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnread(0);
    emitNotificationUpdate({ type: "read-all" });

    try {
      await patch("/notifications/read-all");
      toast("All marked as read.", "success");
    } catch {
      await load();
      emitNotificationUpdate({ type: "refresh" });
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        class="btn btn-secondary icon-btn"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Icon name="notifications" size={19} />
        {unread > 0 && (
          <span
            class="notification-badge"
            style={{
              position: "absolute",
              top: "5px",
              right: "5px",
              minWidth: "17px",
              height: "17px",
              borderRadius: "999px",
              background: "var(--danger)",
              color: "white",
              fontSize: "10px",
              fontWeight: 800,
            }}
          >
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div
          class="card"
          style={{
            position: "absolute",
            right: 0,
            top: "46px",
            width: "340px",
            padding: "14px",
            zIndex: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <strong class="headline">Notifications</strong>
            <button
              type="button"
              class="btn"
              style={{ minHeight: "30px", fontSize: "12px" }}
              onClick={readAll}
              disabled={!unread || updating}
            >
              Mark all read
            </button>
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            {items.length === 0 && (
              <p style={{ color: "var(--muted)", margin: "8px 0" }}>
                No notifications yet.
              </p>
            )}
            {items.map((item) => (
              <a
                key={item.id}
                href={notificationHref(item)}
                class="panel"
                style={{ padding: "10px", display: "block", textDecoration: "none" }}
                onClick={() => setOpen(false)}
              >
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
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
                    <Icon name={notificationIcon(item)} size={16} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <strong style={{ fontSize: "13px" }}>{item.title}</strong>
                      {!item.read && (
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "999px",
                            background: "var(--accent)",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <p
                      style={{
                        margin: "2px 0 0",
                        color: "var(--muted)",
                        fontSize: "12px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.message}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
          <a
            href="/notifications"
            class="btn btn-secondary"
            style={{ width: "100%", marginTop: "12px" }}
            onClick={() => setOpen(false)}
          >
            View all notifications
          </a>
        </div>
      )}
    </div>
  );
}
