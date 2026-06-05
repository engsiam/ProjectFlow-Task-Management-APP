import type { Role, User } from "./types.ts";
import { post } from "./api.ts";
import { setNavBypass } from "./loader.ts";

const ACCESS_TOKEN_KEY = "projectflow.accessToken";
const REFRESH_TOKEN_KEY = "projectflow.refreshToken";
const USER_KEY = "projectflow.user";

export function getAccessToken() {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveSession(data: {
  accessToken?: string;
  refreshToken?: string;
  user?: User;
}) {
  if (data.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  }
  if (data.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  }
  if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const decoded = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getCurrentUser(): User | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as User;
    if (!user.role) {
      const token = getAccessToken();
      if (token) {
        const payload = decodeJwtPayload(token);
        if (payload?.role) user.role = payload.role as Role;
      }
    }
    return user;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function logout(redirectTo = "/login") {
  setNavBypass(true);
  clearSession();
  try {
    await post("/auth/logout", undefined, { skipLoader: true, silent: true });
  } catch {
    // ignore — we are logging out either way
  }
  if (typeof location !== "undefined") {
    location.href = redirectTo;
  }
}

export function requireClientAuth() {
  if (typeof location === "undefined") return;
  if (!getAccessToken()) location.href = "/login";
}
