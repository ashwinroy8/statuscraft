import { PrismaClient } from "../generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Required for Neon serverless in Node.js environments
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // NEON_DATABASE_URL is the Neon serverless DB used at runtime.
  // DATABASE_URL is intentionally avoided here because Railway injects its own
  // Postgres DATABASE_URL which would override any manually set value.
  const connectionString = process.env.NEON_DATABASE_URL!;
  const adapter = new PrismaNeon({ connectionString } as any);
  return new PrismaClient({ adapter } as any);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
