// Chart-ready analytics aggregations.
// Produces the data shapes consumed by the frontend Recharts components.

import { prisma } from "../prisma/client.ts";
import type { RoleType } from "../types/domain.ts";

type UserLite = { id: string; name: string; username: string; avatar: string | null };

const isCompletedStatus = (status: string) =>
  status === "COMPLETED" || status === "DONE";

const normalizeTaskStatus = (
  status: string,
): "TODO" | "IN_PROGRESS" | "COMPLETED" | null => {
  if (status === "TODO") return "TODO";
  if (status === "IN_PROGRESS") return "IN_PROGRESS";
  if (status === "COMPLETED" || status === "DONE") return "COMPLETED";
  return null;
};

const normalizePriority = (
  priority: string,
): "HIGH" | "MEDIUM" | "LOW" | null => {
  if (priority === "HIGH" || priority === "URGENT") return "HIGH";
  if (priority === "MEDIUM") return "MEDIUM";
  if (priority === "LOW") return "LOW";
  return null;
};

const buildUserMap = (rows: UserLite[]) => new Map(rows.map((u) => [u.id, u]));

const buildProjectFilter = (userId: string, userRole: RoleType | undefined) =>
  userRole === "VIEWER"
    ? { status: { in: ["ACTIVE", "COMPLETED"] } }
    : {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
      status: { in: ["ACTIVE", "COMPLETED"] },
    };

export type PriorityDatum = {
  name: "HIGH" | "MEDIUM" | "LOW";
  label: string;
  value: number;
  color: string;
};

export type StatusDatum = {
  name: "TODO" | "IN_PROGRESS" | "COMPLETED";
  label: string;
  value: number;
  color: string;
};

export type TrendDatum = {
  date: string; // YYYY-MM-DD
  label: string; // Mon 12
  created: number;
  completed: number;
};

export type ProductivityDatum = {
  userId: string;
  name: string;
  avatar?: string | null;
  completed: number;
  inProgress: number;
  total: number;
};

export type ComparisonDatum = {
  label: string;
  completed: number;
  overdue: number;
  pending: number;
};

export type AnalyticsKPI = {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number; // 0-100
};

export type DashboardCharts = {
  kpi: AnalyticsKPI;
  byPriority: PriorityDatum[];
  byStatus: StatusDatum[];
  trend: TrendDatum[];
  productivity: ProductivityDatum[];
  comparison: ComparisonDatum[];
  generatedAt: string;
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "#ef4444",
  MEDIUM: "#f59e0b",
  LOW: "#3b82f6",
};
const PRIORITY_LABELS: Record<string, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const STATUS_COLORS: Record<string, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  COMPLETED: "#22c55e",
};
const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const TREND_DAYS = 30;

const formatDay = (d: Date) => {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const shortDay = (d: Date) =>
  new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric" }).format(d);

const buildTrend = (createdAt: Date[], completedAt: (Date | null)[]): TrendDatum[] => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const buckets: TrendDatum[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    buckets.push({ date: formatDay(d), label: shortDay(d), created: 0, completed: 0 });
  }
  const byDate = new Map(buckets.map((b) => [b.date, b]));
  for (const d of createdAt) {
    const t = new Date(d);
    t.setUTCHours(0, 0, 0, 0);
    const key = formatDay(t);
    const bucket = byDate.get(key);
    if (bucket) bucket.created += 1;
  }
  for (const d of completedAt) {
    if (!d) continue;
    const t = new Date(d);
    t.setUTCHours(0, 0, 0, 0);
    const key = formatDay(t);
    const bucket = byDate.get(key);
    if (bucket) bucket.completed += 1;
  }
  return buckets;
};

export const getDashboardCharts = async (
  userId: string,
  userRole: RoleType | undefined,
): Promise<DashboardCharts> => {
  const projectFilter = buildProjectFilter(userId, userRole);
  const projectWhere = { projectId: { in: [] as string[] } } as Record<string, unknown>;

  const projects = await prisma.project.findMany({
    where: projectFilter,
    select: { id: true, name: true, status: true },
  });
  const projectIds = projects.map((p) => p.id);
  (projectWhere.projectId as { in: string[] }).in = projectIds;

  if (projectIds.length === 0) {
    return emptyCharts();
  }

  // Pull tasks in a single query.
  const tasks = await prisma.task.findMany({
    where: projectWhere as { projectId: { in: string[] } },
    select: {
      status: true,
      priority: true,
      assigneeId: true,
      createdAt: true,
      completedAt: true,
      dueDate: true,
    },
  });

  // KPI
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => isCompletedStatus(t.status)).length;
  const pendingTasks = totalTasks - completedTasks;
  const now = new Date();
  const overdueTasks = tasks.filter((t) =>
    !isCompletedStatus(t.status) && t.dueDate && t.dueDate < now
  ).length;
  const kpi: AnalyticsKPI = {
    totalProjects: projects.length,
    totalTasks,
    completedTasks,
    pendingTasks,
    overdueTasks,
    completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
  };

  // Priority breakdown
  const priorityCount: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const t of tasks) {
    const p = normalizePriority(t.priority);
    if (p) priorityCount[p] += 1;
  }
  const byPriority: PriorityDatum[] = (["HIGH", "MEDIUM", "LOW"] as const).map((p) => ({
    name: p,
    label: PRIORITY_LABELS[p],
    value: priorityCount[p],
    color: PRIORITY_COLORS[p],
  }));

  // Status breakdown
  const statusCount: Record<string, number> = { TODO: 0, IN_PROGRESS: 0, COMPLETED: 0 };
  for (const t of tasks) {
    const s = normalizeTaskStatus(t.status);
    if (s) statusCount[s] += 1;
  }
  const byStatus: StatusDatum[] = (["TODO", "IN_PROGRESS", "COMPLETED"] as const).map((s) => ({
    name: s,
    label: STATUS_LABELS[s],
    value: statusCount[s],
    color: STATUS_COLORS[s],
  }));

  // Trend (30d)
  const trend = buildTrend(
    tasks.map((t) => t.createdAt),
    tasks.map((t) => t.completedAt),
  );

  // Productivity per assignee
  const assigneeIds = Array.from(
    new Set(tasks.map((t) => t.assigneeId).filter((id): id is string => Boolean(id))),
  );
  const assignees = assigneeIds.length
    ? await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, name: true, username: true, avatar: true },
    })
    : [];
  const userById = buildUserMap(assignees);
  const productivityMap = new Map<string, { completed: number; inProgress: number; total: number }>();
  for (const t of tasks) {
    if (!t.assigneeId) continue;
    const e = productivityMap.get(t.assigneeId) ?? { completed: 0, inProgress: 0, total: 0 };
    e.total += 1;
    if (isCompletedStatus(t.status)) e.completed += 1;
    if (t.status === "IN_PROGRESS") e.inProgress += 1;
    productivityMap.set(t.assigneeId, e);
  }
  const productivity: ProductivityDatum[] = Array.from(productivityMap.entries())
    .map(([uid, stats]) => {
      const user = userById.get(uid);
      return {
        userId: uid,
        name: user?.name ?? "Unknown",
        avatar: user?.avatar ?? null,
        completed: stats.completed,
        inProgress: stats.inProgress,
        total: stats.total,
      };
    })
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 10);

  // Overdue vs Completed vs Pending (overall)
  const comparison: ComparisonDatum[] = [{
    label: "Tasks",
    completed: completedTasks,
    overdue: overdueTasks,
    pending: pendingTasks - overdueTasks,
  }];

  return {
    kpi,
    byPriority,
    byStatus,
    trend,
    productivity,
    comparison,
    generatedAt: new Date().toISOString(),
  };
};

export const getProjectCharts = async (
  userId: string,
  userRole: RoleType | undefined,
  projectId: string,
): Promise<DashboardCharts> => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: { include: { user: { select: { id: true, name: true, username: true, avatar: true } } } },
    },
  });
  if (!project) throw new Error("Project not found");
  const isMember = project.ownerId === userId ||
    project.members.some((m) => m.userId === userId);
  if (!isMember && userRole !== "VIEWER") throw new Error("Forbidden");

  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: {
      status: true,
      priority: true,
      assigneeId: true,
      createdAt: true,
      completedAt: true,
      dueDate: true,
    },
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => isCompletedStatus(t.status)).length;
  const pendingTasks = totalTasks - completedTasks;
  const now = new Date();
  const overdueTasks = tasks.filter((t) =>
    !isCompletedStatus(t.status) && t.dueDate && t.dueDate < now
  ).length;
  const kpi: AnalyticsKPI = {
    totalProjects: 1,
    totalTasks,
    completedTasks,
    pendingTasks,
    overdueTasks,
    completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
  };

  const priorityCount: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const t of tasks) {
    const p = normalizePriority(t.priority);
    if (p) priorityCount[p] += 1;
  }
  const byPriority: PriorityDatum[] = (["HIGH", "MEDIUM", "LOW"] as const).map((p) => ({
    name: p,
    label: PRIORITY_LABELS[p],
    value: priorityCount[p],
    color: PRIORITY_COLORS[p],
  }));

  const statusCount: Record<string, number> = { TODO: 0, IN_PROGRESS: 0, COMPLETED: 0 };
  for (const t of tasks) {
    const s = normalizeTaskStatus(t.status);
    if (s) statusCount[s] += 1;
  }
  const byStatus: StatusDatum[] = (["TODO", "IN_PROGRESS", "COMPLETED"] as const).map((s) => ({
    name: s,
    label: STATUS_LABELS[s],
    value: statusCount[s],
    color: STATUS_COLORS[s],
  }));

  const trend = buildTrend(
    tasks.map((t) => t.createdAt),
    tasks.map((t) => t.completedAt),
  );

  const assigneeIds = Array.from(
    new Set(tasks.map((t) => t.assigneeId).filter((id): id is string => Boolean(id))),
  );
  const assignees = assigneeIds.length
    ? await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, name: true, username: true, avatar: true },
    })
    : [];
  const userById = buildUserMap(assignees);
  const productivityMap = new Map<string, { completed: number; inProgress: number; total: number }>();
  for (const t of tasks) {
    if (!t.assigneeId) continue;
    const e = productivityMap.get(t.assigneeId) ?? { completed: 0, inProgress: 0, total: 0 };
    e.total += 1;
    if (isCompletedStatus(t.status)) e.completed += 1;
    if (t.status === "IN_PROGRESS") e.inProgress += 1;
    productivityMap.set(t.assigneeId, e);
  }
  const productivity: ProductivityDatum[] = Array.from(productivityMap.entries())
    .map(([uid, stats]) => {
      const user = userById.get(uid);
      return {
        userId: uid,
        name: user?.name ?? "Unknown",
        avatar: user?.avatar ?? null,
        completed: stats.completed,
        inProgress: stats.inProgress,
        total: stats.total,
      };
    })
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 10);

  const comparison: ComparisonDatum[] = [{
    label: project.name,
    completed: completedTasks,
    overdue: overdueTasks,
    pending: pendingTasks - overdueTasks,
  }];

  return {
    kpi,
    byPriority,
    byStatus,
    trend,
    productivity,
    comparison,
    generatedAt: new Date().toISOString(),
  };
};

const emptyCharts = (): DashboardCharts => ({
  kpi: {
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
  },
  byPriority: (["HIGH", "MEDIUM", "LOW"] as const).map((p) => ({
    name: p,
    label: PRIORITY_LABELS[p],
    value: 0,
    color: PRIORITY_COLORS[p],
  })),
  byStatus: (["TODO", "IN_PROGRESS", "COMPLETED"] as const).map((s) => ({
    name: s,
    label: STATUS_LABELS[s],
    value: 0,
    color: STATUS_COLORS[s],
  })),
  trend: buildTrend([], []),
  productivity: [],
  comparison: [{ label: "Tasks", completed: 0, overdue: 0, pending: 0 }],
  generatedAt: new Date().toISOString(),
});
