// Rate-limit middleware for auth routes. Simple in-memory token bucket.

import type { Context, MiddlewareHandler, Next } from "hono";
import { rateLimit } from "../utils/rate-limit.ts";
import { RateLimitError } from "../utils/errors.ts";

export const authRateLimit = (
  limit: number,
  windowMs: number,
): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0].trim() ??
      c.req.header("x-real-ip") ??
      "unknown";
    const path = c.req.path;
    const r = rateLimit(`${ip}:${path}`, limit, windowMs);
    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(r.remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(r.resetAt / 1000)));
    if (!r.allowed) {
      throw new RateLimitError("Too many requests. Please try again later.");
    }
    await next();
  };
};
