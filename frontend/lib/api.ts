import { API_BASE_URL } from "./constants.ts";
import { clearSession, getAccessToken } from "./auth.ts";
import type { ApiResponse } from "./types.ts";

type Query = Record<string, string | number | boolean | undefined | null>;

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function withQuery(path: string, query?: Query) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function api<T>(
  path: string,
  options: RequestInit & { query?: Query } = {}
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${withQuery(path, options.query)}`, {
    ...options,
    headers
  });

  let payload: ApiResponse<T> | T | null = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    payload = await response.json();
  }

  if (response.status === 401) {
    clearSession();
    if (typeof location !== "undefined" && !location.pathname.startsWith("/login")) {
      location.href = "/login";
    }
  }

  if (!response.ok) {
    const message = payload && typeof payload === "object" && "message" in payload
      ? String((payload as { message: unknown }).message)
      : "Request failed";
    throw new ApiError(message, response.status, payload);
  }

  if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
    return (payload as ApiResponse<T>).data;
  }

  return payload as T;
}

export const get = <T>(path: string, query?: Query) => api<T>(path, { query });
export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
export const patch = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
export const del = <T>(path: string) => api<T>(path, { method: "DELETE" });
