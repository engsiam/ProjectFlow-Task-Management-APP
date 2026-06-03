// JWT auth middleware. Reads the Bearer token, verifies, and attaches the
// authenticated user to the Hono context.

import type { Context, MiddlewareHandler, Next } from "hono";
import type { AppVariables, AuthUser } from "../types/context.ts";
import { verifyAccessToken } from "../utils/token.ts";
import { prisma } from "../prisma/client.ts";
import { UnauthorizedError } from "../utils/errors.ts";
import { PUBLIC_USER_FIELDS } from "../utils/serialize.ts";

export const auth = (): MiddlewareHandler<{ Variables: AppVariables }> => {
  return async (c: Context, next: Next) => {
    const header = c.req.header("Authorization") ?? c.req.header("authorization");
    if (!header || !header.toLowerCase().startsWith("bearer ")) {
      throw new UnauthorizedError("Missing or invalid Authorization header");
    }
    const token = header.slice(7).trim();
    if (!token) {
      throw new UnauthorizedError("Empty access token");
    }
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      throw new UnauthorizedError(
        err instanceof Error ? `Invalid token: ${err.message}` : "Invalid token",
      );
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: PUBLIC_USER_FIELDS,
    });
    if (!user) {
      throw new UnauthorizedError("User no longer exists");
    }
    if (user.status === "DISABLED") {
      throw new UnauthorizedError("Account is disabled");
    }
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
    };
    c.set("user", authUser);
    await next();
  };
};

export const optionalAuth = (): MiddlewareHandler<{ Variables: Partial<AppVariables> }> => {
  return async (c: Context, next: Next) => {
    const header = c.req.header("Authorization") ?? c.req.header("authorization");
    if (header && header.toLowerCase().startsWith("bearer ")) {
      const token = header.slice(7).trim();
      if (token) {
        try {
          const payload = verifyAccessToken(token);
          const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: PUBLIC_USER_FIELDS,
          });
          if (user && user.status !== "DISABLED") {
            c.set("user", {
              id: user.id,
              email: user.email,
              username: user.username,
              name: user.name,
            });
          }
        } catch {
          // ignore - treat as anonymous
        }
      }
    }
    await next();
  };
};
