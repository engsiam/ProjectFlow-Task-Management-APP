// Portfolio Dashboard controller.

import type { Context } from "hono";
import * as portfolio from "../services/portfolio-dashboard.service.ts";
import { respondOk } from "../utils/response.ts";
import { getUser } from "./_helpers.ts";

const roleOf = (u: { role?: string }) =>
  (u.role ?? "VIEWER") as
    | "ADMIN"
    | "PROJECT_MANAGER"
    | "TEAM_MEMBER"
    | "VIEWER";

export const getPortfolio = async (c: Context) => {
  const user = getUser(c);
  const data = await portfolio.getPortfolioDashboard(
    user.id,
    roleOf(user),
  );
  return respondOk(c, data, "Portfolio dashboard");
};

export const getExecutive = async (c: Context) => {
  const user = getUser(c);
  const data = await portfolio.getExecutiveSummary(user.id, roleOf(user));
  return respondOk(c, data, "Executive summary");
};

export const getForecast = async (c: Context) => {
  const user = getUser(c);
  const data = await portfolio.getDeliveryForecast(user.id, roleOf(user));
  return respondOk(c, data, "Delivery forecast");
};

export const getTeam = async (c: Context) => {
  const user = getUser(c);
  const data = await portfolio.getTeamIntelligence(user.id, roleOf(user));
  return respondOk(c, data, "Team intelligence");
};

export const getMatrix = async (c: Context) => {
  const user = getUser(c);
  const data = await portfolio.getRiskMatrix(user.id, roleOf(user));
  return respondOk(c, data, "Risk matrix");
};

export const getInsights = async (c: Context) => {
  const user = getUser(c);
  const data = await portfolio.getEnterpriseInsights(user.id, roleOf(user));
  return respondOk(c, data, "Enterprise insights");
};
