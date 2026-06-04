// JWT auth middleware. Reads the Bearer token, verifies, and attaches the
// authenticated user to the Hono context.
// OPTIMIZED: Uses JWT claims directly — no DB lookup on every request.
// The JWT already contains sub, email, username, name. A DB lookup on every
// request was the single biggest performance bottleneck (extra 5-20ms per call).

import type { Context, MiddlewareHandler, Next } from "hono";
import type { AppVariables, AuthUser } from "../types/context.ts";
import { verifyAccessToken } from "../utils/token.ts";
import { UnauthorizedError } from "../utils/errors.ts";

// In-memory cache: userId → disabled status, TTL 60s
const disabledCache = new Map<string, { disabled: boolean; expiry: number }>();

const isDisabled = async (userId: string): Promise<boolean> => {
  const cached = disabledCache.get(userId);
  if (cached && cached.expiry > Date.now()) return cached.disabled;
  // Lazy-load prisma only when cache miss
  const { prisma } = await import("../prisma/client.ts");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  const disabled = !user || user.status === "DISABLED";
  disabledCache.set(userId, { disabled, expiry: Date.now() + 60_000 });
  return disabled;
};

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
    // Fast path: use JWT claims directly, no DB query
    // Disabled check is cached for 60s to avoid hitting DB on every request
    const disabled = await isDisabled(payload.sub);
    if (disabled) throw new UnauthorizedError("Account is disabled or no longer exists");
    c.set("user", {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      name: payload.name,
      role: payload.role ?? "TEAM_MEMBER",
    });
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
          const disabled = await isDisabled(payload.sub);
          if (!disabled) {
            c.set("user", {
              id: payload.sub,
              email: payload.email,
              username: payload.username,
              name: payload.name,
              role: payload.role ?? "TEAM_MEMBER",
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
