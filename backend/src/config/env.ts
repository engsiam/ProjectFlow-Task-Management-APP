// Environment configuration loaded from process.env / Deno.env
// Provides strongly-typed access with safe defaults.

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

try {
  // Best-effort load of .env in development (Deno does not auto-load .env).
  // We try to read .env from the project root and parse simple KEY=VALUE lines.
  const envText = await Deno.readTextFile(".env").catch(() => "");
  if (envText) {
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
      if (!Deno.env.get(key)) {
        Deno.env.set(key, val);
      }
    }
  }
} catch {
  // ignore - env may already be set
}

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
  FRONTEND_URL: optional("FRONTEND_URL", "http://localhost:8001"),
  PORT: optional("PORT", "8000"),
  NODE_ENV: optional("NODE_ENV", "development"),
  API_VERSION: "1.0.0",
};

export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";
