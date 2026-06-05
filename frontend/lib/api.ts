import { API_BASE_URL } from "./constants.ts";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  saveSession,
} from "./auth.ts";
import type { ApiResponse } from "./types.ts";
import { recordApiCall } from "./api-metrics.ts";

type Query = Record<string, string | number | boolean | undefined | null>;
type Paginated<T> = {
  items: T[];
  pagination?: unknown;
  total?: number;
};

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

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        return false;
      }
      const body = await res.json();
      if (body?.success && body?.data) {
        saveSession(body.data);
        return true;
      }
      return false;
    } catch {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      return false;
    }
  }
  return false;
}

export async function api<T>(
  path: string,
  options: RequestInit & { query?: Query } = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const start = performance.now();

  const makeRequest = (token: string | null) => {
    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(`${API_BASE_URL}${withQuery(path, options.query)}`, {
      ...options,
      headers,
    });
  };

  let response = await makeRequest(getAccessToken());
  let status = response.status;

  // Transparent token refresh on 401
  if (response.status === 401) {
    if (!refreshPromise) {
      refreshPromise = tryRefresh();
    }
    const refreshed = await refreshPromise;
    refreshPromise = null;
    if (refreshed) {
      response = await makeRequest(getAccessToken());
      status = response.status;
    } else {
      const elapsed = Math.round(performance.now() - start);
      recordApiCall({
        method,
        path,
        status: 401,
        duration: elapsed,
        timestamp: Date.now(),
      });
      clearSession();
      if (
        typeof location !== "undefined" &&
        !location.pathname.startsWith("/login")
      ) {
        location.href = "/login";
      }
      throw new ApiError("Session expired", 401, null);
    }
  }

  let payload: ApiResponse<T> | T | null = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    payload = await response.json();
  }

  const elapsed = Math.round(performance.now() - start);
  recordApiCall({
    method,
    path,
    status,
    duration: elapsed,
    timestamp: Date.now(),
  });

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : "Request failed";
    throw new ApiError(message, response.status, payload);
  }

  if (
    payload && typeof payload === "object" && "success" in payload &&
    "data" in payload
  ) {
    return (payload as ApiResponse<T>).data;
  }

  return payload as T;
}

export function normalizeEntity<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => normalizeEntity(item)) as T;
  }

  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(record)) {
    next[key] = normalizeEntity(item);
  }

  if (typeof next.avatar === "string" && !next.avatarUrl) {
    next.avatarUrl = next.avatar;
  }
  if (typeof next.content === "string" && !next.body) {
    next.body = next.content;
  }
  if (next._count && typeof next._count === "object") {
    const count = next._count as Record<string, unknown>;
    if (typeof count.comments === "number" && next.commentCount === undefined) {
      next.commentCount = count.comments;
    }
    if (typeof count.tasks === "number" && next.taskCount === undefined) {
      next.taskCount = count.tasks;
    }
  }

  return next as T;
}

export const get = <T>(path: string, query?: Query) =>
  api<T>(path, { query }).then(normalizeEntity);
export const getList = async <T>(path: string, query?: Query): Promise<T[]> => {
  const data = await api<T[] | Paginated<T>>(path, { query });
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : [];
  return normalizeEntity(items);
};
export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  }).then(
    normalizeEntity,
  );
export const patch = <T>(path: string, body?: unknown) =>
  api<T>(path, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  }).then(
    normalizeEntity,
  );
export const del = <T>(path: string) => api<T>(path, { method: "DELETE" });

/**
 * Upload a file as multipart/form-data. Does not set Content-Type
 * (the browser adds the boundary automatically). Records API metrics
 * for the underlying call. Returns the parsed JSON body.
 */
export const uploadFile = async <T>(
  path: string,
  file: File,
  fieldName = "file",
): Promise<T> => {
  const start = performance.now();
  const method = "POST";
  const form = new FormData();
  form.append(fieldName, file);
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: form,
  });
  const elapsed = Math.round(performance.now() - start);
  recordApiCall({
    method,
    path,
    status: response.status,
    duration: elapsed,
    timestamp: Date.now(),
  });

  let payload: ApiResponse<T> | T | null = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    payload = await response.json();
  }
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : "Upload failed";
    throw new ApiError(message, response.status, payload);
  }
  if (
    payload && typeof payload === "object" && "success" in payload &&
    "data" in payload
  ) {
    return normalizeEntity((payload as ApiResponse<T>).data);
  }
  return payload as T;
};
