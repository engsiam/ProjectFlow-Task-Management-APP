// Analytics + dashboard.

import { prisma } from "../prisma/client.ts";

export const getDashboard = async (userId: string) => {
  // Projects the user is part of
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
  const projectIds = myProjects.map((p) => p.id);

  // Project counts
  const [totalProjects, activeProjects, completedProjects, archivedProjects] = await Promise.all([
    prisma.project.count({ where: { id: { in: projectIds } } }),
    prisma.project.count({ where: { id: { in: projectIds }, status: "ACTIVE" } }),
    prisma.project.count({ where: { id: { in: projectIds }, status: "COMPLETED" } }),
    prisma.project.count({ where: { ownerId: userId, status: "ARCHIVED" } }),
  ]);

  // Task status breakdown within my projects
  const taskStatusGroups = projectIds.length
    ? await prisma.task.groupBy({
      by: ["status"],
      where: { projectId: { in: projectIds } },
      _count: { _all: true },
    })
    : [];
  const taskStatus = {
    TODO: 0,
    IN_PROGRESS: 0,
    REVIEW: 0,
    DONE: 0,
  };
  for (const g of taskStatusGroups) {
    (taskStatus as Record<string, number>)[g.status] = g._count._all;
  }
  const totalTasks = Object.values(taskStatus).reduce((a, b) => a + b, 0);

  // Task priority breakdown
  const taskPriorityGroups = projectIds.length
    ? await prisma.task.groupBy({
      by: ["priority"],
      where: { projectId: { in: projectIds } },
      _count: { _all: true },
    })
    : [];
  const taskPriority = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
  for (const g of taskPriorityGroups) {
    (taskPriority as Record<string, number>)[g.priority] = g._count._all;
  }

  // Overdue tasks (assigned to me or in my projects, not done, due < now)
  const overdueTasks = projectIds.length
    ? await prisma.task.count({
      where: {
        projectId: { in: projectIds },
        dueDate: { lt: new Date() },
        status: { not: "DONE" },
      },
    })
    : 0;

  // Completed tasks (in my projects)
  const completedTasks = taskStatus.DONE;

  // My assigned open tasks
  const myAssignedOpen = await prisma.task.count({
    where: {
      assigneeId: userId,
      projectId: { in: projectIds },
      status: { not: "DONE" },
    },
  });

  // My assigned tasks by status
  const myAssignedGroups = projectIds.length
    ? await prisma.task.groupBy({
      by: ["status"],
      where: { assigneeId: userId, projectId: { in: projectIds } },
      _count: { _all: true },
    })
    : [];
  const myTaskStatus = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };
  for (const g of myAssignedGroups) {
    (myTaskStatus as Record<string, number>)[g.status] = g._count._all;
  }

  // My overdue
  const myOverdue = await prisma.task.count({
    where: {
      assigneeId: userId,
      projectId: { in: projectIds },
      dueDate: { lt: new Date() },
      status: { not: "DONE" },
    },
  });

  // Unread notifications
  const unreadNotifications = await prisma.notification.count({
    where: { userId, read: false },
  });

  // Recent activity (across my projects)
  const recentActivity = projectIds.length
    ? await prisma.activityLog.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        actor: { select: { id: true, name: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    : [];

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
      completed: completedTasks,
    },
    mine: {
      assignedOpen: myAssignedOpen,
      byStatus: myTaskStatus,
      overdue: myOverdue,
    },
    notifications: { unread: unreadNotifications },
    recentActivity,
  };
};

export const getProjectAnalytics = async (userId: string, projectId: string) => {
  // Verify access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
      },
    },
  });
  if (!project) throw new Error("Project not found");
  const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
  if (!isMember) throw new Error("Forbidden");

  const [statusGroups, priorityGroups, total, done, overdue] = await Promise.all([
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
      where: { projectId, dueDate: { lt: new Date() }, status: { not: "DONE" } },
    }),
  ]);

  const byStatus = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };
  for (const g of statusGroups) (byStatus as Record<string, number>)[g.status] = g._count._all;
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
