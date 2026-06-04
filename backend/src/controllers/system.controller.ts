// Analytics + dashboard + export + health controllers.

import type { Context } from "hono";
import * as analyticsService from "../services/analytics.service.ts";
import * as exportService from "../services/export.service.ts";
import * as healthService from "../services/health.service.ts";
import { respondOk } from "../utils/response.ts";
import { getUser } from "./_helpers.ts";
import { cacheGet, cacheSet, cacheKey } from "../utils/cache.ts";

const DASHBOARD_CACHE_TTL = 10_000; // 10s

export const dashboard = async (c: Context) => {
  const user = getUser(c);
  const key = cacheKey(user.id, "dashboard");
  const cached = cacheGet<ReturnType<typeof analyticsService.getDashboard>>(key);
  if (cached) return respondOk(c, cached, "Dashboard (cached)");
  const result = await analyticsService.getDashboard(user.id, user.role as never);
  cacheSet(key, result, DASHBOARD_CACHE_TTL);
  return respondOk(c, result, "Dashboard");
};

export const projectAnalytics = async (c: Context) => {
  const user = getUser(c);
  const projectId = c.req.param("projectId");
  try {
    const result = await analyticsService.getProjectAnalytics(user.id, user.role as never, projectId);
    return respondOk(c, result, "Project analytics");
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Project not found") {
        return c.json({ success: false, message: err.message, error: { code: "NOT_FOUND" } }, 404);
      }
      if (err.message === "Forbidden") {
        return c.json({ success: false, message: err.message, error: { code: "FORBIDDEN" } }, 403);
      }
    }
    throw err;
  }
};

export const exportCSV = async (c: Context) => {
  const user = getUser(c);
  const projectId = c.req.param("projectId");
  const { csv, filename } = await exportService.exportProjectTasksCSV(user.id, projectId);
  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="${filename}"`);
  return c.body(csv);
};

export const health = async (c: Context) => {
  const result = await healthService.getHealth();
  const status = result.status === "ok" ? 200 : 503;
  return c.json(
    { success: result.status === "ok", message: "Service is " + result.status, data: result },
    status as 200,
  );
};
