// Singleton Prisma client. Reused across hot reloads in Deno --watch.
//
// The generated Prisma client is emitted as CommonJS. Loading it through
// createRequire keeps runtime resolution on our project-local generated path
// instead of Deno's internal npm package cache.

import { createRequire } from "node:module";
import type { PrismaClient as PrismaClientType } from "npm:@prisma/client@5.22.0";
import { isProd } from "../config/env.ts";

declare global {
  // deno-lint-ignore no-var
  var __prisma: PrismaClientType | undefined;
}

const require = createRequire(import.meta.url);
const { PrismaClient: PrismaClientCtor } = require("../generated/prisma/index.js") as {
  PrismaClient: new (options?: object) => PrismaClientType;
};

const prisma: PrismaClientType = globalThis.__prisma ??
  new PrismaClientCtor({ log: isProd ? ["error"] : ["warn", "error"] });

if (!isProd) {
  globalThis.__prisma = prisma;
}

export { prisma };
export type { PrismaClientType };

export const connectDB = async (): Promise<boolean> => {
  try {
    await prisma.$connect();
    return true;
  } catch (err) {
    console.error("[Prisma] Connection error:", err);
    return false;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
  } catch (err) {
    console.error("[Prisma] Disconnect error:", err);
  }
};

export const pingDB = async (): Promise<boolean> => {
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    return true;
  } catch {
    return false;
  }
};
