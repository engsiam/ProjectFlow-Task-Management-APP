// Generic validation middleware factories for JSON body, query, and params.

import type { Context, MiddlewareHandler, Next } from "hono";
import type { ZodTypeAny } from "zod";

type Source = "json" | "query" | "param" | "header";

const parseSource = async (
  c: Context,
  source: Source,
  schema: ZodTypeAny,
): Promise<unknown> => {
  let raw: unknown;
  switch (source) {
    case "json":
      raw = await c.req.json().catch(() => ({}));
      break;
    case "query":
      raw = Object.fromEntries(new URL(c.req.url).searchParams);
      break;
    case "param":
      raw = c.req.param();
      break;
    case "header":
      raw = c.req.header();
      break;
  }
  return schema.parse(raw);
};

export const validate = (
  source: Source,
  schema: ZodTypeAny,
  targetKey: string,
): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const parsed = await parseSource(c, source, schema);
    c.set(targetKey as never, parsed as never);
    await next();
  };
};
