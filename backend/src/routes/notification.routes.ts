// Notification routes.

import { createRoute, z } from "@hono/zod-openapi";
import type { Handler, MiddlewareHandler } from "hono";
import * as notifCtrl from "../controllers/notification.controller.ts";
import { auth } from "../middleware/auth.ts";
import {
  bearerAuth,
  ErrorResponseSchema,
  jsonErrorResponses,
  jsonOkResponse,
  notificationListResponse,
  notificationSchema,
} from "../docs/openapi.ts";

const tag = ["Notifications"];
const notifIdParam = z.object({
  notificationId: z.string().regex(/^[a-fA-F0-9]{24}$/),
});
const listQuery = z.object({
  read: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const simpleCount = z.object({ count: z.number().int() }).openapi("UnreadCount");
const simpleRead = z.object({ read: z.boolean() }).openapi("NotificationReadResult");
const simpleAll = z.object({ updated: z.number().int() }).openapi("AllReadResult");

export const listNotificationsRoute = createRoute({
  method: "get",
  path: "/api/notifications",
  tags: tag,
  summary: "List my notifications",
  description: "Optional `read=true|false` filter, paginated newest first.",
  security: [{ bearerAuth: [] }],
  request: { query: listQuery },
  responses: {
    200: jsonOkResponse("Notifications", notificationListResponse),
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const unreadCountRoute = createRoute({
  method: "get",
  path: "/api/notifications/unread-count",
  tags: tag,
  summary: "Get unread notification count",
  description: "Returns just the number of unread notifications for the current user.",
  security: [{ bearerAuth: [] }],
  responses: {
    200: jsonOkResponse("Unread count", simpleCount),
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const markReadRoute = createRoute({
  method: "patch",
  path: "/api/notifications/:notificationId/read",
  tags: tag,
  summary: "Mark a notification as read",
  description: "Marks a single notification as read for the current user.",
  security: [{ bearerAuth: [] }],
  request: { params: notifIdParam },
  responses: {
    200: jsonOkResponse(
      "Notification",
      notificationSchema.nullable().openapi("NotificationResult"),
    ),
    ...jsonErrorResponses([{ status: 404, description: "Notification not found" }]),
  },
});

export const markAllReadRoute = createRoute({
  method: "patch",
  path: "/api/notifications/read-all",
  tags: tag,
  summary: "Mark all notifications as read",
  description: "Marks every unread notification for the current user as read.",
  security: [{ bearerAuth: [] }],
  responses: {
    200: jsonOkResponse("All marked as read", simpleAll),
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export type RouteEntry = {
  route: ReturnType<typeof createRoute>;
  handler: Handler;
  middleware: MiddlewareHandler[];
};

const m = (mw: MiddlewareHandler[]) => mw;

export const notificationRouteEntries: RouteEntry[] = [
  {
    route: listNotificationsRoute,
    handler: notifCtrl.listNotifications as Handler,
    middleware: m([auth()]),
  },
  { route: unreadCountRoute, handler: notifCtrl.unreadCount as Handler, middleware: m([auth()]) },
  { route: markReadRoute, handler: notifCtrl.markRead as Handler, middleware: m([auth()]) },
  { route: markAllReadRoute, handler: notifCtrl.markAllRead as Handler, middleware: m([auth()]) },
];
