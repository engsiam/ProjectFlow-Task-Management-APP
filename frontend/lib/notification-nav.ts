import type { Notification } from "./types.ts";

export function notificationHref(n: Notification): string {
  const data = n.data || {};
  const projectId = data.projectId as string | undefined;
  const taskId = data.taskId as string | undefined;

  if (projectId) {
    if (taskId) return `/projects/${projectId}?taskId=${taskId}`;
    return `/projects/${projectId}`;
  }

  return "/notifications";
}

export function notificationIcon(n: Notification): string {
  const type = n.type ?? "";
  if (type.includes("ASSIGNED")) return "person_add";
  if (type.includes("MENTIONED")) return "alternate_email";
  if (type === "COMMENT") return "comment";
  if (type.includes("INVITATION")) return "mail";
  if (type.includes("ROLE")) return "badge";
  if (type.includes("REMOVED") || type.includes("REJECTED")) return "person_remove";
  if (type.includes("ACCEPTED")) return "check";
  if (type === "TASK_STATUS") return "task_alt";
  return "notifications";
}
