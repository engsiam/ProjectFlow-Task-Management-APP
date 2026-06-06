// Portfolio Dashboard — Executive Overview for the dashboard page.
//
// Aggregates project health intelligence, team performance, delivery
// forecast, and rule-based enterprise insights into a single payload
// that powers the Executive Dashboard at the top of `/dashboard`.
//
// Deterministic. No LLM. All inputs come from MongoDB aggregations
// that already power the existing health-score and analytics-charts
// services. Runs in <300ms on the free Deno Deploy tier.

import { prisma } from "../prisma/client.ts";
import type { RoleType } from "../types/domain.ts";
import {
  getLatestHealth,
  getWorkspaceHealthSummary,
  type RiskLevel,
} from "./health-score.service.ts";

const isCompleted = (status: string) => status === "DONE" || status === "COMPLETED";

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

const daysBetween = (a: Date, b: Date) =>
  Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));

const fmtPct = (n: number) => Math.round(n * 100);

// ── 1. Executive Summary ─────────────────────────────────────────
export const getExecutiveSummary = async (
  userId: string,
  userRole: RoleType | undefined,
) => {
  const filter = VISIBLE_PROJECT_FILTER(userId, userRole);
  const projects = await prisma.project.findMany({
    where: filter,
    select: { id: true, name: true, status: true, deadline: true },
  });
  if (projects.length === 0) {
    return {
      totalProjects: 0,
      healthScore: 0,
      healthyCount: 0,
      atRiskCount: 0,
      criticalCount: 0,
      weeklyTrend: 0,
      weeklyTrendDirection: "flat" as const,
      narrative: {
        headline: "No projects yet.",
        body:
          "Create your first project and start tracking workspace health, delivery forecasts, and team performance in real time.",
      },
    };
  }

  const health = await getWorkspaceHealthSummary(userId, userRole ?? "VIEWER");
  const healthScore = health.averageScore;
  const healthyCount = health.onTrackCount;
  const atRiskCount = health.atRiskCount - health.criticalCount;
  const criticalCount = health.criticalCount;

  // Weekly trend: compare this week's completed tasks vs last week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const tasks = await prisma.task.findMany({
    where: {
      projectId: { in: projects.map((p) => p.id) },
      completedAt: { gte: twoWeeksAgo },
    },
    select: { completedAt: true },
  });
  const thisWeek = tasks.filter((t) => t.completedAt && t.completedAt >= weekAgo).length;
  const lastWeek = tasks.filter((t) => t.completedAt && t.completedAt < weekAgo).length;
  const weeklyTrend = lastWeek === 0 ? (thisWeek > 0 ? 1 : 0) : (thisWeek - lastWeek) / lastWeek;
  const weeklyTrendDirection: "up" | "down" | "flat" = weeklyTrend > 0.05
    ? "up"
    : weeklyTrend < -0.05
    ? "down"
    : "flat";

  // Narrative generation
  let headline: string;
  if (healthScore >= 80) headline = "Workspace health is excellent.";
  else if (healthScore >= 60) headline = "Workspace health is stable.";
  else if (healthScore >= 40) headline = "Workspace health needs attention.";
  else headline = "Workspace health is critical.";

  const attention = criticalCount > 0
    ? `${criticalCount} project${criticalCount > 1 ? "s" : ""} require${
      criticalCount === 1 ? "s" : ""
    } immediate action.`
    : atRiskCount > 0
    ? `${atRiskCount} project${atRiskCount > 1 ? "s" : ""} require${
      atRiskCount === 1 ? "s" : ""
    } attention.`
    : "All projects are on track.";

  const velocityLine = thisWeek === 0 && lastWeek === 0
    ? "No completions recorded in the last 14 days."
    : thisWeek === 0 && lastWeek > 0
    ? `Completion velocity dropped to zero this week (was ${lastWeek} last week).`
    : lastWeek === 0 && thisWeek > 0
    ? `Completion velocity started with ${thisWeek} task${
      thisWeek > 1 ? "s" : ""
    } shipped this week.`
    : `Completion velocity ${
      weeklyTrendDirection === "up"
        ? "increased"
        : weeklyTrendDirection === "down"
        ? "decreased"
        : "held steady"
    } by ${Math.abs(Math.round(weeklyTrend * 100))}% during the last 7 days.`;

  return {
    totalProjects: health.totalProjects,
    healthScore,
    healthyCount,
    atRiskCount,
    criticalCount,
    weeklyTrend: Math.round(weeklyTrend * 100),
    weeklyTrendDirection,
    narrative: {
      headline,
      body: `${attention} ${velocityLine}`,
    },
  };
};

// ── 2. Delivery Forecast ─────────────────────────────────────────
export const getDeliveryForecast = async (
  userId: string,
  userRole: RoleType | undefined,
) => {
  const filter = VISIBLE_PROJECT_FILTER(userId, userRole);
  const projects = await prisma.project.findMany({
    where: filter,
    select: {
      id: true,
      name: true,
      status: true,
      deadline: true,
      startDate: true,
      tasks: {
        select: {
          status: true,
          dueDate: true,
          completedAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (projects.length === 0) {
    return {
      predictedCompletionDate: null as string | null,
      onTimeProbability: 0,
      riskLevel: "ON_TRACK" as RiskLevel,
      completionTrend: 0,
      completionTrendDirection: "flat" as const,
      totalRemainingTasks: 0,
      averageVelocity7d: 0,
      projects: [] as Array<{
        projectId: string;
        projectName: string;
        predictedCompletionDate: string | null;
        onTimeProbability: number;
        riskLevel: RiskLevel;
      }>,
    };
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  let totalRemaining = 0;
  let totalRecent = 0;
  let totalPrior = 0;
  const perProject: Array<{
    projectId: string;
    projectName: string;
    predictedCompletionDate: string | null;
    onTimeProbability: number;
    riskLevel: RiskLevel;
  }> = [];

  for (const p of projects) {
    const completed = p.tasks.filter((t) => isCompleted(t.status)).length;
    const remaining = p.tasks.length - completed;
    const recentCompleted = p.tasks.filter((t) =>
      t.completedAt && new Date(t.completedAt) >= sevenDaysAgo
    ).length;
    const priorCompleted = p.tasks.filter((t) =>
      t.completedAt &&
      new Date(t.completedAt) >= fourteenDaysAgo &&
      new Date(t.completedAt) < sevenDaysAgo
    ).length;

    totalRemaining += remaining;
    totalRecent += recentCompleted;
    totalPrior += priorCompleted;

    const dailyVelocity = recentCompleted / 7;
    const predictedDays = dailyVelocity > 0 ? Math.ceil(remaining / dailyVelocity) : null;
    const predicted = predictedDays !== null
      ? new Date(Date.now() + predictedDays * 24 * 60 * 60 * 1000)
      : null;
    let onTime = 0.5;
    if (p.deadline && predicted) {
      const daysAhead = daysBetween(p.deadline, predicted);
      if (daysAhead > 14) onTime = 0.95;
      else if (daysAhead > 7) onTime = 0.85;
      else if (daysAhead > 0) onTime = 0.7;
      else if (daysAhead > -7) onTime = 0.4;
      else onTime = 0.15;
    } else if (!p.deadline) {
      onTime = 0.6;
    }
    const health = await getLatestHealth(p.id);
    perProject.push({
      projectId: p.id,
      projectName: p.name,
      predictedCompletionDate: predicted ? predicted.toISOString() : null,
      onTimeProbability: onTime,
      riskLevel: health.riskLevel,
    });
  }

  const avgVelocity7d = projects.length ? totalRecent / projects.length : 0;
  const predictedDays = avgVelocity7d > 0 ? Math.ceil(totalRemaining / avgVelocity7d) : null;
  const predictedCompletionDate = predictedDays !== null
    ? new Date(Date.now() + predictedDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Risk = project with the worst on-time probability
  const minOnTime = perProject.reduce((min, p) => Math.min(min, p.onTimeProbability), 1);
  const riskLevel: RiskLevel = minOnTime < 0.4
    ? "CRITICAL"
    : minOnTime < 0.7
    ? "AT_RISK"
    : "ON_TRACK";

  // Completion trend (this week vs last week)
  const completionTrend = totalPrior === 0
    ? (totalRecent > 0 ? 1 : 0)
    : (totalRecent - totalPrior) / totalPrior;
  const completionTrendDirection: "up" | "down" | "flat" = completionTrend > 0.05
    ? "up"
    : completionTrend < -0.05
    ? "down"
    : "flat";

  return {
    predictedCompletionDate,
    onTimeProbability: minOnTime,
    riskLevel,
    completionTrend: Math.round(completionTrend * 100),
    completionTrendDirection,
    totalRemainingTasks: totalRemaining,
    averageVelocity7d: Math.round(avgVelocity7d * 10) / 10,
    projects: perProject,
  };
};

// ── 3. Team Intelligence ─────────────────────────────────────────
export const getTeamIntelligence = async (
  userId: string,
  userRole: RoleType | undefined,
) => {
  const filter = VISIBLE_PROJECT_FILTER(userId, userRole);
  const projects = await prisma.project.findMany({
    where: filter,
    select: {
      id: true,
      members: {
        select: {
          userId: true,
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
            },
          },
        },
      },
      tasks: {
        select: {
          status: true,
          assigneeId: true,
          completedAt: true,
        },
      },
    },
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const perUser = new Map<string, {
    userId: string;
    name: string;
    username: string;
    avatar: string | null;
    completed: number;
    completed7d: number;
    inProgress: number;
    assigned: number;
    open: number;
    activeProjects: number;
    projectIds: Set<string>;
  }>();

  for (const p of projects) {
    for (const t of p.tasks) {
      if (!t.assigneeId) continue;
      const u = perUser.get(t.assigneeId) ?? {
        userId: t.assigneeId,
        name: p.members.find((m) => m.userId === t.assigneeId)?.user.name ?? "Unknown",
        username: p.members.find((m) => m.userId === t.assigneeId)?.user.username ?? "",
        avatar: p.members.find((m) => m.userId === t.assigneeId)?.user.avatar ?? null,
        completed: 0,
        completed7d: 0,
        inProgress: 0,
        assigned: 0,
        open: 0,
        activeProjects: 0,
        projectIds: new Set<string>(),
      };
      u.assigned += 1;
      u.projectIds.add(p.id);
      if (isCompleted(t.status)) {
        u.completed += 1;
        if (t.completedAt && new Date(t.completedAt) >= sevenDaysAgo) u.completed7d += 1;
      } else {
        u.open += 1;
        if (t.status === "IN_PROGRESS") u.inProgress += 1;
      }
      perUser.set(t.assigneeId, u);
    }
  }

  for (const u of perUser.values()) {
    u.activeProjects = u.projectIds.size;
  }

  const members = Array.from(perUser.values()).map((u) => ({
    ...u,
    productivityScore: u.assigned > 0 ? Math.round((u.completed / u.assigned) * 100) : 0,
  }));

  // Top contributors by completed7d
  const topContributors = [...members]
    .sort((a, b) => b.completed7d - a.completed7d || b.completed - a.completed)
    .slice(0, 5);

  // Workload distribution: classify each member by open-task count
  const openCounts = members.map((m) => m.open).filter((c) => c > 0);
  const mean = openCounts.length ? openCounts.reduce((a, b) => a + b, 0) / openCounts.length : 0;
  const variance = openCounts.length
    ? openCounts.reduce((acc, v) => acc + (v - mean) ** 2, 0) / openCounts.length
    : 0;
  const stdDev = Math.sqrt(variance);

  const overloaded = members.filter((m) => m.open > mean + 1.5 * stdDev && m.open >= 5).length;
  const underutilized = members.filter((m) => m.open < mean - 1.5 * stdDev && m.open === 0).length;
  const balanced = Math.max(0, members.length - overloaded - underutilized);

  // Team efficiency: avg of (completed / assigned) per member
  const teamEfficiency = members.length
    ? Math.round(
      members.reduce((acc, m) => acc + (m.assigned > 0 ? m.completed / m.assigned : 0), 0) /
        members.length * 100,
    )
    : 0;

  return {
    memberCount: members.length,
    teamEfficiency,
    topContributors: topContributors.map((m) => ({
      userId: m.userId,
      name: m.name,
      username: m.username,
      avatar: m.avatar,
      tasksCompleted: m.completed,
      tasksCompleted7d: m.completed7d,
      productivityScore: m.productivityScore,
    })),
    workload: {
      balanced,
      overloaded,
      underutilized,
      meanOpenTasks: Math.round(mean * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
    },
  };
};

// ── 4. Project Risk Matrix ───────────────────────────────────────
export const getRiskMatrix = async (
  userId: string,
  userRole: RoleType | undefined,
) => {
  const filter = VISIBLE_PROJECT_FILTER(userId, userRole);
  const projects = await prisma.project.findMany({
    where: filter,
    select: {
      id: true,
      name: true,
      color: true,
      status: true,
      deadline: true,
      startDate: true,
      tasks: {
        select: {
          status: true,
          dueDate: true,
          completedAt: true,
        },
      },
    },
  });

  const now = new Date();
  const matrix = await Promise.all(
    projects.map(async (p) => {
      const health = await getLatestHealth(p.id);
      const total = p.tasks.length;
      const completed = p.tasks.filter((t) => isCompleted(t.status)).length;
      const overdue = p.tasks.filter((t) =>
        t.dueDate && new Date(t.dueDate) < now && !isCompleted(t.status)
      ).length;
      const completionPct = total ? Math.round((completed / total) * 100) : 0;
      let deadlineStatus: "ON_TRACK" | "AT_RISK" | "OVERDUE" | "NO_DEADLINE";
      if (!p.deadline) deadlineStatus = "NO_DEADLINE";
      else {
        const days = daysBetween(p.deadline, now);
        if (days < 0) deadlineStatus = "OVERDUE";
        else if (days < 7) deadlineStatus = "AT_RISK";
        else deadlineStatus = "ON_TRACK";
      }
      return {
        projectId: p.id,
        projectName: p.name,
        projectColor: p.color,
        projectStatus: p.status,
        healthScore: health.score,
        riskLevel: health.riskLevel,
        completionPct,
        overdueTasks: overdue,
        totalTasks: total,
        completedTasks: completed,
        deadline: p.deadline ? p.deadline.toISOString() : null,
        deadlineStatus,
        daysToDeadline: p.deadline ? daysBetween(p.deadline, now) : null,
      };
    }),
  );

  // Sort by risk: CRITICAL → AT_RISK → ON_TRACK, then by score asc
  const rank: Record<RiskLevel, number> = { CRITICAL: 0, AT_RISK: 1, ON_TRACK: 2 };
  matrix.sort((a, b) => rank[a.riskLevel] - rank[b.riskLevel] || a.healthScore - b.healthScore);

  return matrix;
};

// ── 5. Enterprise Insights (rule-based) ──────────────────────────
export const getEnterpriseInsights = async (
  userId: string,
  userRole: RoleType | undefined,
) => {
  const filter = VISIBLE_PROJECT_FILTER(userId, userRole);
  const projects = await prisma.project.findMany({
    where: filter,
    select: {
      id: true,
      name: true,
      tasks: {
        select: {
          status: true,
          dueDate: true,
          completedAt: true,
          updatedAt: true,
        },
      },
    },
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const insights: Array<
    { type: "warning" | "info" | "success"; title: string; projectId?: string }
  > = [];

  for (const p of projects) {
    const now = new Date();
    const total = p.tasks.length;
    const completed = p.tasks.filter((t) => isCompleted(t.status)).length;
    const overdue = p.tasks.filter((t) =>
      t.dueDate && new Date(t.dueDate) < now && !isCompleted(t.status)
    ).length;
    const inProgress = p.tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const recentActivity = p.tasks.filter((t) =>
      t.updatedAt && new Date(t.updatedAt) >= sevenDaysAgo
    ).length;

    if (overdue > 0) {
      insights.push({
        type: "warning",
        title: `${p.name} has ${overdue} overdue task${overdue > 1 ? "s" : ""}.`,
        projectId: p.id,
      });
    }
    if (inProgress > 0 && recentActivity === 0) {
      insights.push({
        type: "warning",
        title: `${p.name} has low team activity this week.`,
        projectId: p.id,
      });
    }
  }

  // Top performer = highest health score
  const healths = await Promise.all(
    projects.map(async (p) => ({ projectId: p.id, name: p.name, h: await getLatestHealth(p.id) })),
  );
  const topPerformer = [...healths].sort((a, b) => b.h.score - a.h.score)[0];
  if (topPerformer && topPerformer.h.score >= 70) {
    insights.push({
      type: "success",
      title: `${topPerformer.name} has the highest delivery confidence.`,
      projectId: topPerformer.projectId,
    });
  }

  // Cross-project: total velocity
  const weekCompletions = projects.reduce(
    (acc, p) =>
      acc + p.tasks.filter((t) => t.completedAt && new Date(t.completedAt) >= sevenDaysAgo).length,
    0,
  );
  if (weekCompletions > 0) {
    insights.push({
      type: "info",
      title: `Team shipped ${weekCompletions} task${
        weekCompletions > 1 ? "s" : ""
      } in the last 7 days.`,
    });
  }

  // Pick top 5 by priority
  const priority: Record<"warning" | "info" | "success", number> = {
    warning: 3,
    info: 2,
    success: 1,
  };
  return insights
    .sort((a, b) => priority[b.type] - priority[a.type])
    .slice(0, 5);
};

// ── 6. Bundle ────────────────────────────────────────────────────
export const getPortfolioDashboard = async (
  userId: string,
  userRole: RoleType | undefined,
) => {
  const [executive, forecast, team, matrix, insights] = await Promise.all([
    getExecutiveSummary(userId, userRole),
    getDeliveryForecast(userId, userRole),
    getTeamIntelligence(userId, userRole),
    getRiskMatrix(userId, userRole),
    getEnterpriseInsights(userId, userRole),
  ]);
  return { executive, forecast, team, matrix, insights };
};

// Re-export for convenience
export { fmtPct };
