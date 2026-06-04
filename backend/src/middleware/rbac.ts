// Project-scoped role-based access control middleware.
// Resolves the caller's role on the given project and enforces a minimum.

import type { Context, MiddlewareHandler, Next } from "hono";
import type { AppVariables } from "../types/context.ts";
import { prisma } from "../prisma/client.ts";
import { isValidObjectId } from "../utils/id.ts";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/errors.ts";
import { isRoleAtLeast, type RoleType } from "../types/domain.ts";

/** Middleware that enforces a minimum global role on the authenticated user. */
export const requireGlobalRole = (
  minRole: RoleType,
): MiddlewareHandler<{ Variables: AppVariables }> => {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user) throw new UnauthorizedError();
    if (!isRoleAtLeast(user.role as RoleType, minRole)) {
      throw new ForbiddenError(`Requires global role ${minRole} or higher`);
    }
    await next();
  };
};

export const requireProjectRole = (
  minRole: RoleType,
  paramName = "projectId",
): MiddlewareHandler<{ Variables: AppVariables }> => {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user) throw new UnauthorizedError();
    const projectId = c.req.param(paramName);
    if (!projectId || !isValidObjectId(projectId)) {
      throw new BadRequestError(`Invalid ${paramName}`);
    }
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true, status: true },
    });
    if (!project) throw new NotFoundError("Project not found");
    if (project.ownerId === user.id) {
      c.set("projectRole" as never, "ADMIN" as RoleType);
      await next();
      return;
    }
    // Global VIEWER accounts have read access to every project so they can
    // audit the workspace. They still cannot perform any project-scoped
    // writes (those are protected by requireProjectContributor / Manager /
    // Owner). Only apply this bypass at the lowest read tier.
    if (minRole === "VIEWER" && (user.role as RoleType) === "VIEWER") {
      c.set("projectRole" as never, "VIEWER" as RoleType);
      await next();
      return;
    }
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
      select: { role: true },
    });
    if (!member) throw new ForbiddenError("You are not a member of this project");
    if (!isRoleAtLeast(member.role as RoleType, minRole)) {
      throw new ForbiddenError(`Requires role ${minRole} or higher`);
    }
    c.set("projectRole" as never, member.role as RoleType);
    await next();
  };
};

export const requireProjectMember = (paramName = "projectId") =>
  requireProjectRole("VIEWER", paramName);
export const requireProjectContributor = (paramName = "projectId") =>
  requireProjectRole("TEAM_MEMBER", paramName);
export const requireProjectManager = (paramName = "projectId") =>
  requireProjectRole("PROJECT_MANAGER", paramName);
export const requireProjectOwner = (paramName = "projectId") =>
  requireProjectRole("ADMIN", paramName);
