// Server entry point. Bootstraps the app and starts the HTTP listener.

import { env } from "./config/env.ts";
import { createApp } from "./app.ts";
import { connectDB, disconnectDB, pingDB } from "./prisma/client.ts";

const start = async () => {
  console.log("\x1b[36m%s\x1b[0m", "┌──────────────────────────────────────────────┐");
  console.log("\x1b[36m%s\x1b[0m", "│   ProjectFlow Backend                        │");
  console.log("\x1b[36m%s\x1b[0m", "└──────────────────────────────────────────────┘");

  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Connecting to MongoDB...`);
  const ok = await connectDB();
  if (!ok) {
    console.error(
      "\x1b[31m%s\x1b[0m",
      "Failed to connect to MongoDB. Continuing anyway; /health will report degraded.",
    );
  } else {
    const ping = await pingDB();
    console.log(`MongoDB: ${ping ? "connected & reachable" : "connected but ping failed"}`);
  }

  const app = createApp();
  const port = Number.parseInt(env.PORT, 10) || 8000;

  Deno.serve({ port, hostname: "0.0.0.0" }, app.fetch);

  console.log("");
  console.log(`API server running on \x1b[32mhttp://localhost:${port}\x1b[0m`);
  console.log(`Swagger UI:  \x1b[32mhttp://localhost:${port}/docs\x1b[0m`);
  console.log(`OpenAPI:     \x1b[32mhttp://localhost:${port}/openapi.json\x1b[0m`);
  console.log(`Health:      \x1b[32mhttp://localhost:${port}/health\x1b[0m`);
  console.log("");

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down...`);
    await disconnectDB();
    Deno.exit(0);
  };
  Deno.addSignalListener("SIGINT", () => void shutdown("SIGINT"));
  Deno.addSignalListener("SIGTERM", () => void shutdown("SIGTERM"));
};

start().catch((err) => {
  console.error("Fatal startup error:", err);
  Deno.exit(1);
});
