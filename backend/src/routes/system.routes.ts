// System routes: health, dashboard, project analytics, export.

import { createRoute, z } from "@hono/zod-openapi";
import type { Handler, MiddlewareHandler } from "hono";
import * as sysCtrl from "../controllers/system.controller.ts";
import { auth } from "../middleware/auth.ts";
import { requireProjectManager, requireProjectMember } from "../middleware/rbac.ts";
import {
  bearerAuth,
  dashboardResponseData,
  ErrorResponseSchema,
  healthResponseData,
  jsonErrorResponses,
  jsonOkResponse,
  projectAnalyticsData,
} from "../docs/openapi.ts";

const tag = ["System"];

export const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: tag,
  summary: "Health & system status",
  description:
    "Public endpoint. Returns API status, database status, runtime, timestamp, and version.",
  responses: {
    200: {
      description: "Service is healthy",
      content: { "application/json": { schema: healthResponseData } },
    },
    503: {
      description: "Service is degraded",
      content: { "application/json": { schema: healthResponseData } },
    },
  },
});

export const dashboardRoute = createRoute({
  method: "get",
  path: "/api/dashboard",
  tags: tag,
  summary: "Personal dashboard analytics",
  description:
    "Returns project counts, task counts by status/priority, overdue, recent activity, etc.",
  security: [{ bearerAuth: [] }],
  responses: {
    200: jsonOkResponse("Dashboard", dashboardResponseData),
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const projectAnalyticsRoute = createRoute({
  method: "get",
  path: "/api/projects/:projectId/analytics",
  tags: tag,
  summary: "Per-project analytics",
  description:
    "Detailed analytics for a single project: status/priority breakdown, member workload, team productivity.",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ projectId: z.string().regex(/^[a-fA-F0-9]{24}$/) }),
  },
  responses: {
    200: jsonOkResponse("Project analytics", projectAnalyticsData),
    ...jsonErrorResponses([
      { status: 403, description: "Not a member" },
      { status: 404, description: "Project not found" },
    ]),
  },
});

export const exportTasksRoute = createRoute({
  method: "get",
  path: "/api/projects/:projectId/export/tasks.csv",
  tags: tag,
  summary: "Export project tasks as CSV",
  description: "Returns a CSV file with all tasks in the project. OWNER or MANAGER only.",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ projectId: z.string().regex(/^[a-fA-F0-9]{24}$/) }),
  },
  responses: {
    200: {
      description: "CSV file download",
      content: {
        "text/csv": { schema: z.string().openapi("CsvFile") },
      },
    },
    ...jsonErrorResponses([
      { status: 403, description: "Forbidden" },
      { status: 404, description: "Project not found" },
    ]),
  },
});

export type RouteEntry = {
  route: ReturnType<typeof createRoute>;
  handler: Handler;
  middleware: MiddlewareHandler[];
};

const m = (mw: MiddlewareHandler[]) => mw;

export const systemRouteEntries: RouteEntry[] = [
  { route: healthRoute, handler: sysCtrl.health as Handler, middleware: m([]) },
  { route: dashboardRoute, handler: sysCtrl.dashboard as Handler, middleware: m([auth()]) },
  {
    route: projectAnalyticsRoute,
    handler: sysCtrl.projectAnalytics as Handler,
    middleware: m([auth(), requireProjectMember()]),
  },
  {
    route: exportTasksRoute,
    handler: sysCtrl.exportCSV as Handler,
    middleware: m([auth(), requireProjectManager()]),
  },
];
