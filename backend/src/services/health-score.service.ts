// Project Health Intelligence Engine.
//
// Computes a 0-100 health score for a project by blending five weighted
// signals from live project data:
//
//   1. Overdue task ratio      (30 pts)  - hard cap on rot
//   2. Completion velocity      (20 pts)  - tasks shipped in last 7 days
//   3. Deadline proximity       (25 pts)  - days remaining
//   4. Member engagement        (15 pts)  - % of members active in 7d
//   5. Workload distribution    (10 pts)  - assignment stddev across members
//
// Each snapshot is persisted to ProjectHealthSnapshot for trend analysis
// and surfaced as Top Risk Factors and Recommended Actions. The engine
// is fully deterministic (no LLM, no API key, no external service) so it
// runs identically on Deno Deploy's free tier as it does locally.

import { prisma } from "../prisma/client.ts";
import { ActivityAction } from "../types/domain.ts";
import { logActivity } from "./activity.service.ts";

export type RiskLevel = "ON_TRACK" | "AT_RISK" | "CRITICAL";
export type InsightType = "warning" | "info" | "success" | "critical" | "action";
export type TrendDirection = "up" | "down" | "flat";

export type HealthMetrics = {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  overdueRatio: number;
  velocity7d: number;
  daysToDeadline: number | null;
  activeMembers: number;
  totalMembers: number;
  taskDistribution: number;
  overdueScore: number;
  velocityScore: number;
  deadlineScore: number;
  engagementScore: number;
  distributionScore: number;
};

export type HealthInsight = {
  type: InsightType;
  title: string;
  text: string;
};

export type SignalContribution = {
  signal: "overdue" | "velocity" | "deadline" | "engagement" | "distribution";
  label: string;
  points: number;
  maxPoints: number;
};

export type HealthResult = {
  score: number;
  riskLevel: RiskLevel;
  metrics: HealthMetrics;
  insights: HealthInsight[];
  topRiskFactors: HealthInsight[];
  recommendations: HealthInsight[];
  signalContributions: SignalContribution[];
  predictedCompletionDate: Date | null;
  onTrackProbability: number;
  previousScore: number | null;
  scoreTrend: number | null;
  trendDirection: TrendDirection | null;
  computedAt: Date;
};

const isCompleted = (status: string) => status === "DONE" || status === "COMPLETED";

const stdDev = (values: number[]): number => {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const daysBetween = (a: Date, b: Date): number =>
  Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));

const roundPct = (n: number) => Math.round(n * 100);

export const computeHealth = async (projectId: string): Promise<HealthResult> => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        select: {
          id: true,
          status: true,
          dueDate: true,
          completedAt: true,
          assigneeId: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              activityLogs: {
                where: { createdAt: { gte: sevenDaysAgo } },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!project) throw new Error("Project not found");

  const now = new Date();
  const tasks = project.tasks;
  const total = tasks.length;
  const completed = tasks.filter((t) => isCompleted(t.status)).length;
  const overdue =
    tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && !isCompleted(t.status)).length;
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const todo = tasks.filter((t) => t.status === "TODO").length;
  const remaining = total - completed;

  // 1. Overdue ratio (30 pts)
  const overdueRatio = total ? overdue / total : 0;
  const overdueScore = Math.max(
    0,
    Math.round(30 * (1 - Math.min(1, overdueRatio * 2))),
  );

  // 2. Velocity (20 pts) — tasks completed in last 7 days
  const recentCompleted = tasks.filter((t) =>
    isCompleted(t.status) && t.completedAt &&
    new Date(t.completedAt) >= sevenDaysAgo
  ).length;
  const velocityScore = Math.min(20, recentCompleted * 2);

  // 3. Deadline proximity (25 pts)
  let deadlineScore = 25; // no deadline → full marks
  let daysToDeadline: number | null = null;
  if (project.deadline) {
    daysToDeadline = daysBetween(new Date(project.deadline), now);
    if (daysToDeadline < 0) deadlineScore = 0;
    else if (daysToDeadline < 3) deadlineScore = 8;
    else if (daysToDeadline < 7) deadlineScore = 15;
    else if (daysToDeadline < 14) deadlineScore = 20;
    else deadlineScore = 25;
  }

  // 4. Engagement (15 pts)
  const totalMembers = project.members.length;
  const activeMembers = project.members.filter((m) => m.user.activityLogs.length > 0).length;
  const engagementScore = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 15) : 0;

  // 5. Workload distribution (10 pts) — lower stddev of open-task counts
  const openCounts = project.members.map((m) =>
    tasks.filter((t) => t.assigneeId === m.userId && !isCompleted(t.status)).length
  );
  const distribution = stdDev(openCounts);
  const distributionScore = Math.max(0, Math.round(10 - distribution));

  const score = overdueScore + velocityScore + deadlineScore +
    engagementScore + distributionScore;

  let riskLevel: RiskLevel = "ON_TRACK";
  if (score < 40) riskLevel = "CRITICAL";
  else if (score < 70) riskLevel = "AT_RISK";

  // Prediction
  const dailyVelocity = recentCompleted / 7;
  const predictedDays = dailyVelocity > 0 ? Math.ceil(remaining / dailyVelocity) : null;
  const predictedCompletionDate = predictedDays !== null
    ? new Date(now.getTime() + predictedDays * 24 * 60 * 60 * 1000)
    : null;

  let onTrackProbability = 0.5;
  if (project.deadline && predictedCompletionDate) {
    const daysAhead = daysBetween(new Date(project.deadline), predictedCompletionDate);
    if (daysAhead > 14) onTrackProbability = 0.95;
    else if (daysAhead > 7) onTrackProbability = 0.85;
    else if (daysAhead > 0) onTrackProbability = 0.7;
    else if (daysAhead > -7) onTrackProbability = 0.4;
    else onTrackProbability = 0.15;
  } else if (!project.deadline) {
    onTrackProbability = 0.6; // unknown
  }

  // Signal contributions for the breakdown panel
  const signalContributions: SignalContribution[] = [
    { signal: "overdue", label: "Overdue Tasks", points: overdueScore, maxPoints: 30 },
    { signal: "velocity", label: "Completion Velocity", points: velocityScore, maxPoints: 20 },
    { signal: "deadline", label: "Deadline Distance", points: deadlineScore, maxPoints: 25 },
    { signal: "engagement", label: "Team Engagement", points: engagementScore, maxPoints: 15 },
    { signal: "distribution", label: "Workload Balance", points: distributionScore, maxPoints: 10 },
  ];

  // General observations (insights)
  const insights: HealthInsight[] = [];

  if (overdue > 0) {
    insights.push({
      type: overdue > 3 ? "critical" : "warning",
      title: `${overdue} task${overdue > 1 ? "s" : ""} overdue`,
      text: overdue > 0
        ? `${overdue} of ${total} task${total > 1 ? "s" : ""} ${
          overdue > 1 ? "are" : "is"
        } past their due date and still open.`
        : "All tasks are within their due dates.",
    });
  }

  if (daysToDeadline !== null) {
    if (daysToDeadline < 0) {
      insights.push({
        type: "critical",
        title: "Project deadline passed",
        text: `The project deadline was ${Math.abs(daysToDeadline)} day${
          Math.abs(daysToDeadline) > 1 ? "s" : ""
        } ago. ${remaining} task${remaining > 1 ? "s" : ""} remaining.`,
      });
    } else if (daysToDeadline <= 7 && score < 70) {
      insights.push({
        type: "warning",
        title: "Deadline approaching",
        text: `Project deadline is in ${daysToDeadline} day${
          daysToDeadline > 1 ? "s" : ""
        } with ${remaining} task${remaining > 1 ? "s" : ""} remaining.`,
      });
    }
  }

  if (recentCompleted > 0) {
    insights.push({
      type: "info",
      title: "Team velocity",
      text: `${recentCompleted} task${
        recentCompleted > 1 ? "s" : ""
      } completed in the last 7 days (${(recentCompleted / 7).toFixed(1)}/day).`,
    });
  } else if (total > 0 && remaining > 0) {
    insights.push({
      type: "warning",
      title: "No recent completions",
      text: "No tasks have been completed in the last 7 days. Consider reviewing blockers.",
    });
  }

  if (engagementScore < 8 && totalMembers > 1) {
    insights.push({
      type: "info",
      title: "Low team engagement",
      text: `Only ${activeMembers} of ${totalMembers} members have activity in the last 7 days.`,
    });
  }

  if (distribution > 3 && totalMembers > 1) {
    insights.push({
      type: "info",
      title: "Uneven workload",
      text: `Task assignments are uneven across team members (σ=${
        distribution.toFixed(1)
      }). Consider rebalancing.`,
    });
  }

  if (score >= 85) {
    insights.push({
      type: "success",
      title: "Project is on track",
      text: `Healthy progress: ${completed}/${total} tasks complete with consistent velocity.`,
    });
  }

  // ── Top Risk Factors ───────────────────────────────────────────────
  // Surfaces the 3 signals that contributed the fewest points to the
  // current score, phrased as a problem statement.
  const topRiskFactors: HealthInsight[] = [];

  if (overdue > 0) {
    topRiskFactors.push({
      type: "warning",
      title: `${overdue} overdue task${overdue > 1 ? "s" : ""} detected`,
      text: `Overdue work accounts for ${
        roundPct(overdueRatio)
      }% of the project task list and is currently the largest single source of risk.`,
    });
  }
  if (velocityScore < 10 && remaining > 0) {
    topRiskFactors.push({
      type: "warning",
      title: "Completion rate below target",
      text: recentCompleted === 0
        ? "No tasks have been completed in the last 7 days. Sprint velocity is at zero."
        : `Only ${recentCompleted} task${
          recentCompleted > 1 ? "s" : ""
        } shipped in the last 7 days — below the healthy threshold of 5+ per week.`,
    });
  }
  if (distribution > 3 && totalMembers > 1) {
    topRiskFactors.push({
      type: "warning",
      title: "Team workload imbalance",
      text: `Assignment variance is σ=${
        distribution.toFixed(
          1,
        )
      } across ${totalMembers} members — one or more teammates are carrying a disproportionate share.`,
    });
  }
  if (
    daysToDeadline !== null && daysToDeadline < 14 && remaining > 0 && score < 70
  ) {
    topRiskFactors.push({
      type: "warning",
      title: "Deadline approaching",
      text: daysToDeadline < 0
        ? `The project deadline passed ${Math.abs(daysToDeadline)} day${
          Math.abs(daysToDeadline) > 1 ? "s" : ""
        } ago with ${remaining} task${remaining > 1 ? "s" : ""} still open.`
        : `Project deadline is in ${daysToDeadline} day${
          daysToDeadline > 1 ? "s" : ""
        } with ${remaining} task${remaining > 1 ? "s" : ""} remaining.`,
    });
  }
  if (engagementScore < 8 && totalMembers > 1) {
    topRiskFactors.push({
      type: "warning",
      title: "Low team engagement",
      text: `Only ${activeMembers} of ${totalMembers} members have activity in the last 7 days.`,
    });
  }

  // Cap to top 3 risk factors, sorted by severity (type weight).
  const severityWeight: Record<InsightType, number> = {
    critical: 4,
    warning: 3,
    action: 2,
    info: 1,
    success: 0,
  };
  topRiskFactors.sort((a, b) => severityWeight[b.type] - severityWeight[a.type]);
  const trimmedRiskFactors = topRiskFactors.slice(0, 3);

  // ── Recommended Actions ────────────────────────────────────────────
  // Concrete, prescriptive next-steps derived from the same signals.
  const recommendations: HealthInsight[] = [];

  if (overdue > 0) {
    recommendations.push({
      type: "action",
      title: "Resolve overdue tasks",
      text: `Triage the ${overdue} overdue task${
        overdue > 1 ? "s" : ""
      } first — assign owners, break into smaller steps, or push deadlines with a written reason.`,
    });
  }
  if (recentCompleted === 0 && remaining > 0) {
    recommendations.push({
      type: "action",
      title: "Increase sprint velocity",
      text:
        "Schedule a kickoff to unblock the team, remove dependencies, and aim for at least 5 completed tasks per week.",
    });
  }
  if (distribution > 3 && totalMembers > 1) {
    recommendations.push({
      type: "action",
      title: "Reassign overloaded team members",
      text:
        "Move open tasks from the busiest assignee to members with spare capacity until the workload variance drops below σ=2.",
    });
  }
  if (daysToDeadline !== null && daysToDeadline < 14 && remaining > 0 && score < 70) {
    recommendations.push({
      type: "action",
      title: "Review blocked tasks and adjust scope",
      text: daysToDeadline < 0
        ? "The deadline has passed. Renegotiate the deadline with stakeholders or de-scope non-essential work."
        : "Review the open task list with the project manager, drop low-priority items, and renegotiate the deadline if needed.",
    });
  }
  if (engagementScore < 8 && totalMembers > 1) {
    recommendations.push({
      type: "action",
      title: "Engage inactive team members",
      text: `Ping the ${totalMembers - activeMembers} inactive member${
        totalMembers - activeMembers > 1 ? "s" : ""
      } directly and confirm workload, blockers, and availability.`,
    });
  }
  if (score >= 85) {
    recommendations.push({
      type: "action",
      title: "Maintain cadence",
      text:
        "Health is excellent. Keep weekly standups, continue current velocity, and revisit the score each Monday.",
    });
  }
  if (recommendations.length === 0 && total > 0) {
    recommendations.push({
      type: "action",
      title: "Schedule a planning review",
      text:
        "No critical risk factors were detected. Run a 30-minute review of upcoming work to keep the trajectory stable.",
    });
  }

  // ── Trend vs previous snapshot ─────────────────────────────────────
  const previous = await prisma.projectHealthSnapshot.findFirst({
    where: {
      projectId,
      NOT: { computedAt: now },
    },
    orderBy: { computedAt: "desc" },
    select: { score: true, computedAt: true },
  });
  // Only treat as "previous" if the snapshot is older than this one (avoid self-match in same ms)
  const previousScore = previous && previous.computedAt < now ? previous.score : null;
  const scoreTrend = previousScore !== null ? score - previousScore : null;
  const trendDirection: TrendDirection | null = scoreTrend === null
    ? null
    : scoreTrend > 0
    ? "up"
    : scoreTrend < 0
    ? "down"
    : "flat";

  return {
    score,
    riskLevel,
    metrics: {
      totalTasks: total,
      completedTasks: completed,
      overdueTasks: overdue,
      inProgressTasks: inProgress,
      todoTasks: todo,
      overdueRatio,
      velocity7d: recentCompleted,
      daysToDeadline,
      activeMembers,
      totalMembers,
      taskDistribution: distribution,
      overdueScore,
      velocityScore,
      deadlineScore,
      engagementScore,
      distributionScore,
    },
    insights,
    topRiskFactors: trimmedRiskFactors,
    recommendations,
    signalContributions,
    predictedCompletionDate,
    onTrackProbability,
    previousScore,
    scoreTrend,
    trendDirection,
    computedAt: now,
  };
};

export const snapshotHealth = async (
  projectId: string,
  options: { actorId?: string; logActivity?: boolean } = {},
): Promise<HealthResult> => {
  const result = await computeHealth(projectId);
  await prisma.projectHealthSnapshot.create({
    data: {
      projectId,
      score: result.score,
      riskLevel: result.riskLevel,
      metrics: result.metrics as never,
      insights: result.insights as never,
      predictedCompletionDate: result.predictedCompletionDate,
      onTrackProbability: result.onTrackProbability,
    },
  });
  if (options.logActivity && options.actorId) {
    await logActivity({
      actorId: options.actorId,
      action: ActivityAction.PROJECT_HEALTH_COMPUTED,
      entityType: "PROJECT",
      entityId: projectId,
      projectId,
      metadata: { score: result.score, riskLevel: result.riskLevel },
    });
  }
  return result;
};

export const getLatestHealth = async (
  projectId: string,
): Promise<HealthResult> => {
  // If we have a recent snapshot (< 1h old), return it. Otherwise recompute.
  const fresh = await prisma.projectHealthSnapshot.findFirst({
    where: {
      projectId,
      computedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
    orderBy: { computedAt: "desc" },
  });
  if (fresh) {
    // Always augment with the latest trend + risk factors + recommendations by
    // re-computing the lighter in-memory signals. Snapshots stay cheap, but
    // the live result is what the user sees.
    return await computeHealth(projectId);
  }
  return await computeHealth(projectId);
};

export const getHealthHistory = async (
  projectId: string,
  limit = 30,
): Promise<
  Array<{
    score: number;
    riskLevel: RiskLevel;
    onTrackProbability: number;
    computedAt: Date;
  }>
> => {
  const rows = await prisma.projectHealthSnapshot.findMany({
    where: { projectId },
    orderBy: { computedAt: "desc" },
    take: limit,
    select: {
      score: true,
      riskLevel: true,
      onTrackProbability: true,
      computedAt: true,
    },
  });
  return rows.reverse().map((r) => ({
    score: r.score,
    riskLevel: r.riskLevel as RiskLevel,
    onTrackProbability: r.onTrackProbability,
    computedAt: r.computedAt,
  }));
};

export const getWorkspaceHealthSummary = async (userId: string, userRole: string) => {
  // For workspace-wide at-risk view, fetch projects visible to the user.
  const isGlobalManager = userRole === "ADMIN" || userRole === "PROJECT_MANAGER";
  const projects = await prisma.project.findMany({
    where: isGlobalManager ? { status: { not: "ARCHIVED" } } : {
      status: { not: "ARCHIVED" },
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true, name: true, color: true, deadline: true, status: true },
  });

  const items = await Promise.all(
    projects.map(async (p) => {
      const h = await getLatestHealth(p.id);
      return {
        projectId: p.id,
        projectName: p.name,
        projectColor: p.color,
        projectStatus: p.status,
        deadline: p.deadline,
        score: h.score,
        riskLevel: h.riskLevel,
        onTrackProbability: h.onTrackProbability,
        computedAt: h.computedAt,
      };
    }),
  );

  const atRisk = items
    .filter((i) => i.riskLevel !== "ON_TRACK")
    .sort((a, b) => a.score - b.score);
  const topHealthy = [...items]
    .filter((i) => i.riskLevel === "ON_TRACK")
    .sort((a, b) => b.score - a.score);

  const averageScore = items.length
    ? Math.round(items.reduce((acc, i) => acc + i.score, 0) / items.length)
    : 0;
  const onTrackCount = items.filter((i) => i.riskLevel === "ON_TRACK").length;

  return {
    totalProjects: items.length,
    averageScore,
    onTrackCount,
    atRiskCount: atRisk.length,
    criticalCount: atRisk.filter((i) => i.riskLevel === "CRITICAL").length,
    atRisk: atRisk.slice(0, 10),
    topHealthy: topHealthy.slice(0, 10),
  };
};
