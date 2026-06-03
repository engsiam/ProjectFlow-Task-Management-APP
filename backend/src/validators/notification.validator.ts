// Notification validators.

import { z } from "zod";

export const notificationIdParamSchema = z.object({
  notificationId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid notification id"),
});

export const listNotificationsQuerySchema = z.object({
  read: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
