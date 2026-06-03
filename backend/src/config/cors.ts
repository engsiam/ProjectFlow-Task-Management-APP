import { cors } from "npm:hono@4.6.10/cors";
import { env, isProd } from "./env.ts";

export const buildCors = () => {
  const allowed = env.FRONTEND_URL.split(",").map((s) => s.trim()).filter(Boolean);
  return cors({
    origin: (origin: string) => {
      if (!origin) return "*";
      if (allowed.includes("*") || allowed.includes(origin)) return origin;
      // Reflect the origin in dev for easier local testing
      return isProd ? "" : origin;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposeHeaders: ["Content-Length", "X-Request-Id"],
    maxAge: 600,
  });
};

// Helper to apply CORS to any Hono-like router (including OpenAPIHono).
// deno-lint-ignore no-explicit-any
export const applyCors = (app: any) => app.use("*", buildCors());
