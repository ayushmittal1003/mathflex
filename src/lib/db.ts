import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // On serverless every instance has its own pool, so keep it small or the
  // database's connection limit runs out under load. Tune with DB_POOL_MAX.
  // Local `prisma dev` Postgres only takes ~10 connections in total, so dev stays well under it.
  const max = Number(process.env.DB_POOL_MAX) || (process.env.NODE_ENV === "production" ? 3 : 5);
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, max, idleTimeoutMillis: 10_000 });
  return new PrismaClient({ adapter });
}

// Reuse one client across hot reloads in dev.
export const db = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
