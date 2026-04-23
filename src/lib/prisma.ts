import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const useIndividual = !!process.env.DB_HOST;
  console.log("Prisma init — useIndividual:", useIndividual, "DB_HOST:", process.env.DB_HOST, "DB_USER:", process.env.DB_USER, "DB_PASSWORD length:", process.env.DB_PASSWORD?.length, "DB_PASSWORD first char:", process.env.DB_PASSWORD?.[0]);
  const pool = new pg.Pool(
    useIndividual
      ? {
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT ?? "5432"),
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME ?? "postgres",
          ssl: { rejectUnauthorized: false },
        }
      : {
          connectionString: process.env.DIRECT_URL!,
          ssl: { rejectUnauthorized: false },
        }
  );
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter } as any);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
 
