// Portfolio Dashboard — frontend types and API client.

export type RiskLevel = "ON_TRACK" | "AT_RISK" | "CRITICAL";
export type TrendDirection = "up" | "down" | "flat";
export type DeadlineStatus = "ON_TRACK" | "AT_RISK" | "OVERDUE" | "NO_DEADLINE";

export type ExecutiveSummary = {
  totalProjects: number;
  healthScore: number;
  healthyCount: number;
  atRiskCount: number;
  criticalCount: number;
  weeklyTrend: number;
  weeklyTrendDirection: TrendDirection;
  narrative: { headline: string; body: string };
};

export type DeliveryForecastItem = {
  projectId: string;
  projectName: string;
  predictedCompletionDate: string | null;
  onTimeProbability: number;
  riskLevel: RiskLevel;
};

export type DeliveryForecast = {
  predictedCompletionDate: string | null;
  onTimeProbability: number;
  riskLevel: RiskLevel;
  completionTrend: number;
  completionTrendDirection: TrendDirection;
  totalRemainingTasks: number;
  averageVelocity7d: number;
  projects: DeliveryForecastItem[];
};

export type TopContributor = {
  userId: string;
  name: string;
  username: string;
  avatar: string | null;
  tasksCompleted: number;
  tasksCompleted7d: number;
  productivityScore: number;
};

export type Workload = {
  balanced: number;
  overloaded: number;
  underutilized: number;
  meanOpenTasks: number;
  stdDev: number;
};

export type TeamIntelligence = {
  memberCount: number;
  teamEfficiency: number;
  topContributors: TopContributor[];
  workload: Workload;
};

export type RiskMatrixItem = {
  projectId: string;
  projectName: string;
  projectColor: string;
  projectStatus: string;
  healthScore: number;
  riskLevel: RiskLevel;
  completionPct: number;
  overdueTasks: number;
  totalTasks: number;
  completedTasks: number;
  deadline: string | null;
  deadlineStatus: DeadlineStatus;
  daysToDeadline: number | null;
};

export type EnterpriseInsight = {
  type: "warning" | "info" | "success";
  title: string;
  projectId?: string;
};

export type PortfolioDashboard = {
  executive: ExecutiveSummary;
  forecast: DeliveryForecast;
  team: TeamIntelligence;
  matrix: RiskMatrixItem[];
  insights: EnterpriseInsight[];
};

import { API_BASE_URL } from "./constants.ts";

const base = API_BASE_URL.replace(/\/$/, "");

export const fetchPortfolio = async (
  token: string,
): Promise<PortfolioDashboard> => {
  const r = await fetch(`${base}/dashboard/portfolio`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body?.message ?? "Failed to load portfolio");
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

export const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

export const fmtDate = (d: string | null) => {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
