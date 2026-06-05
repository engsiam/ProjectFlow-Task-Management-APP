// Singleton Prisma client. Reused across hot reloads in Deno --watch.
//
// The generated Prisma client is emitted as CommonJS. Loading it through
// createRequire keeps runtime resolution on our project-local generated path
// instead of Deno's internal npm package cache.
//
// Deno Deploy support: `node:module.createRequire` is available in the Deploy
// runtime. The generated client must be committed to the repo (run
// `deno task prisma:generate` locally) so the import resolves at boot.

import { createRequire } from "node:module";
import type { PrismaClient as PrismaClientType } from "npm:@prisma/client@5.22.0";
import { isProd } from "../config/env.ts";

declare global {
  // deno-lint-ignore no-var
  var __prisma: PrismaClientType | undefined;
}

const require = createRequire(import.meta.url);
let PrismaClientCtor: new (options?: object) => PrismaClientType;
try {
  // deno-lint-ignore no-explicit-any
  ({ PrismaClient: PrismaClientCtor } = require("../generated/prisma/index.js") as any);
} catch (err) {
  console.error(
    "[Prisma] Failed to load generated client at src/generated/prisma/index.js.",
  );
  console.error(
    "[Prisma] Run `deno task prisma:generate` and commit the generated files.",
  );
  throw err;
}

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
