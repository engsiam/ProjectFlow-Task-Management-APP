// Environment configuration loaded from process.env / Deno.env
// Provides strongly-typed access with safe defaults and a Deploy-aware
// `isDeploy` flag for platform-specific branches.

const required = (key: string, fallback?: string): string => {
  const v = Deno.env.get(key) ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return v;
};

const optional = (key: string, fallback: string): string => {
  return Deno.env.get(key) ?? fallback;
};

// Detect Deno Deploy. The runtime sets DENO_DEPLOYMENT_ID on every request
// and on boot. We also fall back to Deno.env Deno-specific signals.
const isDeployRuntime = Boolean(
  Deno.env.get("DENO_DEPLOYMENT_ID") ??
    Deno.env.get("DENO_REGION"),
);

// Auto-default NODE_ENV to "production" on Deploy when not set, since
// Deploy always runs in production mode.
if (isDeployRuntime && !Deno.env.get("NODE_ENV")) {
  Deno.env.set("NODE_ENV", "production");
}

// Best-effort .env loader — only runs on local FS, never on Deploy.
// Wrapped in a single try/catch to make this a no-op on Deploy.
const loadLocalDotEnv = async () => {
  if (isDeployRuntime) return;
  try {
    const envText = await Deno.readTextFile(".env").catch(() => "");
    if (!envText) return;
    for (const line of envText.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!Deno.env.get(key)) Deno.env.set(key, val);
    }
  } catch {
    // ignore
  }
};

await loadLocalDotEnv();

// Production-safe defaults. Local dev should override these via `.env`.
// On Deno Deploy, env vars must be set in the project settings; if missing,
// the fallbacks below point at the deployed production URLs.
const PRODUCTION_BACKEND_URL = "https://projectflow-backend.engsiam.deno.net";
const PRODUCTION_FRONTEND_URL = "https://projectflow-frontend.engsiam.deno.net";

// On local dev, fall back to localhost URLs so a fresh clone boots
// without requiring the operator to edit `.env` first.
const LOCAL_BACKEND_URL = "http://localhost:8000";
const LOCAL_FRONTEND_URL = "http://localhost:8001";

const defaultBackendUrl = isDeployRuntime ? PRODUCTION_BACKEND_URL : LOCAL_BACKEND_URL;
const defaultFrontendUrl = isDeployRuntime ? PRODUCTION_FRONTEND_URL : LOCAL_FRONTEND_URL;

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  JWT_ACCESS_SECRET: required(
    "JWT_ACCESS_SECRET",
    "dev-access-secret-please-change-me-in-production-32chars",
  ),
  JWT_REFRESH_SECRET: required(
    "JWT_REFRESH_SECRET",
    "dev-refresh-secret-please-change-me-in-production-32chars",
  ),
  ACCESS_TOKEN_EXPIRES_IN: optional("ACCESS_TOKEN_EXPIRES_IN", "15m"),
  REFRESH_TOKEN_EXPIRES_IN: optional("REFRESH_TOKEN_EXPIRES_IN", "7d"),
  GOOGLE_CLIENT_ID: optional("GOOGLE_CLIENT_ID", ""),
  GOOGLE_CLIENT_SECRET: optional("GOOGLE_CLIENT_SECRET", ""),
  GITHUB_CLIENT_ID: optional("GITHUB_CLIENT_ID", ""),
  GITHUB_CLIENT_SECRET: optional("GITHUB_CLIENT_SECRET", ""),
  // Public URL of THIS backend (no trailing slash). Used for OpenAPI
  // server entries, absolute file URLs, and anywhere we need to tell
  // clients where to reach us.
  API_PUBLIC_URL: optional("API_PUBLIC_URL", defaultBackendUrl),
  // OAuth redirect URL (where Google/GitHub call us back). Should be
  // `${API_PUBLIC_URL}/api/auth` in production.
  OAUTH_REDIRECT_URL: optional(
    "OAUTH_REDIRECT_URL",
    `${defaultBackendUrl}/api/auth`,
  ),
  // Public URL of the frontend (used for post-OAuth redirects and CORS).
  FRONTEND_URL: optional("FRONTEND_URL", defaultFrontendUrl),
  PORT: optional("PORT", "8000"),
  NODE_ENV: optional("NODE_ENV", "development"),
  // When set, uploaded files are stored on the local FS under this dir.
  // On Deploy, leave empty so the upload service returns 503 with a clear
  // message pointing at object storage (R2/S3) for production storage.
  UPLOAD_DIR: optional("UPLOAD_DIR", "uploads"),
  // When true, force local FS uploads to be disabled (Deploy-safe default).
  STORAGE_BACKEND: optional("STORAGE_BACKEND", isDeployRuntime ? "disabled" : "local"),
  API_VERSION: "1.0.0",
};

export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";
export const isDeploy = isDeployRuntime;

// Storage backend flags for the upload + attachment services.
export const storageDisabled = env.STORAGE_BACKEND === "disabled" ||
  isDeployRuntime;
