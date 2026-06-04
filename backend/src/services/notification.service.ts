// Notification service.

import { prisma } from "../prisma/client.ts";
import type { NotificationTypeType } from "../types/domain.ts";
import { cacheGet, cacheSet, cacheDelete } from "../utils/cache.ts";

export type NotifyInput = {
  userId: string;
  type: NotificationTypeType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
};

function flushUserCache(userId: string) {
  cacheDelete(`notif:unread:${userId}`);
  cacheDelete(`notif:list:${userId}:1:50:`);
  cacheDelete(`notif:list:${userId}:1:100:`);
  cacheDelete(`notif:list:${userId}:1:50:true`);
  cacheDelete(`notif:list:${userId}:1:100:true`);
  cacheDelete(`notif:list:${userId}:1:50:false`);
  cacheDelete(`notif:list:${userId}:1:100:false`);
}

export const notifyUser = async (input: NotifyInput) => {
  try {
    const result = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data as never,
      },
    });
    flushUserCache(input.userId);
    return result;
  } catch (err) {
    console.error("[Notification] failed:", err);
    return null;
  }
};

export const notifyMany = async (inputs: NotifyInput[]) => {
  if (inputs.length === 0) return [];
  try {
    const result = await prisma.notification.createMany({
      data: inputs.map((i) => ({
        userId: i.userId,
        type: i.type,
        title: i.title,
        message: i.message,
        data: i.data as never,
      })),
    });
    const userIds = new Set(inputs.map((i) => i.userId));
    for (const uid of userIds) flushUserCache(uid);
    return result;
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
  const cacheKey = `notif:list:${userId}:${page}:${limit}:${String(read ?? "")}`;
  const cached = cacheGet<Awaited<ReturnType<typeof queryDb>>>(cacheKey);
  if (cached) return cached;

  async function queryDb() {
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
  }

  const result = await queryDb();
  cacheSet(cacheKey, result, 10_000);
  return result;
};

export const unreadCount = async (userId: string) => {
  const cacheKey = `notif:unread:${userId}`;
  const cached = cacheGet<number>(cacheKey);
  if (cached !== undefined) return cached;
  const count = await prisma.notification.count({
    where: { userId, read: false },
  });
  cacheSet(cacheKey, count, 10_000);
  return count;
};

export const markRead = async (userId: string, notificationId: string) => {
  const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notif) return null;
  if (notif.userId !== userId) return null;
  const result = await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
  flushUserCache(userId);
  return result;
};

export const markAllRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  flushUserCache(userId);
  return result.count;
};
