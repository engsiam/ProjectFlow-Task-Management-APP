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
  console.log("[login] Request body:", JSON.stringify(body, null, 2));
  console.log("[login] Email length:", body?.email?.length, "| Password length:", body?.password?.length);
  const meta = getClientMeta(c);
  console.log("[login] Client meta:", JSON.stringify(meta, null, 2));
  const result = await authService.login(body, meta);
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

// ── OAuth ──

import { randomToken } from "../utils/id.ts";
import { env } from "../config/env.ts";

const oauthStateStore = new Map<string, number>();

function generateState(): string {
  const state = randomToken(16);
  oauthStateStore.set(state, Date.now() + 600_000);
  return state;
}

function verifyState(state: string): boolean {
  const expiry = oauthStateStore.get(state);
  if (!expiry || expiry < Date.now()) return false;
  oauthStateStore.delete(state);
  return true;
}

export const googleAuth = (c: Context) => {
  const state = generateState();
  const url =
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.GOOGLE_CLIENT_ID}&redirect_uri=${env.OAUTH_REDIRECT_URL}/google/callback&response_type=code&scope=email+profile&state=${state}`;
  return c.redirect(url);
};

export const googleCallback = async (c: Context) => {
  const { code, state } = c.req.query() as { code?: string; state?: string };
  if (!code || !state || !verifyState(state)) {
    return c.redirect(`${env.FRONTEND_URL}/login?error=invalid_oauth_state`);
  }
  try {
    const result = await authService.loginWithOAuth("google", code);
    return c.redirect(
      `${env.FRONTEND_URL}/auth/callback#access_token=${result.accessToken}&refresh_token=${result.refreshToken}`,
    );
  } catch {
    return c.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
  }
};

export const githubAuth = (c: Context) => {
  const state = generateState();
  const url =
    `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${env.OAUTH_REDIRECT_URL}/github/callback&scope=user:email&state=${state}`;
  return c.redirect(url);
};

export const githubCallback = async (c: Context) => {
  const { code, state } = c.req.query() as { code?: string; state?: string };
  if (!code || !state || !verifyState(state)) {
    return c.redirect(`${env.FRONTEND_URL}/login?error=invalid_oauth_state`);
  }
  try {
    const result = await authService.loginWithOAuth("github", code);
    return c.redirect(
      `${env.FRONTEND_URL}/auth/callback#access_token=${result.accessToken}&refresh_token=${result.refreshToken}`,
    );
  } catch {
    return c.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
  }
};
