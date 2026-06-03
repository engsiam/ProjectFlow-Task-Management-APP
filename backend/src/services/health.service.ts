// Health service.

import { pingDB } from "../prisma/client.ts";
import { env } from "../config/env.ts";

export const getHealth = async () => {
  const dbOk = await pingDB();
  return {
    status: dbOk ? "ok" : "degraded",
    api: "running",
    database: dbOk ? "connected" : "disconnected",
    runtime: `Deno ${Deno.version.deno}`,
    timestamp: new Date().toISOString(),
    version: env.API_VERSION,
    environment: env.NODE_ENV,
  };
};
