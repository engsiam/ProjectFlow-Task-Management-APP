// Global error handler. Converts AppError, Zod errors, and unknown errors
// into a consistent response shape. Used via app.onError().

import type { Context } from "hono";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.ts";
import { fail } from "../utils/response.ts";

export const onErrorHandler = (err: Error, c: Context) => {
  if (err instanceof AppError) {
    return c.json(fail(err.message, { code: err.code, details: err.details }), err.status as 400);
  }
  if (err instanceof ZodError) {
    return c.json(
      fail("Validation failed", {
        code: "VALIDATION_ERROR",
        details: err.issues.map((
          i: { path: (string | number)[]; message: string; code: string },
        ) => ({
          path: i.path.join("."),
          message: i.message,
          code: i.code,
        })),
      }),
      422,
    );
  }
  if (err instanceof SyntaxError) {
    return c.json(fail("Invalid JSON body", { code: "BAD_JSON" }), 400);
  }
  console.error("[onError]", err);
  return c.json(
    fail("Internal server error", {
      code: "INTERNAL_ERROR",
      details: err instanceof Error ? err.message : String(err),
    }),
    500,
  );
};

export { onErrorHandler as errorHandler };
