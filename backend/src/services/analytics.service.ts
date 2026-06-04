// Analytics + dashboard.

import { prisma } from "../prisma/client.ts";
import type { RoleType } from "../types/domain.ts";

const dashboardUserSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  avatar: true,
} as const;

const dashboardProjectSelect = {
  id: true,
  name: true,
  status: true,
  ownerId: true,
} as const;

export const getDashboard = async (userId: string, userRole: RoleType | undefined) => {
  // Get project IDs first (required for all subsequent queries).
  // Global VIEWER accounts see every project in the workspace.
  const myProjects = await prisma.project.findMany({
    where: userRole === "VIEWER"
      ? { status: { in: ["ACTIVE", "COMPLETED"] } }
      : {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
        status: { in: ["ACTIVE", "COMPLETED"] },
      },
    select: { id: true },
  });
  const projectIds = myProjects.map((p) => p.id);

  if (projectIds.length === 0) {
    const unreadNotifications = await prisma.notification.count({
      where: { userId, read: false },
    });
    return {
      projects: { total: 0, active: 0, completed: 0, archived: 0 },
      tasks: {
        total: 0,
        byStatus: { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 },
        byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
        overdue: 0,
        completed: 0,
      },
      mine: {
        assignedOpen: 0,
        byStatus: { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 },
        overdue: 0,
      },
      notifications: { unread: unreadNotifications },
      recentActivity: [],
      activeProjects: [],
      myAssignedTasks: [],
      overdueTasks: [],
      memberWorkload: [],
    };
  }

  // Run all data queries in parallel
  const now = new Date();
  const [
    projectCountGroups,
    taskStatusGroups,
    taskPriorityGroups,
    overdueTasks,
    myAssignedOpen,
    myAssignedGroups,
    myOverdue,
    myTaskItems,
    overdueTaskItems,
    workloadGroups,
    unreadNotifications,
    recentActivity,
    archivedProjects,
  ] = await Promise.all([
    prisma.project.groupBy({
      by: ["status"],
      where: { id: { in: projectIds } },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId: { in: projectIds } },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["priority"],
      where: { projectId: { in: projectIds } },
      _count: { _all: true },
    }),
    prisma.task.count({
      where: {
        projectId: { in: projectIds },
        dueDate: { lt: now },
        status: { not: "DONE" },
      },
    }),
    prisma.task.count({
      where: {
        assigneeId: userId,
        projectId: { in: projectIds },
        status: { not: "DONE" },
      },
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { assigneeId: userId, projectId: { in: projectIds } },
      _count: { _all: true },
    }),
    prisma.task.count({
      where: {
        assigneeId: userId,
        projectId: { in: projectIds },
        dueDate: { lt: now },
        status: { not: "DONE" },
      },
    }),
    prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        OR: [{ assigneeId: userId }, { creatorId: userId }],
      },
      include: {
        assignee: { select: dashboardUserSelect },
        project: { select: dashboardProjectSelect },
        _count: { select: { comments: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        dueDate: { lt: now },
        status: { not: "DONE" },
      },
      include: {
        assignee: { select: dashboardUserSelect },
        project: { select: dashboardProjectSelect },
        _count: { select: { comments: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: {
        projectId: { in: projectIds },
        assigneeId: { not: null },
        status: { not: "DONE" },
      },
      _count: { _all: true },
    }),
    prisma.notification.count({ where: { userId, read: false } }),
    prisma.activityLog.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        actor: {
          select: { id: true, name: true, username: true, avatar: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.project.count({ where: { ownerId: userId, status: "ARCHIVED" } }),
  ]);

  // Compute project counts
  let totalProjects = 0, activeProjects = 0, completedProjects = 0;
  for (const g of projectCountGroups) {
    totalProjects += g._count._all;
    if (g.status === "ACTIVE") activeProjects = g._count._all;
    if (g.status === "COMPLETED") completedProjects = g._count._all;
  }

  // Task status breakdown
  const taskStatus: Record<string, number> = {
    TODO: 0,
    IN_PROGRESS: 0,
    REVIEW: 0,
    DONE: 0,
  };
  for (const g of taskStatusGroups) {
    taskStatus[g.status] = g._count._all;
  }
  const totalTasks = Object.values(taskStatus).reduce((a, b) => a + b, 0);

  // Task priority breakdown
  const taskPriority: Record<string, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    URGENT: 0,
  };
  for (const g of taskPriorityGroups) {
    taskPriority[g.priority] = g._count._all;
  }

  // My assigned by status
  const myTaskStatus: Record<string, number> = {
    TODO: 0,
    IN_PROGRESS: 0,
    REVIEW: 0,
    DONE: 0,
  };
  for (const g of myAssignedGroups) {
    myTaskStatus[g.status] = g._count._all;
  }

  const workloadUserIds = workloadGroups
    .map((group) => group.assigneeId)
    .filter((id): id is string => Boolean(id));
  const workloadUsers = workloadUserIds.length
    ? await prisma.user.findMany({
      where: { id: { in: workloadUserIds } },
      select: dashboardUserSelect,
    })
    : [];
  const workloadUserById = new Map(
    workloadUsers.map((user) => [user.id, user]),
  );
  const memberWorkload = workloadGroups
    .map((group) => {
      if (!group.assigneeId) return null;
      const user = workloadUserById.get(group.assigneeId);
      return user ? { user, count: group._count._all } : null;
    })
    .filter((
      item,
    ): item is { user: typeof workloadUsers[number]; count: number } => Boolean(item))
    .sort((a, b) => b.count - a.count);

  return {
    projects: {
      total: totalProjects,
      active: activeProjects,
      completed: completedProjects,
      archived: archivedProjects,
    },
    tasks: {
      total: totalTasks,
      byStatus: taskStatus,
      byPriority: taskPriority,
      overdue: overdueTasks,
      completed: taskStatus.DONE,
    },
    mine: {
      assignedOpen: myAssignedOpen,
      byStatus: myTaskStatus,
      overdue: myOverdue,
    },
    notifications: { unread: unreadNotifications },
    recentActivity,
    myAssignedTasks: myTaskItems,
    overdueTasks: overdueTaskItems,
    memberWorkload,
  };
};

export const getProjectAnalytics = async (
  userId: string,
  userRole: RoleType | undefined,
  projectId: string,
) => {
  // Verify access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, username: true, avatar: true },
          },
        },
      },
    },
  });
  if (!project) throw new Error("Project not found");
  const isMember = project.ownerId === userId ||
    project.members.some((m) => m.userId === userId);
  if (!isMember && userRole !== "VIEWER") throw new Error("Forbidden");

  const [statusGroups, priorityGroups, total, done, overdue] = await Promise
    .all([
      prisma.task.groupBy({
        by: ["status"],
        where: { projectId },
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ["priority"],
        where: { projectId },
        _count: { _all: true },
      }),
      prisma.task.count({ where: { projectId } }),
      prisma.task.count({ where: { projectId, status: "DONE" } }),
      prisma.task.count({
        where: {
          projectId,
          dueDate: { lt: new Date() },
          status: { not: "DONE" },
        },
      }),
    ]);

  const byStatus = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };
  for (const g of statusGroups) {
    (byStatus as Record<string, number>)[g.status] = g._count._all;
  }
  const byPriority = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
  for (const g of priorityGroups) {
    (byPriority as Record<string, number>)[g.priority] = g._count._all;
  }

  // Member workload: tasks per assignee in this project
  const memberWorkload = project.members.map((m) => {
    const open = statusGroups
      .filter((g) => g.status !== "DONE")
      .reduce((s, g) => s + 0, 0); // placeholder, replaced below
    return {
      user: m.user,
      role: m.role,
      openTasks: open,
      totalTasks: 0,
    };
  });
  // Better: aggregate via groupBy by assignee
  const workloadGroups = await prisma.task.groupBy({
    by: ["assigneeId", "status"],
    where: { projectId, assigneeId: { not: null } },
    _count: { _all: true },
  });
  const workloadMap = new Map<string, { total: number; open: number }>();
  for (const g of workloadGroups) {
    if (!g.assigneeId) continue;
    const entry = workloadMap.get(g.assigneeId) ?? { total: 0, open: 0 };
    entry.total += g._count._all;
    if (g.status !== "DONE") entry.open += g._count._all;
    workloadMap.set(g.assigneeId, entry);
  }
  const memberStats = project.members.map((m) => {
    const w = workloadMap.get(m.userId) ?? { total: 0, open: 0 };
    return {
      user: m.user,
      role: m.role,
      totalTasks: w.total,
      openTasks: w.open,
      doneTasks: w.total - w.open,
    };
  });

  // Project progress
  const progress = total ? Math.round((done / total) * 100) : 0;

  return {
    project: {
      id: project.id,
      name: project.name,
      color: project.color,
      status: project.status,
      progress,
    },
    tasks: {
      total,
      done,
      overdue,
      byStatus,
      byPriority,
    },
    members: memberStats,
    teamProductivity: {
      completionRate: total ? Math.round((done / total) * 100) : 0,
      averageTasksPerMember: project.members.length
        ? Math.round(total / project.members.length)
        : 0,
      activeMembers: memberStats.filter((m) => m.totalTasks > 0).length,
    },
  };
};
