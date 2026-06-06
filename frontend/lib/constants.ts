// Backend API base URL. Override per environment via the API_BASE_URL
// environment variable in `.env` (see `.env.example`).
//
// Server-side: Deno 2.x auto-loads `.env` from the cwd, so this reads the
// real value at request time.
// Client-side: Fresh's browser polyfill makes Deno.env.get() return
// undefined, so the fallback is used. Change the fallback here if you need
// the client bundle to point at a different backend than the server.

const RAW_API_BASE_URL =
  (typeof Deno !== "undefined" && Deno.env.get("API_BASE_URL")) ||
  "http://localhost:8000/api";

const NORMALIZED_API_BASE_URL = RAW_API_BASE_URL.trim().replace(/\/+$/, "");

export const API_BASE_URL = NORMALIZED_API_BASE_URL;

// Backend origin (no /api suffix) — used for raw-origin URLs like file
// uploads that live outside /api.
export const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

// Health and Swagger are mounted at the backend root.
export const HEALTH_URL = `${BACKEND_ORIGIN}/health`;
export const SWAGGER_URL = `${BACKEND_ORIGIN}/docs`;

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
