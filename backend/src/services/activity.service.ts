// Activity log service.

import { prisma } from "../prisma/client.ts";
import type { ActivityActionType } from "../types/domain.ts";

export type LogActivityInput = {
  actorId: string;
  action: ActivityActionType;
  entityType: "PROJECT" | "TASK" | "COMMENT" | "MEMBER" | "INVITATION";
  entityId: string;
  projectId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
};

export const logActivity = async (input: LogActivityInput) => {
  try {
    return await prisma.activityLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        projectId: input.projectId,
        taskId: input.taskId,
        metadata: input.metadata as never,
      },
    });
  } catch (err) {
    // Activity logging must never break the main flow
    console.error("[ActivityLog] failed:", err);
    return null;
  }
};

export const listProjectActivity = async (
  projectId: string,
  page: number,
  limit: number,
) => {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.activityLog.count({ where: { projectId } }),
  ]);
  // Bulk-fetch the unique actors (one IN query) instead of an N+1 $lookup
  // per row. The `[projectId, createdAt]` index makes the findMany fast.
  const actorIds = [...new Set(items.map((i) => i.actorId))];
  const actors = actorIds.length
    ? await prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true, username: true, avatar: true },
    })
    : [];
  const actorById = new Map(actors.map((a) => [a.id, a]));
  const enriched = items.map((item) => ({
    ...item,
    actor: actorById.get(item.actorId) ?? null,
  }));
  return {
    items: enriched,
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
