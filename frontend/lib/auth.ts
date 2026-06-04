import type { User } from "./types.ts";

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

export function getCurrentUser(): User | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function requireClientAuth() {
  if (typeof location === "undefined") return;
  if (!getAccessToken()) location.href = "/login";
}
