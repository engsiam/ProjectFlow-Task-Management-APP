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

const taskUserSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  avatar: true,
} as const;

const taskProjectSelect = {
  id: true,
  name: true,
  status: true,
  ownerId: true,
} as const;

const taskInclude = {
  assignee: { select: taskUserSelect },
  creator: { select: taskUserSelect },
  project: { select: taskProjectSelect },
  _count: { select: { comments: true } },
} as const;

const sortableTaskFields = new Set([
  "createdAt",
  "dueDate",
  "order",
  "priority",
  "status",
  "title",
  "updatedAt",
]);

const buildWhere = (base: Record<string, unknown>, query: ListTasksQuery) => {
  const where: Record<string, unknown> = { ...base };
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
    if (query.dueAfter) {
      (where.dueDate as Record<string, Date>).gte = query.dueAfter;
    }
    if (query.dueBefore) {
      (where.dueDate as Record<string, Date>).lte = query.dueBefore;
    }
  }
  if (query.overdue) {
    where.dueDate = { lt: new Date() };
    where.status = { not: "DONE" };
  }
  return where;
};

const buildOrderBy = (query: ListTasksQuery) => {
  const requested = query.sort?.replace(/^-/, "") ?? "order";
  const sortField = sortableTaskFields.has(requested) ? requested : "order";
  const order = query.sort?.startsWith("-") ? "desc" : "asc";
  return [
    { [sortField]: order } as Record<string, "asc" | "desc">,
    { createdAt: "desc" as const },
  ];
};

const paginate = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

export const listForUser = async (userId: string, query: ListTasksQuery) => {
  const myProjects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
      status: { in: ["ACTIVE", "COMPLETED"] },
    },
    select: { id: true },
  });
  const projectIds = myProjects.map((project) => project.id);
  if (projectIds.length === 0) {
    return {
      items: [],
      pagination: paginate(query.page, query.limit, 0),
    };
  }

  const where = buildWhere({ projectId: { in: projectIds } }, query);
  const skip = (query.page - 1) * query.limit;
  const [total, items] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: buildOrderBy(query),
      skip,
      take: query.limit,
    }),
  ]);

  return {
    items,
    pagination: paginate(query.page, query.limit, total),
  };
};

export const listForProject = async (
  _userId: string,
  projectId: string,
  query: ListTasksQuery,
) => {
  const where = buildWhere({ projectId }, query);
  const skip = (query.page - 1) * query.limit;
  const [total, items] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: buildOrderBy(query),
      skip,
      take: query.limit,
    }),
  ]);

  return {
    items,
    pagination: paginate(query.page, query.limit, total),
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
  // Inline access check to avoid extra query — project already loaded
  if (task.project.ownerId !== userId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: task.projectId, userId } },
    });
    if (!member) throw new ForbiddenError("You are not a member of this project");
  }
  return task;
};

export const create = async (userId: string, projectId: string, input: CreateTaskInput) => {
  // Lightweight access check: one query instead of two
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, status: true, ownerId: true },
  });
  if (!project) throw new NotFoundError("Project not found");
  if (project.status === "ARCHIVED") {
    throw new BadRequestError("Cannot add tasks to an archived project");
  }
  if (project.ownerId !== userId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { id: true, role: true },
    });
    if (!member) throw new ForbiddenError("You are not a member of this project");
    if (member.role === "VIEWER") throw new ForbiddenError("Requires role Team Member or higher");
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
  // Inline access check — project already loaded
  if (existing.project.ownerId !== userId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: existing.projectId, userId } },
      select: { id: true, role: true },
    });
    if (!member) throw new ForbiddenError("You are not a member of this project");
    if (member.role === "VIEWER") throw new ForbiddenError("Requires role Team Member or higher");
  }

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
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { ownerId: true } } },
  });
  if (!existing) throw new NotFoundError("Task not found");
  if (existing.project.ownerId !== userId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: existing.projectId, userId } },
      select: { id: true, role: true },
    });
    if (!member) throw new ForbiddenError("You are not a member of this project");
    if (member.role === "VIEWER") throw new ForbiddenError("Requires role Team Member or higher");
  }

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
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { ownerId: true } } },
  });
  if (!existing) throw new NotFoundError("Task not found");
  if (existing.project.ownerId !== userId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: existing.projectId, userId } },
      select: { id: true, role: true },
    });
    if (!member) throw new ForbiddenError("You are not a member of this project");
    if (member.role === "VIEWER") throw new ForbiddenError("Requires role Team Member or higher");
  }
  return await prisma.task.update({
    where: { id: taskId },
    data: { status: input.status, order: input.order },
  });
};

export const remove = async (userId: string, taskId: string) => {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { ownerId: true, name: true } } },
  });
  if (!existing) throw new NotFoundError("Task not found");
  // Inline access check
  let userRole = existing.project.ownerId === userId ? "ADMIN" : "VIEWER";
  if (existing.project.ownerId !== userId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: existing.projectId, userId } },
      select: { id: true, role: true },
    });
    if (!member) throw new ForbiddenError("You are not a member of this project");
    if (member.role === "VIEWER") throw new ForbiddenError("Requires role Team Member or higher");
    userRole = member.role as string;
  }
  // Only ADMIN/Project Manager or the creator can delete
  if (existing.creatorId !== userId && !isRoleAtLeast(userRole as RoleType, "PROJECT_MANAGER")) {
    throw new ForbiddenError("Only the creator or a Project Manager+ can delete this task");
  }
  await prisma.task.delete({ where: { id: taskId } });
  await logActivity({
    actorId: userId,
    action: "TASK_DELETED",
    entityType: "TASK",
    entityId: taskId,
    projectId: existing.projectId,
    metadata: { title: existing.title, projectName: existing.project.name },
  });
};
