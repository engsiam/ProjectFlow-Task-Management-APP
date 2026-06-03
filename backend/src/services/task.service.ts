// Task service.

import { prisma } from "../prisma/client.ts";
import { isRoleAtLeast, type RoleType } from "../types/domain.ts";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors.ts";
import { logActivity } from "./activity.service.ts";
import { notifyUser } from "./notification.service.ts";
import type {
  CreateTaskInput,
  ListTasksQuery,
  MoveTaskInput,
  ReorderTaskInput,
  UpdateTaskInput,
} from "../validators/task.validator.ts";

const ensureProjectAccess = async (
  userId: string,
  projectId: string,
  minRole: RoleType = "VIEWER",
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, name: true, status: true },
  });
  if (!project) throw new NotFoundError("Project not found");
  if (project.ownerId === userId) return { project, role: "OWNER" as RoleType };
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) throw new ForbiddenError("You are not a member of this project");
  if (!isRoleAtLeast(member.role as RoleType, minRole)) {
    throw new ForbiddenError(`Requires role ${minRole} or higher`);
  }
  return { project, role: member.role as RoleType };
};

export const listForProject = async (
  userId: string,
  projectId: string,
  query: ListTasksQuery,
) => {
  await ensureProjectAccess(userId, projectId, "VIEWER");
  const where: Record<string, unknown> = { projectId };
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.assigneeId) where.assigneeId = query.assigneeId;
  if (query.label) where.labels = { has: query.label };
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.dueBefore || query.dueAfter) {
    where.dueDate = {};
    if (query.dueAfter) (where.dueDate as Record<string, Date>).gte = query.dueAfter;
    if (query.dueBefore) (where.dueDate as Record<string, Date>).lte = query.dueBefore;
  }
  if (query.overdue) {
    where.dueDate = { lt: new Date() };
    where.status = { not: "DONE" };
  }

  const sortField = query.sort?.replace(/^-/, "") ?? "order";
  const order = query.sort?.startsWith("-") ? "desc" : "asc";
  const orderBy: Record<string, "asc" | "desc"> = { [sortField]: order };
  // Default: order asc, createdAt desc
  if (!query.sort) {
    orderBy.order = "asc";
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, username: true, avatar: true } },
        creator: { select: { id: true, name: true, username: true, avatar: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [
        orderBy as never,
        { createdAt: "desc" },
      ],
      skip,
      take: query.limit,
    }),
    prisma.task.count({ where }),
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

export const getById = async (userId: string, taskId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, name: true, username: true, avatar: true } },
      creator: { select: { id: true, name: true, username: true, avatar: true } },
      project: { select: { id: true, name: true, color: true, status: true, ownerId: true } },
      _count: { select: { comments: true } },
    },
  });
  if (!task) throw new NotFoundError("Task not found");
  await ensureProjectAccess(userId, task.projectId, "VIEWER");
  return task;
};

export const create = async (userId: string, projectId: string, input: CreateTaskInput) => {
  const { project } = await ensureProjectAccess(userId, projectId, "MEMBER");
  if (project.status === "ARCHIVED") {
    throw new BadRequestError("Cannot add tasks to an archived project");
  }
  if (input.assigneeId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: input.assigneeId } },
    });
    if (!member) {
      throw new BadRequestError("Assignee must be a member of the project");
    }
  }
  // Compute next order in the column
  let order = input.order;
  if (order === undefined) {
    const last = await prisma.task.findFirst({
      where: { projectId, status: input.status },
      orderBy: { order: "desc" },
    });
    order = last ? last.order + 1000 : 1000;
  }
  const task = await prisma.task.create({
    data: {
      projectId,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      assigneeId: input.assigneeId ?? null,
      creatorId: userId,
      dueDate: input.dueDate ?? null,
      labels: input.labels,
      order,
    },
    include: {
      assignee: { select: { id: true, name: true, username: true, avatar: true } },
      creator: { select: { id: true, name: true, username: true, avatar: true } },
    },
  });
  await logActivity({
    actorId: userId,
    action: "TASK_CREATED",
    entityType: "TASK",
    entityId: task.id,
    projectId,
    taskId: task.id,
    metadata: { title: task.title, status: task.status, priority: task.priority },
  });
  if (input.assigneeId && input.assigneeId !== userId) {
    await notifyUser({
      userId: input.assigneeId,
      type: "TASK_ASSIGNED",
      title: "You were assigned a task",
      message: `You have been assigned to "${task.title}"`,
      data: { taskId: task.id, projectId, priority: task.priority },
    });
  }
  return task;
};

export const update = async (userId: string, taskId: string, input: UpdateTaskInput) => {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { id: true, status: true, ownerId: true } } },
  });
  if (!existing) throw new NotFoundError("Task not found");
  await ensureProjectAccess(userId, existing.projectId, "MEMBER");

  // Validate assignee is member
  if (input.assigneeId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: existing.projectId, userId: input.assigneeId } },
    });
    if (!member) {
      throw new BadRequestError("Assignee must be a member of the project");
    }
  }

  const isDoneChange = input.status && input.status !== existing.status;
  const isDoneNow = (input.status ?? existing.status) === "DONE";
  const wasDoneBefore = existing.status === "DONE";

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.labels !== undefined ? { labels: input.labels } : {}),
      ...(input.order !== undefined ? { order: input.order } : {}),
      ...(isDoneNow && !wasDoneBefore ? { completedAt: new Date() } : {}),
      ...(!isDoneNow && wasDoneBefore ? { completedAt: null } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, username: true, avatar: true } },
      creator: { select: { id: true, name: true, username: true, avatar: true } },
    },
  });

  await logActivity({
    actorId: userId,
    action: isDoneChange ? "TASK_MOVED" : "TASK_UPDATED",
    entityType: "TASK",
    entityId: taskId,
    projectId: existing.projectId,
    taskId,
    metadata: {
      changes: input,
      from: isDoneChange ? existing.status : undefined,
      to: isDoneChange ? input.status : undefined,
    },
  });

  // Notify on assignment change
  if (
    input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId &&
    input.assigneeId && input.assigneeId !== userId
  ) {
    await notifyUser({
      userId: input.assigneeId,
      type: "TASK_ASSIGNED",
      title: "You were assigned a task",
      message: `You have been assigned to "${task.title}"`,
      data: { taskId, projectId: existing.projectId },
    });
  }

  // Notify on completion
  if (isDoneNow && !wasDoneBefore) {
    await logActivity({
      actorId: userId,
      action: "TASK_COMPLETED",
      entityType: "TASK",
      entityId: taskId,
      projectId: existing.projectId,
      taskId,
    });
    if (existing.creatorId !== userId) {
      await notifyUser({
        userId: existing.creatorId,
        type: "TASK_STATUS",
        title: "Task completed",
        message: `"${task.title}" was marked as DONE`,
        data: { taskId, projectId: existing.projectId },
      });
    }
  }

  return task;
};

export const move = async (userId: string, taskId: string, input: MoveTaskInput) => {
  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) throw new NotFoundError("Task not found");
  await ensureProjectAccess(userId, existing.projectId, "MEMBER");

  let newOrder = input.order;
  if (newOrder === undefined) {
    const last = await prisma.task.findFirst({
      where: { projectId: existing.projectId, status: input.status, NOT: { id: taskId } },
      orderBy: { order: "desc" },
    });
    newOrder = last ? last.order + 1000 : 1000;
  }
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: input.status,
      order: newOrder,
      completedAt: input.status === "DONE" && existing.status !== "DONE"
        ? new Date()
        : input.status !== "DONE" && existing.status === "DONE"
        ? null
        : undefined,
    },
  });
  await logActivity({
    actorId: userId,
    action: "TASK_MOVED",
    entityType: "TASK",
    entityId: taskId,
    projectId: existing.projectId,
    taskId,
    metadata: { from: existing.status, to: input.status, order: newOrder },
  });
  return updated;
};

export const reorder = async (userId: string, taskId: string, input: ReorderTaskInput) => {
  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) throw new NotFoundError("Task not found");
  await ensureProjectAccess(userId, existing.projectId, "MEMBER");
  return await prisma.task.update({
    where: { id: taskId },
    data: { status: input.status, order: input.order },
  });
};

export const remove = async (userId: string, taskId: string) => {
  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) throw new NotFoundError("Task not found");
  const { project, role } = await ensureProjectAccess(userId, existing.projectId, "MEMBER");
  // Only OWNER/MANAGER or the creator can delete
  if (existing.creatorId !== userId && !isRoleAtLeast(role, "MANAGER")) {
    throw new ForbiddenError("Only the creator or a MANAGER+ can delete this task");
  }
  await prisma.task.delete({ where: { id: taskId } });
  await logActivity({
    actorId: userId,
    action: "TASK_DELETED",
    entityType: "TASK",
    entityId: taskId,
    projectId: existing.projectId,
    metadata: { title: existing.title, projectName: project.name },
  });
};
