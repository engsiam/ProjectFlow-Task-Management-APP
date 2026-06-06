// Portfolio Dashboard — OpenAPI routes.
//
// Single endpoint that powers the Executive Dashboard at `/dashboard`.
// The 5 sub-endpoints (executive / forecast / team / matrix / insights)
// are also exposed for granular refresh from the frontend.

import { createRoute, z } from "@hono/zod-openapi";
import type { Handler, MiddlewareHandler } from "hono";
import * as ctrl from "../controllers/portfolio-dashboard.controller.ts";
import { auth } from "../middleware/auth.ts";
import { bearerAuth, jsonErrorResponses, jsonOkResponse } from "../docs/openapi.ts";

const tag = ["Portfolio Dashboard"];
const security = [{ bearerAuth: [] }];

const riskLevelEnum = z.enum(["ON_TRACK", "AT_RISK", "CRITICAL"]);
const trendDirectionEnum = z.enum(["up", "down", "flat"]);

const executiveSchema = z.object({
  totalProjects: z.number().int(),
  healthScore: z.number().int().min(0).max(100),
  healthyCount: z.number().int(),
  atRiskCount: z.number().int(),
  criticalCount: z.number().int(),
  weeklyTrend: z.number().int(),
  weeklyTrendDirection: trendDirectionEnum,
  narrative: z.object({ headline: z.string(), body: z.string() }),
});

const forecastSchema = z.object({
  predictedCompletionDate: z.string().datetime().nullable(),
  onTimeProbability: z.number().min(0).max(1),
  riskLevel: riskLevelEnum,
  completionTrend: z.number().int(),
  completionTrendDirection: trendDirectionEnum,
  totalRemainingTasks: z.number().int(),
  averageVelocity7d: z.number(),
  projects: z.array(z.object({
    projectId: z.string(),
    projectName: z.string(),
    predictedCompletionDate: z.string().datetime().nullable(),
    onTimeProbability: z.number().min(0).max(1),
    riskLevel: riskLevelEnum,
  })),
});

const teamSchema = z.object({
  memberCount: z.number().int(),
  teamEfficiency: z.number().int().min(0).max(100),
  topContributors: z.array(z.object({
    userId: z.string(),
    name: z.string(),
    username: z.string(),
    avatar: z.string().nullable(),
    tasksCompleted: z.number().int(),
    tasksCompleted7d: z.number().int(),
    productivityScore: z.number().int().min(0).max(100),
  })),
  workload: z.object({
    balanced: z.number().int(),
    overloaded: z.number().int(),
    underutilized: z.number().int(),
    meanOpenTasks: z.number(),
    stdDev: z.number(),
  }),
});

const matrixSchema = z.array(z.object({
  projectId: z.string(),
  projectName: z.string(),
  projectColor: z.string(),
  projectStatus: z.string(),
  healthScore: z.number().int(),
  riskLevel: riskLevelEnum,
  completionPct: z.number().int(),
  overdueTasks: z.number().int(),
  totalTasks: z.number().int(),
  completedTasks: z.number().int(),
  deadline: z.string().datetime().nullable(),
  deadlineStatus: z.enum(["ON_TRACK", "AT_RISK", "OVERDUE", "NO_DEADLINE"]),
  daysToDeadline: z.number().int().nullable(),
}));

const insightsSchema = z.array(z.object({
  type: z.enum(["warning", "info", "success"]),
  title: z.string(),
  projectId: z.string().optional(),
}));

const portfolioSchema = z.object({
  executive: executiveSchema,
  forecast: forecastSchema,
  team: teamSchema,
  matrix: matrixSchema,
  insights: insightsSchema,
});

export const getPortfolioRoute = createRoute({
  method: "get",
  path: "/api/dashboard/portfolio",
  tags: tag,
  summary: "Get the full Executive Dashboard payload in a single call",
  description: "Returns the workspace executive summary, delivery forecast, team " +
    "intelligence, project risk matrix, and rule-based enterprise " +
    "insights. Powers the Executive Dashboard section at the top of " +
    "`/dashboard`. Deterministic — no LLM, runs on free Deno Deploy tier.",
  security,
  responses: {
    200: jsonOkResponse("Portfolio dashboard", portfolioSchema),
    ...jsonErrorResponses([{ status: 401, description: "Unauthorized" }]),
  },
});

export const getExecutiveRoute = createRoute({
  method: "get",
  path: "/api/dashboard/executive",
  tags: tag,
  summary: "Executive summary (workspace health, counts, weekly trend, narrative)",
  security,
  responses: {
    200: jsonOkResponse("Executive summary", executiveSchema),
    ...jsonErrorResponses([{ status: 401, description: "Unauthorized" }]),
  },
});

export const getForecastRoute = createRoute({
  method: "get",
  path: "/api/dashboard/forecast",
  tags: tag,
  summary: "Delivery forecast (predicted completion, on-time probability, trend)",
  security,
  responses: {
    200: jsonOkResponse("Delivery forecast", forecastSchema),
    ...jsonErrorResponses([{ status: 401, description: "Unauthorized" }]),
  },
});

export const getTeamRoute = createRoute({
  method: "get",
  path: "/api/dashboard/team",
  tags: tag,
  summary: "Team intelligence (top contributors, workload distribution, efficiency)",
  security,
  responses: {
    200: jsonOkResponse("Team intelligence", teamSchema),
    ...jsonErrorResponses([{ status: 401, description: "Unauthorized" }]),
  },
});

export const getMatrixRoute = createRoute({
  method: "get",
  path: "/api/dashboard/risk-matrix",
  tags: tag,
  summary: "Project risk matrix (sorted by health, ascending)",
  security,
  responses: {
    200: jsonOkResponse("Risk matrix", matrixSchema),
    ...jsonErrorResponses([{ status: 401, description: "Unauthorized" }]),
  },
});

export const getInsightsRoute = createRoute({
  method: "get",
  path: "/api/dashboard/insights",
  tags: tag,
  summary: "Rule-based enterprise insights (deterministic, no LLM)",
  security,
  responses: {
    200: jsonOkResponse("Enterprise insights", insightsSchema),
    ...jsonErrorResponses([{ status: 401, description: "Unauthorized" }]),
  },
});

export type RouteEntry = {
  route: ReturnType<typeof createRoute>;
  handler: Handler;
  middleware: MiddlewareHandler[];
};

const m = (mw: MiddlewareHandler[]) => mw;

export const portfolioRouteEntries: RouteEntry[] = [
  { route: getPortfolioRoute, handler: ctrl.getPortfolio as Handler, middleware: m([auth()]) },
  { route: getExecutiveRoute, handler: ctrl.getExecutive as Handler, middleware: m([auth()]) },
  { route: getForecastRoute, handler: ctrl.getForecast as Handler, middleware: m([auth()]) },
  { route: getTeamRoute, handler: ctrl.getTeam as Handler, middleware: m([auth()]) },
  { route: getMatrixRoute, handler: ctrl.getMatrix as Handler, middleware: m([auth()]) },
  { route: getInsightsRoute, handler: ctrl.getInsights as Handler, middleware: m([auth()]) },
];
