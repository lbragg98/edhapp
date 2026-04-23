import { PrismaClient } from "@prisma/client";
import { hasRequiredPrismaEnv, missingPrismaEnvVars } from "@/server/config/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient | null {
  if (!hasRequiredPrismaEnv) {
    console.error("[DB] Prisma client initialization skipped. Missing required env vars.", {
      missing: missingPrismaEnvVars,
    });
    return null;
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient() ?? undefined;

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}
