// User routes.

import { createRoute } from "@hono/zod-openapi";
import type { Handler, MiddlewareHandler } from "hono";
import * as userCtrl from "../controllers/user.controller.ts";
import { auth } from "../middleware/auth.ts";
import { requireGlobalRole } from "../middleware/rbac.ts";
import {
  bearerAuth,
  ErrorResponseSchema,
  jsonErrorResponses,
  jsonOkResponse,
  PublicUserSchema,
  searchUsersResponse,
  updateMeBody,
  updateUserRoleBody,
} from "../docs/openapi.ts";
import { z } from "@hono/zod-openapi";

const tag = ["Users"];
const security = [{ bearerAuth: [] }];

export const updateMeRoute = createRoute({
  method: "patch",
  path: "/api/users/me",
  tags: tag,
  summary: "Update my profile",
  description: "Update name, username, avatar, or bio for the current user.",
  security,
  request: {
    body: {
      content: { "application/json": { schema: updateMeBody } },
      required: true,
    },
  },
  responses: {
    200: jsonOkResponse("Profile updated", PublicUserSchema),
    ...jsonErrorResponses([
      { status: 400, description: "Validation error" },
      { status: 401, description: "Unauthorized" },
      { status: 409, description: "Username already in use" },
    ]),
  },
});

export const searchUsersRoute = createRoute({
  method: "get",
  path: "/api/users/search",
  tags: tag,
  summary: "Search users by email, name, or username",
  description: "Used to look up users to invite to projects. Excludes the current user.",
  security,
  request: {
    query: z.object({
      q: z.string().min(1).max(80).optional().openapi({ example: "olivia" }),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    }),
  },
  responses: {
    200: jsonOkResponse("Matching users", searchUsersResponse),
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const getUserByIdRoute = createRoute({
  method: "get",
  path: "/api/users/:userId",
  tags: tag,
  summary: "Get a user by id",
  description: "Returns the public profile of a single user.",
  security,
  request: {
    params: z.object({
      userId: z.string().regex(/^[a-fA-F0-9]{24}$/),
    }),
  },
  responses: {
    200: jsonOkResponse("User profile", PublicUserSchema),
    ...jsonErrorResponses([{ status: 404, description: "User not found" }]),
  },
});

export const updateUserRoleRoute = createRoute({
  method: "patch",
  path: "/api/users/:userId/role",
  tags: tag,
  summary: "Change a user's account role (admin only)",
  description:
    "Promote or demote a user to PROJECT_MANAGER, TEAM_MEMBER, or VIEWER. Only admins can call this. Admins cannot demote themselves or other admins through this endpoint.",
  security,
  request: {
    params: z.object({
      userId: z.string().regex(/^[a-fA-F0-9]{24}$/),
    }),
    body: {
      content: { "application/json": { schema: updateUserRoleBody } },
      required: true,
    },
  },
  responses: {
    200: jsonOkResponse("Role updated", PublicUserSchema),
    ...jsonErrorResponses([
      { status: 400, description: "Validation error" },
      { status: 401, description: "Unauthorized" },
      { status: 403, description: "Forbidden (non-admin or self/other-admin target)" },
      { status: 404, description: "User not found" },
    ]),
  },
});

export type RouteEntry = {
  route: ReturnType<typeof createRoute>;
  handler: Handler;
  middleware: MiddlewareHandler[];
};

// Public route — no auth middleware. Avatars are static-ish and the
// browser requests them from <img src> without a Bearer token. The path
// uses a 24-hex `userId` constraint so it can never shadow `/api/users/me`.
export const getUserAvatarRoute = createRoute({
  method: "get",
  path: "/api/users/:userId/avatar",
  tags: tag,
  summary: "Stream a user's avatar image (DB storage only)",
  description:
    "Returns the avatar bytes stored in User.avatarData. Returns 404 if the user has no DB-stored avatar (e.g. they use an external URL).",
  request: {
    params: z.object({
      userId: z.string().regex(/^[a-fA-F0-9]{24}$/),
    }),
  },
  responses: {
    200: {
      description: "Avatar image bytes",
      content: {
        "image/*": { schema: z.string().openapi({ type: "string", format: "binary" }) },
      },
    },
    404: {
      description: "No DB-stored avatar for this user",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const userRouteEntries: RouteEntry[] = [
  { route: updateMeRoute, handler: userCtrl.updateMe as Handler, middleware: [auth()] },
  { route: searchUsersRoute, handler: userCtrl.searchUsers as Handler, middleware: [auth()] },
  { route: getUserByIdRoute, handler: userCtrl.getById as Handler, middleware: [auth()] },
  {
    route: updateUserRoleRoute,
    handler: userCtrl.updateRole as Handler,
    middleware: [auth(), requireGlobalRole("ADMIN")],
  },
  {
    route: getUserAvatarRoute,
    handler: userCtrl.getAvatar as Handler,
    middleware: [],
  },
];
