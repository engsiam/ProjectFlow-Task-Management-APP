// Notification service.

import { prisma } from "../prisma/client.ts";
import type { NotificationTypeType } from "../types/domain.ts";

export type NotifyInput = {
  userId: string;
  type: NotificationTypeType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
};

export const notifyUser = async (input: NotifyInput) => {
  try {
    return await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data as never,
      },
    });
  } catch (err) {
    console.error("[Notification] failed:", err);
    return null;
  }
};

export const notifyMany = async (inputs: NotifyInput[]) => {
  if (inputs.length === 0) return [];
  try {
    return await prisma.notification.createMany({
      data: inputs.map((i) => ({
        userId: i.userId,
        type: i.type,
        title: i.title,
        message: i.message,
        data: i.data as never,
      })),
    });
  } catch (err) {
    console.error("[Notification.batch] failed:", err);
    return null;
  }
};

export const listForUser = async (
  userId: string,
  page: number,
  limit: number,
  read?: boolean,
) => {
  const where: Record<string, unknown> = { userId };
  if (typeof read === "boolean") where.read = read;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

export const unreadCount = async (userId: string) => {
  const count = await prisma.notification.count({
    where: { userId, read: false },
  });
  return count;
};

export const markRead = async (userId: string, notificationId: string) => {
  const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notif) return null;
  if (notif.userId !== userId) return null;
  return await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
};

export const markAllRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return result.count;
};
