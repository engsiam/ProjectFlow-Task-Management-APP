// Controller helpers. Wraps service calls in Hono handlers, sets the user agent / IP.

import type { Context } from "hono";
import type { AppVariables, AuthUser } from "../types/context.ts";

export const getClientMeta = (c: Context) => ({
  userAgent: c.req.header("user-agent") ?? c.req.header("User-Agent") ?? undefined,
  ipAddress: c.req.header("x-forwarded-for")?.split(",")[0].trim() ??
    c.req.header("x-real-ip") ??
    undefined,
});

export const getUser = (c: Context): AuthUser => {
  // deno-lint-ignore no-explicit-any
  const u = (c as any).get?.("user") as AuthUser | undefined;
  if (!u) throw new Error("User context missing");
  return u;
};

export type Variables = AppVariables;
