// Global error handler. Converts AppError, Zod errors, and unknown errors
// into a consistent response shape. Used via app.onError().

import type { Context } from "hono";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.ts";
import { fail } from "../utils/response.ts";

export const onErrorHandler = (err: Error, c: Context) => {
  if (err instanceof AppError) {
    console.log(
      "[errorHandler] AppError:",
      err.name,
      "status:",
      err.status,
      "code:",
      err.code,
      "message:",
      err.message,
    );
    return c.json(fail(err.message, { code: err.code, details: err.details }), err.status as 400);
  }
  if (err instanceof ZodError) {
    console.log(
      "[errorHandler] ZodError:",
      err.issues.length,
      "issues",
      JSON.stringify(err.issues, null, 2),
    );
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
    console.log("[errorHandler] SyntaxError:", err.message);
    return c.json(fail("Invalid JSON body", { code: "BAD_JSON" }), 400);
  }
  console.error("[errorHandler] Unhandled error:", err.name, err.message, err.stack);
  return c.json(
    fail("Internal server error", {
      code: "INTERNAL_ERROR",
      details: err instanceof Error ? err.message : String(err),
    }),
    500,
  );
};

export { onErrorHandler as errorHandler };
