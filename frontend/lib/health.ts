// Project Health Intelligence — frontend types and API client.

export type RiskLevel = "ON_TRACK" | "AT_RISK" | "CRITICAL";
export type InsightType =
  | "warning"
  | "info"
  | "success"
  | "critical"
  | "action";
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
  predictedCompletionDate: string | null;
  onTrackProbability: number;
  previousScore: number | null;
  scoreTrend: number | null;
  trendDirection: TrendDirection | null;
  computedAt: string;
};

export type HealthHistoryPoint = {
  score: number;
  riskLevel: RiskLevel;
  onTrackProbability: number;
  computedAt: string;
};

export type HealthItem = {
  projectId: string;
  projectName: string;
  projectColor: string;
  projectStatus: string;
  deadline: string | null;
  score: number;
  riskLevel: RiskLevel;
  onTrackProbability: number;
  computedAt: string;
};

export type WorkspaceHealth = {
  totalProjects: number;
  averageScore: number;
  onTrackCount: number;
  atRiskCount: number;
  criticalCount: number;
  atRisk: HealthItem[];
  topHealthy: HealthItem[];
};

import { API_BASE_URL } from "./constants.ts";

const base = API_BASE_URL.replace(/\/$/, "");

export const fetchProjectHealth = async (
  projectId: string,
  token: string,
): Promise<HealthResult> => {
  const r = await fetch(`${base}/projects/${projectId}/health`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body?.message ?? "Failed to load health");
  return body.data;
};

export const fetchProjectHealthHistory = async (
  projectId: string,
  token: string,
): Promise<HealthHistoryPoint[]> => {
  const r = await fetch(`${base}/projects/${projectId}/health/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body?.message ?? "Failed to load history");
  return body.data?.items ?? [];
};

export const refreshProjectHealth = async (
  projectId: string,
  token: string,
): Promise<HealthResult> => {
  const r = await fetch(`${base}/projects/${projectId}/health/refresh`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body?.message ?? "Failed to refresh health");
  return body.data;
};

export const fetchWorkspaceHealth = async (
  token: string,
): Promise<WorkspaceHealth> => {
  const r = await fetch(`${base}/dashboard/health`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await r.json();
  if (!r.ok) {
    throw new Error(body?.message ?? "Failed to load workspace health");
  }
  return body.data;
};

export const riskColor = (risk: RiskLevel): string => {
  if (risk === "CRITICAL") return "#ef4444";
  if (risk === "AT_RISK") return "#f59e0b";
  return "#10b981";
};

export const riskLabel = (risk: RiskLevel): string => {
  if (risk === "CRITICAL") return "Critical";
  if (risk === "AT_RISK") return "At Risk";
  return "On Track";
};

export const riskEmoji = (risk: RiskLevel): string => {
  if (risk === "CRITICAL") return "🔴";
  if (risk === "AT_RISK") return "🟡";
  return "🟢";
};

export const riskShort = (risk: RiskLevel): string => {
  if (risk === "CRITICAL") return "CRITICAL";
  if (risk === "AT_RISK") return "AT_RISK";
  return "ON_TRACK";
};

export const insightAccent = (type: InsightType): string => {
  if (type === "critical") return "var(--health-danger, #ef4444)";
  if (type === "warning") return "var(--health-warning, #f59e0b)";
  if (type === "success") return "var(--health-success, #10b981)";
  if (type === "action") return "var(--health-primary, #6366f1)";
  return "var(--health-info, #3b82f6)";
};
