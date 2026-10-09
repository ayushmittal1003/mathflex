import "server-only";
import { headers } from "next/headers";
import { db } from "./db";

// Fixed-window limiter stored in Postgres (Vercel functions share no memory). One upsert per call.
// Returns true when the caller is still within `limit` hits per `windowSec`.
export async function allow(key: string, limit: number, windowSec: number): Promise<boolean> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowSec * 1000);
  try {
    const rows = await db.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "windowStart") VALUES (${key}, 1, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN 1 ELSE "RateLimit"."count" + 1 END,
        "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN ${now} ELSE "RateLimit"."windowStart" END
      RETURNING "count"`;
    return (rows[0]?.count ?? 1) <= limit;
  } catch (e) {
    // Never lock everyone out because the limiter itself failed.
    console.error("[rate-limit] failed open:", (e as Error).message);
    return true;
  }
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

// Housekeeping so the table doesn't grow forever.
export async function pruneRateLimits() {
  await db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 86_400_000) } } }).catch(() => {});
}
