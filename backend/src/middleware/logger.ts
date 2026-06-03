// HTTP access logger. Lightweight, non-blocking.

import type { Context, MiddlewareHandler, Next } from "hono";

export const logger = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const start = performance.now();
    const method = c.req.method;
    const url = c.req.url;
    await next();
    const ms = (performance.now() - start).toFixed(1);
    const status = c.res.status;
    const color = status >= 500 ? "\x1b[31m" : status >= 400 ? "\x1b[33m" : "\x1b[32m";
    console.log(
      `${color}${method}\x1b[0m ${status} ${url} \x1b[90m${ms}ms\x1b[0m`,
    );
  };
};
