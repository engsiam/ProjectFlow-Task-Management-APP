// Assigns a unique request id to every request and exposes it as a header.

import type { Context, MiddlewareHandler, Next } from "hono";
import { randomToken } from "../utils/id.ts";

export const requestId = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const id = c.req.header("x-request-id") ?? randomToken(8);
    c.set("requestId" as never, id);
    c.header("X-Request-Id", id);
    await next();
  };
};
