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
    where.status = { notIn: ["DONE", "COMPLETED"] };
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

export const listForUser = async (
  userId: string,
  userRole: RoleType | undefined,
  query: ListTasksQuery,
) => {
  // Global ADMIN/PROJECT_MANAGER see tasks from every project (workspace
  // managers). Global VIEWER accounts see tasks from every project too
  // (workspace-wide read). Everyone else only sees tasks in projects they
  // own or are a member of.
  const isGlobalManager = userRole && isRoleAtLeast(userRole, "PROJECT_MANAGER");
  const isGlobalViewer = userRole === "VIEWER";
  const projectWhere = isGlobalManager || isGlobalViewer
    ? { status: { in: ["ACTIVE", "COMPLETED"] } }
    : {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
      status: { in: ["ACTIVE", "COMPLETED"] },
    };
  const myProjects = await prisma.project.findMany({
    where: projectWhere,
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

export const getById = async (
  userId: string,
  userRole: RoleType | undefined,
  taskId: string,
) => {
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
    if (userRole === "VIEWER") {
      (task.project as Record<string, unknown>).currentRole = "VIEWER";
    } else {
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId } },
        select: { role: true },
      });
      if (!member) throw new ForbiddenError("You are not a member of this project");
      (task.project as Record<string, unknown>).currentRole = member.role;
    }
  } else {
    (task.project as Record<string, unknown>).currentRole = "ADMIN";
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
  if (project.status === "ARCHIVED" || project.status === "ON_HOLD") {
    throw new BadRequestError(
      `Cannot add tasks to a ${project.status === "ON_HOLD" ? "project on hold" : "archived project"}`,
    );
  }
  if (project.ownerId !== userId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { id: true, role: true },
    });
    if (!member) throw new ForbiddenError("You are not a member of this project");
    if (!isRoleAtLeast(member.role as RoleType, "TEAM_MEMBER")) throw new ForbiddenError("Requires role Team Member or higher");
  }
  if (input.assigneeId) {
    const assigneeUser = await prisma.user.findUnique({
      where: { id: input.assigneeId },
      select: { id: true, status: true },
    });
    if (!assigneeUser || assigneeUser.status !== "ACTIVE") {
      throw new BadRequestError("Assignee not found");
    }
  }

  // Cannot create a task already marked as completed
  if (input.status === "COMPLETED" || input.status === "DONE") {
    throw new BadRequestError(
      "A new task cannot start in the completed state",
    );
  }

  // Past dates are not allowed for deadlines
  if (input.dueDate) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (new Date(input.dueDate) < startOfToday) {
      throw new BadRequestError("Please select a valid deadline");
    }
  }

  // Duplicate title guard inside the same project
  const trimmedTitle = input.title?.trim();
  if (trimmedTitle) {
    const duplicate = await prisma.task.findFirst({
      where: {
        projectId,
        title: { equals: trimmedTitle },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestError("This task already exists in the project");
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
    if (!isRoleAtLeast(member.role as RoleType, "TEAM_MEMBER")) throw new ForbiddenError("Requires role Team Member or higher");
    // Members below PROJECT_MANAGER can only update tasks they own or are assigned to
    if (
      !isRoleAtLeast(member.role as RoleType, "PROJECT_MANAGER") &&
      existing.assigneeId !== userId &&
      existing.creatorId !== userId
    ) {
      throw new ForbiddenError("You can only update tasks assigned to you");
    }
  }

  // Validate assignee exists and is active
  if (input.assigneeId !== undefined) {
    const assigneeUser = await prisma.user.findUnique({
      where: { id: input.assigneeId },
      select: { id: true, status: true },
    });
    if (!assigneeUser || assigneeUser.status !== "ACTIVE") {
      throw new BadRequestError("Assignee not found");
    }
  }

  // Completed tasks cannot be reassigned or moved
  const existingIsDone = existing.status === "DONE" ||
    existing.status === "COMPLETED";
  if (existingIsDone) {
    if (input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId) {
      throw new BadRequestError("Completed tasks cannot be reassigned");
    }
    if (input.status !== undefined && input.status !== "DONE" &&
        input.status !== "COMPLETED") {
      throw new BadRequestError("Completed tasks cannot be reopened");
    }
  }

  // Past dates are not allowed for deadlines (unless the task is already overdue)
  if (input.dueDate !== undefined && input.dueDate !== null) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (new Date(input.dueDate) < startOfToday) {
      throw new BadRequestError("Please select a valid deadline");
    }
  }

  // Duplicate title guard inside the same project
  if (input.title !== undefined) {
    const trimmed = input.title.trim();
    if (trimmed) {
      const duplicate = await prisma.task.findFirst({
        where: {
          projectId: existing.projectId,
          title: { equals: trimmed },
          id: { not: taskId },
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new BadRequestError("This task already exists in the project");
      }
    }
  }

  const isDoneChange = input.status && input.status !== existing.status;
  const isDoneNow = (input.status ?? existing.status) === "DONE" ||
    (input.status ?? existing.status) === "COMPLETED";
  const wasDoneBefore = existing.status === "DONE" ||
    existing.status === "COMPLETED";

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

  // Notify on unassignment
  if (
    input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId &&
    existing.assigneeId && existing.assigneeId !== userId
  ) {
    await notifyUser({
      userId: existing.assigneeId,
      type: "TASK_ASSIGNED",
      title: "Unassigned from task",
      message: `You have been unassigned from "${task.title}"`,
      data: { taskId, projectId: existing.projectId },
    });
  }

  // Notify assignee on any field change (title, description, priority, dueDate, status)
  const hasContentChange =
    input.title !== undefined || input.description !== undefined ||
    input.priority !== undefined || input.dueDate !== undefined ||
    input.labels !== undefined;
  if (hasContentChange && existing.assigneeId && existing.assigneeId !== userId) {
    const changedFields: string[] = [];
    if (input.title !== undefined && input.title !== existing.title) changedFields.push("title");
    if (input.description !== undefined) changedFields.push("description");
    if (input.priority !== undefined && input.priority !== existing.priority) changedFields.push("priority");
    if (input.dueDate !== undefined) changedFields.push("due date");
    if (input.labels !== undefined) changedFields.push("labels");
    if (changedFields.length > 0) {
      await notifyUser({
        userId: existing.assigneeId,
        type: "TASK_STATUS",
        title: "Task updated",
        message: `"${task.title}" was updated (${changedFields.join(", ")})`,
        data: { taskId, projectId: existing.projectId },
      });
    }
  }

  // Notify creator on completion
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
        message: `"${task.title}" was marked as completed`,
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
    if (!isRoleAtLeast(member.role as RoleType, "TEAM_MEMBER")) throw new ForbiddenError("Requires role Team Member or higher");
    if (
      !isRoleAtLeast(member.role as RoleType, "PROJECT_MANAGER") &&
      existing.assigneeId !== userId &&
      existing.creatorId !== userId
    ) {
      throw new ForbiddenError("You can only move tasks assigned to you");
    }
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
      completedAt: (input.status === "DONE" || input.status === "COMPLETED") &&
          existing.status !== "DONE" && existing.status !== "COMPLETED"
        ? new Date()
        : input.status !== "DONE" && input.status !== "COMPLETED" &&
          (existing.status === "DONE" || existing.status === "COMPLETED")
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
    if (!isRoleAtLeast(member.role as RoleType, "TEAM_MEMBER")) throw new ForbiddenError("Requires role Team Member or higher");
    if (
      !isRoleAtLeast(member.role as RoleType, "PROJECT_MANAGER") &&
      existing.assigneeId !== userId &&
      existing.creatorId !== userId
    ) {
      throw new ForbiddenError("You can only reorder tasks assigned to you");
    }
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
    if (!isRoleAtLeast(member.role as RoleType, "TEAM_MEMBER")) throw new ForbiddenError("Requires role Team Member or higher");
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
