import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Reutiliza o mesmo cliente no mesmo processo (importante no Vercel + Neon). */
export const prisma = globalForPrisma.prisma ?? createClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
