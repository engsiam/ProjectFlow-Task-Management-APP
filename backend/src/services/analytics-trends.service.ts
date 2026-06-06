// Analytics trends — 5 deterministic time-series feeds for the
// Analytics page charts. All read-only aggregations, no mutations.
//
//   1. Completion Trend  — daily created vs completed tasks
//   2. Velocity Trend    — 7-day rolling completion rate
//   3. Overdue Trend     — daily count of overdue tasks
//   4. Team Activity     — daily activity log count
//   5. Project Health    — average workspace health per day

import { prisma } from "../prisma/client.ts";
import type { RoleType } from "../types/domain.ts";
import { getLatestHealth } from "./health-score.service.ts";

const isCompleted = (status: string) => status === "DONE" || status === "COMPLETED";

export type TrendPoint = {
  date: string; // YYYY-MM-DD
  label: string; // "Mon 12"
  value: number;
};

const VISIBLE_PROJECT_FILTER = (
  userId: string,
  userRole: RoleType | undefined,
) => {
  if (userRole === "ADMIN" || userRole === "PROJECT_MANAGER") {
    return { status: { not: "ARCHIVED" as const } };
  }
  return {
    status: { not: "ARCHIVED" as const },
    OR: [
      { ownerId: userId },
      { members: { some: { userId } } },
    ],
  };
};

const formatDay = (d: Date) => {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const shortDay = (d: Date) =>
  new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric" }).format(d);

const dayWindow = (days: number) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const buckets: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    buckets.push({ date: formatDay(d), label: shortDay(d), value: 0 });
  }
  return buckets;
};

const getVisibleProjectIds = async (userId: string, userRole: RoleType | undefined) => {
  const projects = await prisma.project.findMany({
    where: VISIBLE_PROJECT_FILTER(userId, userRole),
    select: { id: true },
  });
  return projects.map((p) => p.id);
};

// ── 1. Completion Trend ─────────────────────────────────────────
export const getCompletionTrend = async (
  userId: string,
  userRole: RoleType | undefined,
  days = 30,
): Promise<{ completed: TrendPoint[]; created: TrendPoint[] }> => {
  const projectIds = await getVisibleProjectIds(userId, userRole);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const tasks = projectIds.length
    ? await prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      select: { createdAt: true, completedAt: true },
    })
    : [];

  const completedBuckets = dayWindow(days);
  const createdBuckets = dayWindow(days);
  const cm = new Map(completedBuckets.map((b) => [b.date, b]));
  const cr = new Map(createdBuckets.map((b) => [b.date, b]));

  for (const t of tasks) {
    if (t.completedAt && t.completedAt >= since) {
      const d = new Date(t.completedAt);
      d.setUTCHours(0, 0, 0, 0);
      const b = cm.get(formatDay(d));
      if (b) b.value += 1;
    }
    if (t.createdAt >= since) {
      const d = new Date(t.createdAt);
      d.setUTCHours(0, 0, 0, 0);
      const b = cr.get(formatDay(d));
      if (b) b.value += 1;
    }
  }
  return { completed: completedBuckets, created: createdBuckets };
};

// ── 2. Velocity Trend (7-day rolling completion rate) ──────────
export const getVelocityTrend = async (
  userId: string,
  userRole: RoleType | undefined,
  days = 30,
): Promise<TrendPoint[]> => {
  const projectIds = await getVisibleProjectIds(userId, userRole);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const tasks = projectIds.length
    ? await prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        completedAt: { gte: since },
      },
      select: { completedAt: true },
    })
    : [];

  const buckets = dayWindow(days);
  const m = new Map(buckets.map((b) => [b.date, b]));
  for (const t of tasks) {
    if (!t.completedAt) continue;
    const d = new Date(t.completedAt);
    d.setUTCHours(0, 0, 0, 0);
    const b = m.get(formatDay(d));
    if (b) b.value += 1;
  }
  // 7-day rolling average
  return buckets.map((b, i) => {
    const slice = buckets.slice(Math.max(0, i - 6), i + 1);
    const sum = slice.reduce((a, p) => a + p.value, 0);
    return { ...b, value: Math.round((sum / slice.length) * 10) / 10 };
  });
};

// ── 3. Overdue Trend (daily snapshot of overdue-task count) ─────
export const getOverdueTrend = async (
  userId: string,
  userRole: RoleType | undefined,
  days = 30,
): Promise<TrendPoint[]> => {
  const projectIds = await getVisibleProjectIds(userId, userRole);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // For each day in window, count tasks whose dueDate is < that day
  // and that are not yet completed. To keep this O(n) instead of O(n²),
  // we collect all relevant tasks once and bucket them.
  const tasks = projectIds.length
    ? await prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        dueDate: { gte: since, lt: new Date() },
      },
      select: { dueDate: true, completedAt: true, status: true },
    })
    : [];

  const buckets = dayWindow(days);
  for (const b of buckets) {
    const dayStart = new Date(b.date + "T00:00:00Z");
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    b.value = tasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      if (due >= dayEnd) return false;
      // was still incomplete at end of that day
      if (t.completedAt) {
        return new Date(t.completedAt) > dayEnd;
      }
      return !isCompleted(t.status);
    }).length;
  }
  return buckets;
};

// ── 4. Team Activity Trend ───────────────────────────────────────
export const getTeamActivityTrend = async (
  userId: string,
  userRole: RoleType | undefined,
  days = 30,
): Promise<TrendPoint[]> => {
  const projectIds = await getVisibleProjectIds(userId, userRole);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const logs = projectIds.length
    ? await prisma.activityLog.findMany({
      where: { projectId: { in: projectIds }, createdAt: { gte: since } },
      select: { createdAt: true },
    })
    : [];

  const buckets = dayWindow(days);
  const m = new Map(buckets.map((b) => [b.date, b]));
  for (const l of logs) {
    const d = new Date(l.createdAt);
    d.setUTCHours(0, 0, 0, 0);
    const b = m.get(formatDay(d));
    if (b) b.value += 1;
  }
  return buckets;
};

// ── 5. Project Health Trend (avg of latest snapshot per day) ───
export const getProjectHealthTrend = async (
  userId: string,
  userRole: RoleType | undefined,
  days = 30,
): Promise<TrendPoint[]> => {
  const projectIds = await getVisibleProjectIds(userId, userRole);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const snapshots = projectIds.length
    ? await prisma.projectHealthSnapshot.findMany({
      where: { projectId: { in: projectIds }, computedAt: { gte: since } },
      select: { computedAt: true, score: true, projectId: true },
    })
    : [];

  // For each day, average score across projects (use last snapshot of the day per project)
  const buckets = dayWindow(days);
  for (const b of buckets) {
    const dayStart = new Date(b.date + "T00:00:00Z");
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const todays = snapshots.filter((s) => {
      const t = new Date(s.computedAt);
      return t >= dayStart && t < dayEnd;
    });
    if (todays.length === 0) {
      b.value = 0;
      continue;
    }
    // For each project, pick the latest snapshot of the day
    const perProject = new Map<string, number>();
    for (const s of todays) {
      const cur = perProject.get(s.projectId);
      if (cur === undefined) perProject.set(s.projectId, s.score);
    }
    const scores = Array.from(perProject.values());
    b.value = scores.length ? Math.round(scores.reduce((a, n) => a + n, 0) / scores.length) : 0;
  }
  // If projectIds is non-empty but no snapshots at all, fill current avg
  if (projectIds.length && snapshots.length === 0) {
    const all = await Promise.all(projectIds.map((id) => getLatestHealth(id)));
    const avg = all.length ? Math.round(all.reduce((a, h) => a + h.score, 0) / all.length) : 0;
    return buckets.map((b) => ({ ...b, value: avg }));
  }
  return buckets;
};

// ── Bundle ───────────────────────────────────────────────────────
export const getAllTrends = async (
  userId: string,
  userRole: RoleType | undefined,
  days = 30,
) => {
  const [completion, velocity, overdue, activity, health] = await Promise.all([
    getCompletionTrend(userId, userRole, days),
    getVelocityTrend(userId, userRole, days),
    getOverdueTrend(userId, userRole, days),
    getTeamActivityTrend(userId, userRole, days),
    getProjectHealthTrend(userId, userRole, days),
  ]);
  return { completion, velocity, overdue, activity, health, days };
};
