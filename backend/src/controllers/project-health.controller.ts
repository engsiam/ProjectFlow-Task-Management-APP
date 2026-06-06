// Project Health Insights — controllers.

import type { Context } from "hono";
import * as healthService from "../services/health-score.service.ts";
import { respondOk } from "../utils/response.ts";
import { getUser } from "./_helpers.ts";

export const getProjectHealth = async (c: Context) => {
  const projectId = c.req.param("projectId");
  const result = await healthService.getLatestHealth(projectId);
  return respondOk(c, result, "Project health");
};

export const getProjectHealthHistory = async (c: Context) => {
  const projectId = c.req.param("projectId");
  const limit = Math.min(
    100,
    Math.max(1, parseInt(c.req.query("limit") ?? "30", 10) || 30),
  );
  const history = await healthService.getHealthHistory(projectId, limit);
  return respondOk(c, { items: history }, "Health history");
};

export const refreshProjectHealth = async (c: Context) => {
  const user = getUser(c);
  const projectId = c.req.param("projectId");
  const result = await healthService.snapshotHealth(projectId, {
    actorId: user.id,
    logActivity: true,
  });
  return respondOk(c, result, "Project health refreshed");
};

export const getWorkspaceHealth = async (c: Context) => {
  const user = getUser(c);
  const summary = await healthService.getWorkspaceHealthSummary(
    user.id,
    user.role as string,
  );
  return respondOk(c, summary, "Workspace health");
};
