// Singleton Prisma client. Reused across hot reloads in Deno --watch.
//
// @prisma/client is a CommonJS module. The `PrismaClient` class lives on the
// default export (and as a real ES export from the typed subpath). At
// runtime we use the default import; at the type level we re-export the
// class type from the same package's full generated types.
//
// Deno's `export *` chain follows:
//   npm:@prisma/client@5.22.0 -> default.d.ts -> .prisma/client/default
//                            -> .prisma/client/index.d.ts (744KB, full types)
//
// The runtime default import gives us the actual `PrismaClient` constructor
// off of the CJS module.exports bag.

import prismaPkg from "npm:@prisma/client@5.22.0";
import type { PrismaClient as PrismaClientType } from "npm:@prisma/client@5.22.0";
import { isProd } from "../config/env.ts";

declare global {
  // deno-lint-ignore no-var
  var __prisma: PrismaClientType | undefined;
}

const PrismaClientCtor =
  (prismaPkg as unknown as { PrismaClient: new (options?: object) => PrismaClientType })
    .PrismaClient;

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
