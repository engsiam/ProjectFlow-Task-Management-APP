// Notification controller. Reads validated input from c.req.valid (set by Hono's
// validator middleware that OpenAPIHono wires up via zValidator).

import type { Context } from "hono";
import * as notificationService from "../services/notification.service.ts";
import { respondOk } from "../utils/response.ts";
import { getUser } from "./_helpers.ts";
import type { ListNotificationsQuery } from "../validators/notification.validator.ts";

export const listNotifications = async (c: Context) => {
  const user = getUser(c);
  // deno-lint-ignore no-explicit-any
  const query = (c.req as any).valid("query") as ListNotificationsQuery;
  const result = await notificationService.listForUser(
    user.id,
    query.page,
    query.limit,
    query.read,
  );
  return respondOk(c, result, "Notifications");
};

export const unreadCount = async (c: Context) => {
  const user = getUser(c);
  const count = await notificationService.unreadCount(user.id);
  return respondOk(c, { count }, "Unread count");
};

export const markRead = async (c: Context) => {
  const user = getUser(c);
  const notificationId = c.req.param("notificationId");
  const result = await notificationService.markRead(user.id, notificationId);
  if (!result) return respondOk(c, { read: false }, "Notification not found");
  return respondOk(c, result, "Notification marked as read");
};

export const markAllRead = async (c: Context) => {
  const user = getUser(c);
  const count = await notificationService.markAllRead(user.id);
  return respondOk(c, { updated: count }, "All notifications marked as read");
};
