import { defineConfig } from "$fresh/server.ts";

const isDev = Deno.env.get("DENO_ENV") !== "production" &&
  Deno.env.get("FRESH_ENV") !== "production";

if (typeof globalThis !== "undefined") {
  // Surface the resolved API base URL on the server console at boot.
  // `lib/constants.ts` reads `API_BASE_URL` from `.env` (Deno auto-loads it
  // from the cwd) and falls back to the hardcoded production URL.
  // deno-lint-ignore no-explicit-any
  (globalThis as any).__DEV__ = isDev;
  // deno-lint-ignore no-explicit-any
  (globalThis as any).__APP_VERSION__ = Deno.env.get("APP_VERSION") ?? "1.0.0";
}

export default defineConfig({
  server: {
    port: 8001,
  },
});
