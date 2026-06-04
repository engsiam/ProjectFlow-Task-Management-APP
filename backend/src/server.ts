// Server entry point. Bootstraps the app and starts the HTTP listener.

import { env } from "./config/env.ts";
import { createApp } from "./app.ts";
import { connectDB, disconnectDB, pingDB } from "./prisma/client.ts";

const isAddrInUse = (error: unknown) =>
  error instanceof Deno.errors.AddrInUse ||
  (error instanceof Error && "code" in error && error.code === "EADDRINUSE");

const isProjectFlowRunning = async (port: number) => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    if (!response.ok) return false;
    const payload = await response.json().catch(() => null);
    return payload?.success === true && payload?.data?.api === "running";
  } catch {
    return false;
  }
};

const findListeningPid = async (port: number) => {
  if (Deno.build.os !== "windows") return null;

  try {
    const output = await new Deno.Command("netstat", {
      args: ["-ano", "-p", "tcp"],
      stdout: "piped",
      stderr: "null",
    }).output();

    if (output.code !== 0) return null;

    const text = new TextDecoder().decode(output.stdout);
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.includes("LISTENING") || !trimmed.includes(`:${port}`)) {
        continue;
      }

      const parts = trimmed.split(/\s+/);
      const localAddress = parts[1] ?? "";
      const state = parts[3] ?? "";
      const pid = Number.parseInt(parts[4] ?? "", 10);

      if (
        localAddress.endsWith(`:${port}`) &&
        state === "LISTENING" &&
        !Number.isNaN(pid)
      ) {
        return pid;
      }
    }
  } catch {
    // Ignore lookup failures and fall back to a generic message.
  }

  return null;
};

const inspectPort = async (port: number) => {
  try {
    const listener = Deno.listen({
      hostname: "0.0.0.0",
      port,
      transport: "tcp",
    });
    listener.close();
    return { available: true as const, projectFlowRunning: false, pid: null };
  } catch (error) {
    if (!isAddrInUse(error)) throw error;
  }

  const [projectFlowRunning, pid] = await Promise.all([
    isProjectFlowRunning(port),
    findListeningPid(port),
  ]);

  return { available: false as const, projectFlowRunning, pid };
};

const start = async () => {
  console.log("==============================================");
  console.log("  ProjectFlow Backend");
  console.log("==============================================");

  console.log(`Environment: ${env.NODE_ENV}`);
  const port = Number.parseInt(env.PORT, 10) || 8000;
  const portStatus = await inspectPort(port);

  if (!portStatus.available) {
    const pidText = portStatus.pid ? ` by PID ${portStatus.pid}` : "";

    if (portStatus.projectFlowRunning) {
      console.log(`Port ${port}${pidText} is already serving ProjectFlow.`);
      console.log(`Reuse the running backend at http://localhost:${port}/health`);
      console.log("Stop the existing watcher before starting another one.");
      return;
    }

    console.error(`Port ${port}${pidText} is already in use.`);
    console.error("Stop the process using that port or choose another one.");
    console.error(`PowerShell example: $env:PORT=${port + 1}; deno task dev`);
    Deno.exit(1);
  }

  console.log("Connecting to MongoDB...");
  const ok = await connectDB();
  if (!ok) {
    console.error(
      "\x1b[31m%s\x1b[0m",
      "Failed to connect to MongoDB. Continuing anyway; /health will report degraded.",
    );
  } else {
    const ping = await pingDB();
    console.log(
      `MongoDB: ${ping ? "connected & reachable" : "connected but ping failed"}`,
    );
  }

  const app = createApp();
  try {
    Deno.serve({ port, hostname: "0.0.0.0" }, app.fetch);
  } catch (error) {
    if (isAddrInUse(error)) {
      console.error(`Port ${port} became busy while starting the server.`);
      console.error("Please rerun the command once the existing listener stops.");
      await disconnectDB();
      Deno.exit(1);
    }
    throw error;
  }

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
