// Comment service.

import { prisma } from "../prisma/client.ts";
import { ForbiddenError, NotFoundError } from "../utils/errors.ts";
import { extractMentions } from "../utils/id.ts";
import { logActivity } from "./activity.service.ts";
import { notifyUser } from "./notification.service.ts";
import type {
  CreateCommentInput,
  ListCommentsQuery,
  UpdateCommentInput,
} from "../validators/comment.validator.ts";

const ensureProjectAccess = async (
  userId: string,
  projectId: string,
  minRole: "VIEWER" | "TEAM_MEMBER" | "PROJECT_MANAGER" | "ADMIN" = "VIEWER",
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, name: true },
  });
  if (!project) throw new NotFoundError("Project not found");
  if (project.ownerId === userId) return { project };
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) throw new ForbiddenError("You are not a member of this project");
  const rank = { VIEWER: 1, TEAM_MEMBER: 2, PROJECT_MANAGER: 3, ADMIN: 4 }[member.role as "VIEWER"];
  const min = { VIEWER: 1, TEAM_MEMBER: 2, PROJECT_MANAGER: 3, ADMIN: 4 }[minRole];
  if (rank < min) throw new ForbiddenError(`Requires role ${minRole} or higher`);
  return { project };
};

export const listForTask = async (userId: string, taskId: string, query: ListCommentsQuery) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  if (!task) throw new NotFoundError("Task not found");
  await ensureProjectAccess(userId, task.projectId, "VIEWER");
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where: { taskId },
      include: {
        author: { select: { id: true, name: true, username: true, avatar: true } },
        mentions: {
          include: { user: { select: { id: true, name: true, username: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
      skip,
      take: query.limit,
    }),
    prisma.comment.count({ where: { taskId } }),
  ]);
  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
      hasNext: query.page * query.limit < total,
      hasPrev: query.page > 1,
    },
  };
};

export const create = async (userId: string, taskId: string, input: CreateCommentInput) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true, title: true, assigneeId: true, creatorId: true },
  });
  if (!task) throw new NotFoundError("Task not found");
  await ensureProjectAccess(userId, task.projectId, "TEAM_MEMBER");

  // Create comment
  const comment = await prisma.comment.create({
    data: { taskId, authorId: userId, content: input.content },
    include: {
      author: { select: { id: true, name: true, username: true, avatar: true } },
    },
  });

  const notificationPromises: Promise<void>[] = [];
  const mentionedUserIds = new Set<string>();
  const projectId = task.projectId;

  // Resolve mentions in parallel
  const mentionedUsernames = extractMentions(input.content);
  if (mentionedUsernames.length > 0) {
    const users = await prisma.user.findMany({
      where: { username: { in: mentionedUsernames }, status: "ACTIVE" },
      select: { id: true, username: true, name: true },
    });
    if (users.length > 0) {
      await prisma.mention.createMany({
        data: users.map((u) => ({ commentId: comment.id, userId: u.id, username: u.username })),
      });
      for (const u of users) {
        if (u.id === userId) continue;
        mentionedUserIds.add(u.id);
        notificationPromises.push(
          notifyUser({
            userId: u.id,
            type: "TASK_MENTIONED",
            title: "You were mentioned",
            message: `You were mentioned in a comment on "${task.title}"`,
            data: { taskId, projectId, commentId: comment.id },
          }),
        );
      }
    }
  }

  // Notify assignee/creator (skip self and already-mentioned)
  if (task.assigneeId && task.assigneeId !== userId && !mentionedUserIds.has(task.assigneeId)) {
    notificationPromises.push(
      notifyUser({
        userId: task.assigneeId,
        type: "COMMENT",
        title: "New comment on your task",
        message: `${comment.author.name} commented on "${task.title}"`,
        data: { taskId, projectId, commentId: comment.id },
      }),
    );
  }
  if (
    task.creatorId && task.creatorId !== userId &&
    task.creatorId !== task.assigneeId && !mentionedUserIds.has(task.creatorId)
  ) {
    notificationPromises.push(
      notifyUser({
        userId: task.creatorId,
        type: "COMMENT",
        title: "New comment on your task",
        message: `${comment.author.name} commented on "${task.title}"`,
        data: { taskId, projectId, commentId: comment.id },
      }),
    );
  }

  // Run notifications and activity log in parallel
  await Promise.all([
    ...notificationPromises,
    logActivity({
      actorId: userId,
      action: "COMMENT_ADDED",
      entityType: "COMMENT",
      entityId: comment.id,
      projectId,
      taskId,
      metadata: { excerpt: input.content.slice(0, 100) },
    }),
  ]);

  // Fetch mentions for response (only if there were any)
  if (mentionedUserIds.size > 0 || task.assigneeId || task.creatorId) {
    const mentions = await prisma.mention.findMany({
      where: { commentId: comment.id },
      include: { user: { select: { id: true, name: true, username: true } } },
    });
    return { ...comment, mentions };
  }

  return { ...comment, mentions: [] };
};

export const update = async (
  userId: string,
  commentId: string,
  input: UpdateCommentInput,
) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { task: { select: { projectId: true, title: true } } },
  });
  if (!comment) throw new NotFoundError("Comment not found");
  if (comment.authorId !== userId) throw new ForbiddenError("You can only edit your own comments");
  await ensureProjectAccess(userId, comment.task.projectId, "TEAM_MEMBER");

  // Re-resolve mentions
  const newMentions = extractMentions(input.content);
  const oldMentions = await prisma.mention.findMany({ where: { commentId } });
  await prisma.mention.deleteMany({ where: { commentId } });
  if (newMentions.length > 0) {
    const users = await prisma.user.findMany({
      where: { username: { in: newMentions }, status: "ACTIVE" },
      select: { id: true, username: true },
    });
    if (users.length > 0) {
      await prisma.mention.createMany({
        data: users.map((u) => ({ commentId, userId: u.id, username: u.username })),
      });
    }
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { content: input.content, edited: true },
    include: {
      author: { select: { id: true, name: true, username: true, avatar: true } },
      mentions: { include: { user: { select: { id: true, name: true, username: true } } } },
    },
  });

  // Notify newly mentioned users
  const oldMentionedIds = new Set(oldMentions.map((m) => m.userId));
  for (const m of updated.mentions) {
    if (!oldMentionedIds.has(m.userId) && m.userId !== userId) {
      await notifyUser({
        userId: m.userId,
        type: "TASK_MENTIONED",
        title: "You were mentioned",
        message: `You were mentioned in an edited comment on "${comment.task.title}"`,
        data: { taskId: comment.taskId, projectId: comment.task.projectId, commentId },
      });
    }
  }

  await logActivity({
    actorId: userId,
    action: "COMMENT_UPDATED",
    entityType: "COMMENT",
    entityId: commentId,
    projectId: comment.task.projectId,
    taskId: comment.taskId,
  });
  return updated;
};

export const remove = async (userId: string, commentId: string) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { task: { select: { projectId: true } } },
  });
  if (!comment) throw new NotFoundError("Comment not found");
  const project = await prisma.project.findUnique({
    where: { id: comment.task.projectId },
    include: { members: { where: { userId }, select: { role: true }, take: 1 } },
  });
  if (!project) throw new NotFoundError("Project not found");
  const member = project.members[0];
  const isOwner = project.ownerId === userId;
  const isManager = isOwner || (member && (member.role === "PROJECT_MANAGER" || member.role === "ADMIN"));
  if (comment.authorId !== userId && !isManager) {
    throw new ForbiddenError("You can only delete your own comments");
  }
  await prisma.comment.delete({ where: { id: commentId } });
  await logActivity({
    actorId: userId,
    action: "COMMENT_DELETED",
    entityType: "COMMENT",
    entityId: commentId,
    projectId: comment.task.projectId,
    taskId: comment.taskId,
  });
};
