// Unified API response helpers that match the contract:
// { success: true, message, data } | { success: false, message, error }

import type { Context } from "hono";

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiError = {
  success: false;
  message: string;
  error?: unknown;
};

export const ok = <T>(data: T, message = "Operation successful"): ApiSuccess<T> => ({
  success: true,
  message,
  data,
});

export const fail = (message: string, error?: unknown): ApiError => ({
  success: false,
  message,
  error,
});

// Hono helpers
export const respondOk = <T>(c: Context, data: T, message?: string, status?: number) =>
  c.json(ok(data, message), (status ?? 200) as 200 | 201 | 204);

export const respondCreated = <T>(c: Context, data: T, message = "Resource created") =>
  c.json(ok(data, message), 201);

export const respondNoContent = (c: Context) => c.body(null, 204);

export const respondError = (
  c: Context,
  status: number,
  message: string,
  error?: unknown,
) => c.json(fail(message, error), status as 400);
