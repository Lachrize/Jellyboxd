import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Prisma singleton — avoids exhausting connections during Next.js hot-reload.
 * In dev, recreates the client when schema changes leave a stale global instance
 * (new model delegates like `friendship` are missing until restart/regenerate).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function delegateName(model: string) {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function clientHasAllDelegates(client: PrismaClient) {
  return Prisma.dmmf.datamodel.models.every((model) => {
    const delegate = (client as unknown as Record<string, unknown>)[delegateName(model.name)];
    return delegate != null && typeof delegate === "object";
  });
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && (process.env.NODE_ENV === "production" || clientHasAllDelegates(cached))) {
    return cached;
  }
  if (cached) void cached.$disconnect();
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

export const db = getPrismaClient();
