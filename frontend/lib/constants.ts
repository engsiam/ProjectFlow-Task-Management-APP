// Single source of truth for the backend API base URL.
//
// Resolution order (server-side, evaluated at module load):
//   1. `API_BASE_URL` from `.env` (Deno 2.x auto-loads it from cwd)
//   2. Hardcoded production fallback below
//
// The client bundle also uses this same constant. Fresh's browser polyfill
// makes `Deno.env.get()` return `undefined` in the browser, so islands and
// hydrated code fall through to the same hardcoded production URL. In dev
// (`deno task start`) the `.env` value takes precedence on the server, but
// client-side requests still hit the production URL — point your local
// backend to the production URL or set `API_BASE_URL` in a `.env.local`
// that you import before the bundle builds (see README).
//
// The `__DEV__` flag is set by `dev.ts` / `fresh.config.ts` at boot. In dev
// we log the resolved base URL to the console so it's obvious which backend
// the bundle is talking to.

declare global {
  // deno-lint-ignore no-var
  var __DEV__: boolean | undefined;
  // deno-lint-ignore no-var
  var __APP_VERSION__: string | undefined;
}

const isDev = globalThis.__DEV__ === true;
const appVersion = globalThis.__APP_VERSION__ ?? "1.0.0";

const PRODUCTION_API_BASE_URL = "https://projectflow-backend.engsiam.deno.net/api";

const RAW_API_BASE_URL =
  (typeof Deno !== "undefined" && Deno.env.get("API_BASE_URL")) ||
  PRODUCTION_API_BASE_URL;

const NORMALIZED_API_BASE_URL = RAW_API_BASE_URL.trim().replace(/\/+$/, "");

export const API_BASE_URL = NORMALIZED_API_BASE_URL;

// Backend origin (no /api suffix) — used for raw-origin URLs like file
// downloads that live outside `/api`.
export const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

// Health and Swagger are mounted at the backend root.
export const HEALTH_URL = `${BACKEND_ORIGIN}/health`;
export const SWAGGER_URL = `${BACKEND_ORIGIN}/docs`;

if (isDev && typeof console !== "undefined") {
  const source = (typeof Deno !== "undefined" && Deno.env.get("API_BASE_URL"))
    ? "env"
    : "fallback";
  console.log(
    `%c[ProjectFlow]%c v${appVersion} %cAPI_BASE_URL=%s (%s)`,
    "color:#6366f1;font-weight:bold",
    "color:inherit",
    "color:#10b981;font-weight:bold",
    API_BASE_URL,
    source,
  );
}

export const DEMO_USERS = [
  { role: "Admin", email: "admin@example.com", password: "Password123!" },
  {
    role: "Project Manager",
    email: "pm@example.com",
    password: "Password123!",
  },
  {
    role: "Team Member",
    email: "member@example.com",
    password: "Password123!",
  },
  { role: "Viewer", email: "viewer@example.com", password: "Password123!" },
];

export const STATUS_COLUMNS = [
  { key: "TODO", label: "To Do", icon: "radio_button_unchecked" },
  { key: "IN_PROGRESS", label: "In Progress", icon: "pending" },
  { key: "COMPLETED", label: "Completed", icon: "check_circle" },
] as const;
