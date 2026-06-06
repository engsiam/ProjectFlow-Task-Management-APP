// Project Health Insights — OpenAPI routes.

import { createRoute, z } from "@hono/zod-openapi";
import type { Handler, MiddlewareHandler } from "hono";
import * as healthCtrl from "../controllers/project-health.controller.ts";
import { auth } from "../middleware/auth.ts";
import { requireProjectMember } from "../middleware/rbac.ts";
import {
  bearerAuth,
  ErrorResponseSchema,
  jsonErrorResponses,
  jsonOkResponse,
} from "../docs/openapi.ts";

const tag = ["Health Insights"];
const security = [{ bearerAuth: [] }];

const projectIdParam = z.object({
  projectId: z.string().regex(/^[a-fA-F0-9]{24}$/),
});

const insightSchema = z.object({
  type: z.enum(["warning", "info", "success", "critical"]),
  title: z.string(),
  text: z.string(),
});

const metricsSchema = z.object({
  totalTasks: z.number().int(),
  completedTasks: z.number().int(),
  overdueTasks: z.number().int(),
  inProgressTasks: z.number().int(),
  todoTasks: z.number().int(),
  overdueRatio: z.number(),
  velocity7d: z.number().int(),
  daysToDeadline: z.number().int().nullable(),
  activeMembers: z.number().int(),
  totalMembers: z.number().int(),
  taskDistribution: z.number(),
  overdueScore: z.number().int(),
  velocityScore: z.number().int(),
  deadlineScore: z.number().int(),
  engagementScore: z.number().int(),
  distributionScore: z.number().int(),
});

const healthResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  riskLevel: z.enum(["ON_TRACK", "AT_RISK", "CRITICAL"]),
  metrics: metricsSchema,
  insights: z.array(insightSchema),
  predictedCompletionDate: z.string().datetime().nullable(),
  onTrackProbability: z.number().min(0).max(1),
  computedAt: z.string().datetime(),
});

const healthHistoryPointSchema = z.object({
  score: z.number().int(),
  riskLevel: z.enum(["ON_TRACK", "AT_RISK", "CRITICAL"]),
  onTrackProbability: z.number(),
  computedAt: z.string().datetime(),
});

const atRiskItemSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  projectColor: z.string(),
  projectStatus: z.string(),
  deadline: z.string().datetime().nullable(),
  score: z.number().int(),
  riskLevel: z.enum(["ON_TRACK", "AT_RISK", "CRITICAL"]),
  onTrackProbability: z.number(),
  computedAt: z.string().datetime(),
});

const workspaceHealthSchema = z.object({
  totalProjects: z.number().int(),
  averageScore: z.number().int(),
  atRiskCount: z.number().int(),
  criticalCount: z.number().int(),
  atRisk: z.array(atRiskItemSchema),
});

export const getProjectHealthRoute = createRoute({
  method: "get",
  path: "/api/projects/:projectId/health",
  tags: tag,
  summary: "Get current project health score and AI insights",
  description:
    "Returns a 0-100 health score, risk level, weighted metrics, " +
    "human-readable insights, predicted completion date, and on-track probability. " +
    "Computed deterministically from live project data; no LLM required.",
  security,
  request: { params: projectIdParam },
  responses: {
    200: jsonOkResponse("Project health", healthResultSchema),
    ...jsonErrorResponses([
      { status: 401, description: "Unauthorized" },
      { status: 403, description: "Not a project member" },
      { status: 404, description: "Project not found" },
    ]),
  },
});

export const refreshProjectHealthRoute = createRoute({
  method: "post",
  path: "/api/projects/:projectId/health/refresh",
  tags: tag,
  summary: "Force a fresh health computation and persist a snapshot",
  description:
    "Recomputes the health score, saves a new ProjectHealthSnapshot, " +
    "and emits a PROJECT_HEALTH_COMPUTED activity log entry. " +
    "Use this after a meaningful change to refresh the dashboard immediately.",
  security,
  request: { params: projectIdParam },
  responses: {
    200: jsonOkResponse("Project health refreshed", healthResultSchema),
    ...jsonErrorResponses([
      { status: 401, description: "Unauthorized" },
      { status: 403, description: "Not a project member" },
    ]),
  },
});

export const getProjectHealthHistoryRoute = createRoute({
  method: "get",
  path: "/api/projects/:projectId/health/history",
  tags: tag,
  summary: "Get historical health snapshots for a project",
  description:
    "Returns up to `limit` most recent snapshots (default 30) ordered oldest-to-newest " +
    "for trend charts.",
  security,
  request: {
    params: projectIdParam,
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).default(30),
    }),
  },
  responses: {
    200: jsonOkResponse("Health history", z.object({ items: z.array(healthHistoryPointSchema) })),
    ...jsonErrorResponses([
      { status: 401, description: "Unauthorized" },
      { status: 403, description: "Not a project member" },
    ]),
  },
});

export const getWorkspaceHealthRoute = createRoute({
  method: "get",
  path: "/api/dashboard/health",
  tags: tag,
  summary: "Workspace-wide at-risk project summary (dashboard widget)",
  description:
    "Returns the average health score across the caller's visible projects, " +
    "the count of at-risk and critical projects, and the 10 worst-scoring projects.",
  security,
  responses: {
    200: jsonOkResponse("Workspace health", workspaceHealthSchema),
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export type RouteEntry = {
  route: ReturnType<typeof createRoute>;
  handler: Handler;
  middleware: MiddlewareHandler[];
};

const m = (mw: MiddlewareHandler[]) => mw;

export const healthRouteEntries: RouteEntry[] = [
  {
    route: getProjectHealthRoute,
    handler: healthCtrl.getProjectHealth as Handler,
    middleware: m([auth(), requireProjectMember()]),
  },
  {
    route: refreshProjectHealthRoute,
    handler: healthCtrl.refreshProjectHealth as Handler,
    middleware: m([auth(), requireProjectMember()]),
  },
  {
    route: getProjectHealthHistoryRoute,
    handler: healthCtrl.getProjectHealthHistory as Handler,
    middleware: m([auth(), requireProjectMember()]),
  },
  {
    route: getWorkspaceHealthRoute,
    handler: healthCtrl.getWorkspaceHealth as Handler,
    middleware: m([auth()]),
  },
];
