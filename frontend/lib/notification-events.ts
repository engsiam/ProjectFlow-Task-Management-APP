export type NotificationUpdateDetail =
  | { type: "refresh" }
  | { type: "read-one"; id: string }
  | { type: "read-all" };

const NOTIFICATION_EVENT = "projectflow:notifications-updated";

export function emitNotificationUpdate(
  detail: NotificationUpdateDetail = { type: "refresh" },
) {
  if (typeof globalThis.dispatchEvent !== "function") return;
  globalThis.dispatchEvent(
    new CustomEvent<NotificationUpdateDetail>(NOTIFICATION_EVENT, { detail }),
  );
}

export function subscribeNotificationUpdates(
  handler: (detail: NotificationUpdateDetail) => void,
) {
  if (typeof globalThis.addEventListener !== "function") return () => {};

  const listener = (event: Event) => {
    const detail = event instanceof CustomEvent
      ? event.detail as NotificationUpdateDetail | undefined
      : undefined;
    handler(detail ?? { type: "refresh" });
  };

  globalThis.addEventListener(NOTIFICATION_EVENT, listener as EventListener);
  return () =>
    globalThis.removeEventListener(
      NOTIFICATION_EVENT,
      listener as EventListener,
    );
}
