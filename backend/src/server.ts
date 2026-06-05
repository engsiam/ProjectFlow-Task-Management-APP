// Server entry point. Bootstraps the app and starts the HTTP listener.
//
// Production-ready for both local development and Deno Deploy:
//   - No `Deno.Command` (netstat) usage.
//   - No `Deno.addSignalListener` (Deploy doesn't support signal handlers).
//   - No explicit `Deno.exit` (Deploy lifecycle is managed by the runtime).
//   - No port-conflict probing (Deploy allocates its own port).
//   - The `Deno.serve` port is omitted on Deploy, where `Deno.env.get("PORT")`
//     is also ignored — Deploy routes traffic to the listener automatically.
//
// The `isDeploy` flag gates any platform-specific behavior that only makes
// sense when running on a long-lived host (e.g. port logging, local FS).

import { env, isDeploy, isProd } from "./config/env.ts";
import { createApp } from "./app.ts";
import { connectDB, pingDB } from "./prisma/client.ts";

const log = (msg: string) => console.log(`[server] ${msg}`);

const boot = async () => {
  log(`ProjectFlow API booting…`);
  log(`runtime=Deno ${Deno.version.deno}`);
  log(`env=${env.NODE_ENV} deploy=${isDeploy} prod=${isProd}`);

  // Connect to MongoDB. On Deploy the connection is reused across requests;
  // failure is non-fatal so /health can still report "degraded".
  if (!isDeploy) {
    log("connecting to MongoDB…");
    const ok = await connectDB();
    if (!ok) {
      console.error(
        "[server] MongoDB connect failed; continuing — /health will report degraded.",
      );
    } else {
      const ping = await pingDB();
      log(`MongoDB ${ping ? "reachable" : "connected but ping failed"}`);
    }
  } else {
    // On Deploy, connect lazily — the runtime may have multiple replicas
    // and we don't want a long boot. pingDB() during /readyz handles the
    // readiness check.
    log("Deploy runtime: skipping eager DB connect; /readyz will validate.");
  }

  const app = createApp();

  if (isDeploy) {
    // Deploy: no port/host needed — the runtime binds for us.
    Deno.serve(app.fetch);
    log("listening (Deno Deploy)");
    return;
  }

  // Local: bind explicitly. Deno.serve throws AddrInUse on collision which
  // the user can resolve by changing PORT.
  const port = Number.parseInt(env.PORT, 10) || 8000;
  try {
    Deno.serve({ port, hostname: "0.0.0.0" }, app.fetch);
  } catch (err) {
    console.error(`[server] Port ${port} unavailable. Set PORT=<n> and retry.`);
    throw err;
  }
  log(`local:    http://localhost:${port}`);
  log(`swagger:  http://localhost:${port}/docs`);
  log(`openapi:  http://localhost:${port}/openapi.json`);
  log(`health:   http://localhost:${port}/health`);
  log(`readyz:   http://localhost:${port}/readyz`);
};

// Deno Deploy never receives SIGINT/SIGTERM, and the runtime owns the
// process lifecycle. We deliberately do NOT install signal listeners or
// call Deno.exit — both throw on Deploy. In local dev, the user can
// Ctrl-C and Deno will flush handles and exit cleanly.
boot().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  // Re-throw rather than Deno.exit so Deno Deploy surfaces the error
  // through its logs; locally, an uncaught rejection still terminates
  // the process.
  throw err;
});
