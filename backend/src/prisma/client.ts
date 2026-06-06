import * as prismaModule from "../generated/prisma/index.js";
import { isProd } from "../config/env.ts";

const { PrismaClient } = prismaModule;

declare global {
  // deno-lint-ignore no-var
  var __prisma: InstanceType<typeof PrismaClient> | undefined;
}

export const prisma = globalThis.__prisma ??
  new PrismaClient({
    log: isProd ? ["error"] : ["warn", "error"],
  });

if (!isProd) {
  globalThis.__prisma = prisma;
}

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
