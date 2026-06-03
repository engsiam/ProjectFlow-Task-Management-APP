// Auth routes (signup, login, refresh, logout, me).
import { createRoute, z } from "@hono/zod-openapi";
import type { Handler } from "hono";
import * as authCtrl from "../controllers/auth.controller.ts";
import { auth } from "../middleware/auth.ts";
import { authRateLimit } from "../middleware/rate-limit.ts";
import {
  authResponseSchema,
  bearerAuth,
  ErrorResponseSchema,
  jsonCreatedResponse,
  jsonErrorResponses,
  jsonOkResponse,
  loginBodySchema,
  PublicUserSchema,
  refreshBodySchema,
  refreshResponseSchema,
  signupBodySchema,
} from "../docs/openapi.ts";

const tag = ["Auth"];

const simpleObject = z.object({ loggedOut: z.boolean() }).openapi("LogoutResult");

export const signupRoute = createRoute({
  method: "post",
  path: "/api/auth/signup",
  tags: tag,
  summary: "Sign up a new user",
  description: "Create a new user account, hash the password, and return JWT tokens.",
  request: {
    body: {
      content: { "application/json": { schema: signupBodySchema } },
      required: true,
    },
  },
  responses: {
    201: jsonCreatedResponse("User created", authResponseSchema),
    ...jsonErrorResponses([
      { status: 400, description: "Validation error", code: "BAD_REQUEST" },
      { status: 409, description: "Email already in use", code: "CONFLICT" },
      { status: 429, description: "Too many requests", code: "RATE_LIMIT" },
    ]),
  },
});

export const loginRoute = createRoute({
  method: "post",
  path: "/api/auth/login",
  tags: tag,
  summary: "Log in",
  description: "Authenticate with email and password and return JWT access + refresh tokens.",
  request: {
    body: {
      content: { "application/json": { schema: loginBodySchema } },
      required: true,
    },
  },
  responses: {
    200: jsonOkResponse("Login successful", authResponseSchema),
    ...jsonErrorResponses([
      { status: 401, description: "Invalid credentials", code: "UNAUTHORIZED" },
      { status: 429, description: "Too many requests", code: "RATE_LIMIT" },
    ]),
  },
});

export const refreshRoute = createRoute({
  method: "post",
  path: "/api/auth/refresh",
  tags: tag,
  summary: "Refresh access token",
  description:
    "Exchange a valid refresh token for a new access token (and rotate the refresh token).",
  request: {
    body: {
      content: { "application/json": { schema: refreshBodySchema } },
      required: true,
    },
  },
  responses: {
    200: jsonOkResponse("Token refreshed", refreshResponseSchema),
    ...jsonErrorResponses([
      { status: 401, description: "Invalid or expired refresh token", code: "UNAUTHORIZED" },
    ]),
  },
});

export const logoutRoute = createRoute({
  method: "post",
  path: "/api/auth/logout",
  tags: tag,
  summary: "Log out",
  description: "Revoke the provided refresh token (or all tokens if none provided).",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: false,
      content: {
        "application/json": {
          schema: z.object({ refreshToken: z.string().optional() }).openapi("LogoutBody"),
        },
      },
    },
  },
  responses: {
    200: jsonOkResponse("Logged out", simpleObject),
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const meRoute = createRoute({
  method: "get",
  path: "/api/auth/me",
  tags: tag,
  summary: "Get current user",
  description: "Return the profile of the currently authenticated user.",
  security: [{ bearerAuth: [] }],
  responses: {
    200: jsonOkResponse("Current user", PublicUserSchema),
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// Route definitions + middleware attached. The order of middleware matters:
// rate-limit first, then auth (where needed).
export type RouteEntry = {
  route: ReturnType<typeof createRoute>;
  handler: Handler;
  middleware: import("hono").MiddlewareHandler[];
};

export const authRouteEntries: RouteEntry[] = [
  {
    route: signupRoute,
    handler: authCtrl.signup as Handler,
    middleware: [authRateLimit(20, 60_000)],
  },
  {
    route: loginRoute,
    handler: authCtrl.login as Handler,
    middleware: [authRateLimit(20, 60_000)],
  },
  {
    route: refreshRoute,
    handler: authCtrl.refresh as Handler,
    middleware: [authRateLimit(60, 60_000)],
  },
  { route: logoutRoute, handler: authCtrl.logout as Handler, middleware: [auth()] },
  { route: meRoute, handler: authCtrl.me as Handler, middleware: [auth()] },
];

// Allow unused imports re-export so we can reference bearerAuth from app
export const _securityRef = bearerAuth;
