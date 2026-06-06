// Analytics — OpenAPI routes.
//
// Powers the Analytics page (`/analytics`). Wires up:
//
//   - GET /api/analytics/dashboard           — workspace-wide charts (existing service)
//   - GET /api/analytics/project/:projectId  — single-project charts (existing service)
//   - GET /api/analytics/trends              — 5 trend series in one call
//   - GET /api/analytics/trends/completion
//   - GET /api/analytics/trends/velocity
//   - GET /api/analytics/trends/overdue
//   - GET /api/analytics/trends/team-activity
//   - GET /api/analytics/trends/project-health

import { createRoute, z } from "@hono/zod-openapi";
import type { Context, Handler, MiddlewareHandler } from "hono";
import * as charts from "../services/analytics-charts.service.ts";
import * as trends from "../services/analytics-trends.service.ts";
import { auth } from "../middleware/auth.ts";
import { requireProjectMember } from "../middleware/rbac.ts";
import { bearerAuth, jsonErrorResponses, jsonOkResponse } from "../docs/openapi.ts";
import type { RoleType } from "../types/domain.ts";

const tag = ["Analytics"];
const security = [{ bearerAuth: [] }];

const projectIdParam = z.object({
  projectId: z.string().regex(/^[a-fA-F0-9]{24}$/),
});

const trendPoint = z.object({
  date: z.string(),
  label: z.string(),
  value: z.number(),
});

const trendQuery = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
});

// Re-shape the DashboardCharts for OpenAPI (subset).
const priorityDatum = z.object({
  name: z.string(),
  label: z.string(),
  value: z.number().int(),
  color: z.string(),
});
const statusDatum = z.object({
  name: z.string(),
  label: z.string(),
  value: z.number().int(),
  color: z.string(),
});
const trendDatum = z.object({
  date: z.string(),
  label: z.string(),
  created: z.number().int(),
  completed: z.number().int(),
});
const productivityDatum = z.object({
  userId: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  completed: z.number().int(),
  inProgress: z.number().int(),
  total: z.number().int(),
});
const comparisonDatum = z.object({
  label: z.string(),
  completed: z.number().int(),
  overdue: z.number().int(),
  pending: z.number().int(),
});
const kpiSchema = z.object({
  totalProjects: z.number().int(),
  totalTasks: z.number().int(),
  completedTasks: z.number().int(),
  pendingTasks: z.number().int(),
  overdueTasks: z.number().int(),
  completionRate: z.number().int(),
});
const chartsSchema = z.object({
  kpi: kpiSchema,
  byPriority: z.array(priorityDatum),
  byStatus: z.array(statusDatum),
  trend: z.array(trendDatum),
  productivity: z.array(productivityDatum),
  comparison: z.array(comparisonDatum),
  generatedAt: z.string().datetime(),
});

const trendsBundleSchema = z.object({
  completion: z.object({ completed: z.array(trendPoint), created: z.array(trendPoint) }),
  velocity: z.array(trendPoint),
  overdue: z.array(trendPoint),
  activity: z.array(trendPoint),
  health: z.array(trendPoint),
  days: z.number().int(),
});

const roleOf = (u: { role?: string }) => (u.role ?? "VIEWER") as RoleType;

// ── Dashboard charts ────────────────────────────────────────────
export const getAnalyticsDashboardRoute = createRoute({
  method: "get",
  path: "/api/analytics/dashboard",
  tags: tag,
  summary: "Workspace-wide chart payload (KPI, status, priority, trend, productivity)",
  security,
  responses: {
    200: jsonOkResponse("Dashboard charts", chartsSchema),
    ...jsonErrorResponses([{ status: 401, description: "Unauthorized" }]),
  },
});

export const getAnalyticsProjectRoute = createRoute({
  method: "get",
  path: "/api/analytics/project/:projectId",
  tags: tag,
  summary: "Single-project chart payload",
  security,
  request: { params: projectIdParam },
  responses: {
    200: jsonOkResponse("Project charts", chartsSchema),
    ...jsonErrorResponses([
      { status: 401, description: "Unauthorized" },
      { status: 403, description: "Not a project member" },
      { status: 404, description: "Project not found" },
    ]),
  },
});

// ── Trends ───────────────────────────────────────────────────────
export const getAllTrendsRoute = createRoute({
  method: "get",
  path: "/api/analytics/trends",
  tags: tag,
  summary: "All 5 trend series in one call (completion, velocity, overdue, activity, health)",
  security,
  request: { query: trendQuery },
  responses: {
    200: jsonOkResponse("All trends", trendsBundleSchema),
    ...jsonErrorResponses([{ status: 401, description: "Unauthorized" }]),
  },
});

const trendArraySchema = z.object({ items: z.array(trendPoint) });

export const getCompletionTrendRoute = createRoute({
  method: "get",
  path: "/api/analytics/trends/completion",
  tags: tag,
  summary: "Completion trend (daily created vs completed)",
  security,
  request: { query: trendQuery },
  responses: {
    200: jsonOkResponse(
      "Completion trend",
      z.object({
        completed: z.array(trendPoint),
        created: z.array(trendPoint),
      }),
    ),
    ...jsonErrorResponses([{ status: 401, description: "Unauthorized" }]),
  },
});

export const getVelocityTrendRoute = createRoute({
  method: "get",
  path: "/api/analytics/trends/velocity",
  tags: tag,
  summary: "7-day rolling velocity (tasks completed per day, smoothed)",
  security,
  request: { query: trendQuery },
  responses: {
    200: jsonOkResponse("Velocity trend", trendArraySchema),
    ...jsonErrorResponses([{ status: 401, description: "Unauthorized" }]),
  },
});

export const getOverdueTrendRoute = createRoute({
  method: "get",
  path: "/api/analytics/trends/overdue",
  tags: tag,
  summary: "Daily count of overdue tasks (time-machine snapshot)",
  security,
  request: { query: trendQuery },
  responses: {
    200: jsonOkResponse("Overdue trend", trendArraySchema),
    ...jsonErrorResponses([{ status: 401, description: "Unauthorized" }]),
  },
});

export const getActivityTrendRoute = createRoute({
  method: "get",
  path: "/api/analytics/trends/team-activity",
  tags: tag,
  summary: "Daily count of activity log entries",
  security,
  request: { query: trendQuery },
  responses: {
    200: jsonOkResponse("Team activity trend", trendArraySchema),
    ...jsonErrorResponses([{ status: 401, description: "Unauthorized" }]),
  },
});

export const getHealthTrendRoute = createRoute({
  method: "get",
  path: "/api/analytics/trends/project-health",
  tags: tag,
  summary: "Daily average project health score (0–100)",
  security,
  request: { query: trendQuery },
  responses: {
    200: jsonOkResponse("Project health trend", trendArraySchema),
    ...jsonErrorResponses([{ status: 401, description: "Unauthorized" }]),
  },
});

export type RouteEntry = {
  route: ReturnType<typeof createRoute>;
  handler: Handler;
  middleware: MiddlewareHandler[];
};

const m = (mw: MiddlewareHandler[]) => mw;

// ── Handlers ─────────────────────────────────────────────────────
export const analyticsDashboardHandler: Handler = async (c) => {
  const u = c.get("user") as { id: string; role?: string };
  const data = await charts.getDashboardCharts(u.id, roleOf(u));
  return c.json({ success: true, message: "Dashboard charts", data });
};

export const analyticsProjectHandler: Handler = async (c) => {
  const u = c.get("user") as { id: string; role?: string };
  const projectId = c.req.param("projectId");
  const data = await charts.getProjectCharts(u.id, roleOf(u), projectId);
  return c.json({ success: true, message: "Project charts", data });
};

const trendsUser = (c: { get: (k: string) => unknown }) => {
  const u = c.get("user") as { id: string; role?: string };
  return { id: u.id, role: roleOf(u) };
};

export const allTrendsHandler: Handler = async (c) => {
  const u = trendsUser(c);
  const days = parseInt(c.req.query("days") ?? "30", 10) || 30;
  const data = await trends.getAllTrends(u.id, u.role, days);
  return c.json({ success: true, message: "All trends", data });
};

const trendItems = async (
  fn: (uid: string, role: RoleType, days: number) => Promise<unknown[]>,
  c: Context,
) => {
  const u = c.get("user") as { id: string; role?: string };
  const days = parseInt(c.req.query("days") ?? "30", 10) || 30;
  const items = await fn(u.id, roleOf(u), days);
  return c.json({ success: true, message: "Trend", data: { items } });
};

export const completionTrendHandler: Handler = async (c) => {
  const u = c.get("user") as { id: string; role?: string };
  const days = parseInt(c.req.query("days") ?? "30", 10) || 30;
  const data = await trends.getCompletionTrend(u.id, roleOf(u), days);
  return c.json({ success: true, message: "Completion trend", data });
};

export const velocityTrendHandler: Handler = async (c) =>
  await trendItems(trends.getVelocityTrend, c);

export const overdueTrendHandler: Handler = async (c) =>
  await trendItems(trends.getOverdueTrend, c);

export const activityTrendHandler: Handler = async (c) =>
  await trendItems(trends.getTeamActivityTrend, c);

export const healthTrendHandler: Handler = async (c) =>
  await trendItems(trends.getProjectHealthTrend, c);

export const analyticsRouteEntries: RouteEntry[] = [
  {
    route: getAnalyticsDashboardRoute,
    handler: analyticsDashboardHandler,
    middleware: m([auth()]),
  },
  {
    route: getAnalyticsProjectRoute,
    handler: analyticsProjectHandler,
    middleware: m([auth(), requireProjectMember()]),
  },
  { route: getAllTrendsRoute, handler: allTrendsHandler, middleware: m([auth()]) },
  { route: getCompletionTrendRoute, handler: completionTrendHandler, middleware: m([auth()]) },
  { route: getVelocityTrendRoute, handler: velocityTrendHandler, middleware: m([auth()]) },
  { route: getOverdueTrendRoute, handler: overdueTrendHandler, middleware: m([auth()]) },
  { route: getActivityTrendRoute, handler: activityTrendHandler, middleware: m([auth()]) },
  { route: getHealthTrendRoute, handler: healthTrendHandler, middleware: m([auth()]) },
];
