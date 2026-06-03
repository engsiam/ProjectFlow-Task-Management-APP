// Auth controller. Reads validated input from c.req.valid (provided by Hono's
// validator middleware set up by OpenAPIHono via zValidator).

import type { Context } from "hono";
import * as authService from "../services/auth.service.ts";
import { respondOk } from "../utils/response.ts";
import { getClientMeta, getUser } from "./_helpers.ts";
import type { LoginInput, RefreshInput, SignupInput } from "../validators/auth.validator.ts";

export const signup = async (c: Context) => {
  // deno-lint-ignore no-explicit-any
  const body = (c.req as any).valid("json") as SignupInput;
  const result = await authService.signup(body, getClientMeta(c));
  return respondOk(c, result, "Signup successful", 201);
};

export const login = async (c: Context) => {
  // deno-lint-ignore no-explicit-any
  const body = (c.req as any).valid("json") as LoginInput;
  const result = await authService.login(body, getClientMeta(c));
  return respondOk(c, result, "Login successful");
};

export const refresh = async (c: Context) => {
  // deno-lint-ignore no-explicit-any
  const body = (c.req as any).valid("json") as RefreshInput;
  const result = await authService.refresh(body);
  return respondOk(c, result, "Token refreshed");
};

export const logout = async (c: Context) => {
  const user = getUser(c);
  // deno-lint-ignore no-explicit-any
  const body = ((c.req as any).valid("json") ?? {}) as { refreshToken?: string };
  await authService.logout(user.id, body.refreshToken);
  return respondOk(c, { loggedOut: true }, "Logged out successfully");
};

export const me = async (c: Context) => {
  const user = getUser(c);
  const result = await authService.me(user.id);
  return respondOk(c, result, "Current user");
};
