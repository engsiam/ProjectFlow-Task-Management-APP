import { cors } from "npm:hono@4.6.10/cors";
import { env, isDeploy } from "./env.ts";

// Origins that are always allowed regardless of the deployment target.
// These are developer-only origins (loopback addresses + common dev ports)
// used when a developer runs the Fresh frontend locally and points it at
// a remote backend. They are safe to allow in production because:
//   1. They are loopback addresses — a remote attacker cannot forge a
//      request with `Origin: http://localhost:8001` from a non-loopback
//      context; the browser sets `Origin` and the server sees it as-is.
//   2. CORS is a browser-enforced policy, not a server-side auth check.
//      Every request still needs a valid `Authorization: Bearer <jwt>`
//      header, so allowing these origins does not expose data.
//   3. The production frontend is served from a different host, so
//      legitimate users never hit this code path with a loopback origin.
const DEV_LOOPBACK_ORIGINS = [
  "http://localhost:8001",
  "http://127.0.0.1:8001",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

// Build the list of allowed origins at module load.
//   1. Always include the loopback dev origins above.
//   2. Add `env.FRONTEND_URL` (comma-separated for multi-env / preview URLs).
//   3. De-duplicate while preserving order so the first entry is stable
//      and can be used as the fallback for non-browser / unknown origins.
const buildAllowedOrigins = (): string[] => {
  const fromEnv = env.FRONTEND_URL
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const combined = [...DEV_LOOPBACK_ORIGINS, ...fromEnv];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of combined) {
    if (!seen.has(o)) {
      seen.add(o);
      out.push(o);
    }
  }
  return out;
};

export const buildCors = () => {
  const allowedOrigins = buildAllowedOrigins();
  return cors({
    origin: (origin: string) => {
      if (!origin) {
        // No `Origin` header means a same-origin or non-browser request
        // (curl, server-to-server, health checks). Return the first
        // allowed origin so the header is always a valid, specific value
        // — `*` is forbidden when `credentials: true`.
        return allowedOrigins[0];
      }
      if (allowedOrigins.includes(origin)) {
        // Echo the matched origin so the browser sees a specific
        // `Access-Control-Allow-Origin` value (required for credentials).
        return origin;
      }
      // Unknown origin: fall back to the first allowed origin so the
      // browser always receives a valid header and the failure mode is a
      // JS-visible CORS rejection (not a network/header absence error).
      // On Deploy we log a warning so operators notice misconfigured
      // frontends without silently breaking the response.
      if (isDeploy) {
        console.warn(
          `[cors] Rejecting unknown origin "${origin}". ` +
            `Allowed: ${allowedOrigins.join(", ")}. ` +
            `Add it to FRONTEND_URL (comma-separated) to allow.`,
        );
      }
      return allowedOrigins[0];
    },
    allowMethods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
    ],
    credentials: true,
    exposeHeaders: ["Content-Length", "X-Request-Id"],
    maxAge: 86400,
  });
};

// Helper to apply CORS to any Hono-like router (including OpenAPIHono).
// deno-lint-ignore no-explicit-any
export const applyCors = (app: any) => app.use("*", buildCors());
