import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

// Reports for Admin → Analytics, straight from AnalyticsEvent (filled by /api/track). Days are IST.
const n = (v: unknown) => Number(v ?? 0);
const IST = Prisma.sql`interval '330 minutes'`;

export const FUNNEL = [
  { key: "visit", label: "Visited the site" },
  { key: "chapter", label: "Opened a chapter page" },
  { key: "add_to_cart", label: "Added to cart" },
  { key: "begin_checkout", label: "Started checkout" },
  { key: "purchase", label: "Paid" },
] as const;

export async function siteReport(days: number) {
  const since = new Date(Date.now() - days * 86_400_000);
  const live = new Date(Date.now() - 5 * 60_000);
  const W = Prisma.sql`"at" >= ${since}`;

  const [totals, sessions, daily, pages, times, sources, devices, countries, events, funnel, liveNow] = await Promise.all([
    db.$queryRaw<{ pv: bigint; visitors: bigint; sessions: bigint }[]>`
      SELECT COUNT(*) AS pv, COUNT(DISTINCT "visitorId") AS visitors, COUNT(DISTINCT "sessionId") AS sessions
      FROM "AnalyticsEvent" WHERE ${W} AND "name" = 'page_view'`,
    db.$queryRaw<{ sessions: bigint; bounces: bigint; avg_ms: number | null; avg_pages: number | null }[]>`
      WITH s AS (
        SELECT "sessionId", COUNT(*) FILTER (WHERE "name" = 'page_view') AS pv, COALESCE(SUM("ms") FILTER (WHERE "name" = 'page_leave'), 0) AS ms
        FROM "AnalyticsEvent" WHERE ${W} GROUP BY "sessionId")
      SELECT COUNT(*) AS sessions, COUNT(*) FILTER (WHERE pv = 1) AS bounces, AVG(ms)::float AS avg_ms, AVG(pv)::float AS avg_pages FROM s WHERE pv > 0`,
    db.$queryRaw<{ d: string; visitors: bigint; pv: bigint }[]>`
      SELECT to_char(date_trunc('day', "at" + ${IST}), 'YYYY-MM-DD') AS d, COUNT(DISTINCT "visitorId") AS visitors, COUNT(*) AS pv
      FROM "AnalyticsEvent" WHERE ${W} AND "name" = 'page_view' GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ path: string; pv: bigint; visitors: bigint }[]>`
      SELECT "path", COUNT(*) AS pv, COUNT(DISTINCT "visitorId") AS visitors
      FROM "AnalyticsEvent" WHERE ${W} AND "name" = 'page_view' GROUP BY 1 ORDER BY 2 DESC LIMIT 20`,
    db.$queryRaw<{ path: string; total_ms: number }[]>`
      SELECT "path", SUM("ms")::float AS total_ms FROM "AnalyticsEvent" WHERE ${W} AND "name" = 'page_leave' GROUP BY 1`,
    db.$queryRaw<{ source: string; sessions: bigint }[]>`
      SELECT COALESCE("source", 'Direct / none') AS source, COUNT(DISTINCT "sessionId") AS sessions
      FROM "AnalyticsEvent" WHERE ${W} AND "name" = 'page_view' GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
    db.$queryRaw<{ device: string; visitors: bigint }[]>`
      SELECT COALESCE("device", 'unknown') AS device, COUNT(DISTINCT "visitorId") AS visitors
      FROM "AnalyticsEvent" WHERE ${W} AND "name" = 'page_view' GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<{ country: string; visitors: bigint }[]>`
      SELECT COALESCE("country", '??') AS country, COUNT(DISTINCT "visitorId") AS visitors
      FROM "AnalyticsEvent" WHERE ${W} AND "name" = 'page_view' GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
    db.$queryRaw<{ name: string; label: string | null; count: bigint; visitors: bigint }[]>`
      SELECT "name", "label", COUNT(*) AS count, COUNT(DISTINCT "visitorId") AS visitors
      FROM "AnalyticsEvent" WHERE ${W} AND "name" NOT IN ('page_view', 'page_leave') GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 40`,
    db.$queryRaw<{ visit: bigint; chapter: bigint; add_to_cart: bigint; begin_checkout: bigint; purchase: bigint }[]>`
      SELECT COUNT(DISTINCT "visitorId") FILTER (WHERE "name" = 'page_view') AS visit,
             COUNT(DISTINCT "visitorId") FILTER (WHERE "name" = 'page_view' AND "path" LIKE '/chapter/%') AS chapter,
             COUNT(DISTINCT "visitorId") FILTER (WHERE "name" = 'add_to_cart') AS add_to_cart,
             COUNT(DISTINCT "visitorId") FILTER (WHERE "name" = 'begin_checkout') AS begin_checkout,
             COUNT(DISTINCT "visitorId") FILTER (WHERE "name" = 'purchase') AS purchase
      FROM "AnalyticsEvent" WHERE ${W}`,
    db.$queryRaw<{ visitors: bigint }[]>`SELECT COUNT(DISTINCT "visitorId") AS visitors FROM "AnalyticsEvent" WHERE "at" >= ${live}`,
  ]);

  const t = totals[0];
  const s = sessions[0];
  // Time on a page arrives in pieces (see lib/track.ts), so the average is total time ÷ views.
  const timeByPath = new Map(times.map((r) => [r.path, r.total_ms]));
  const f = funnel[0];
  return {
    visitors: n(t?.visitors),
    sessions: n(s?.sessions),
    pageviews: n(t?.pv),
    bounceRate: n(s?.sessions) ? Math.round((n(s?.bounces) / n(s?.sessions)) * 100) : null,
    avgSessionMs: s?.avg_ms ?? 0,
    pagesPerSession: s?.avg_pages ?? 0,
    liveNow: n(liveNow[0]?.visitors),
    daily: daily.map((d) => ({ day: d.d, visitors: n(d.visitors), pageviews: n(d.pv) })),
    pages: pages.map((p) => ({ path: p.path, pageviews: n(p.pv), visitors: n(p.visitors), avgMs: timeByPath.has(p.path) ? timeByPath.get(p.path)! / n(p.pv) : null })),
    sources: sources.map((r) => ({ source: r.source, sessions: n(r.sessions) })),
    devices: devices.map((r) => ({ device: r.device, visitors: n(r.visitors) })),
    countries: countries.map((r) => ({ country: r.country, visitors: n(r.visitors) })),
    events: events.map((e) => ({ name: e.name, label: e.label, count: n(e.count), visitors: n(e.visitors) })),
    funnel: FUNNEL.map((x) => ({ ...x, visitors: n(f?.[x.key]) })),
  };
}

export async function recentSessions(opts: { days?: number; userId?: string; limit?: number }) {
  const since = new Date(Date.now() - (opts.days ?? 30) * 86_400_000);
  const rows = await db.$queryRaw<{ sessionId: string; start: Date; last: Date; pages: bigint; events: bigint; userId: string | null; source: string | null; device: string | null; country: string | null; entry: string | null }[]>`
    SELECT "sessionId", MIN("at") AS start, MAX("at") AS last,
           COUNT(*) FILTER (WHERE "name" = 'page_view') AS pages,
           COUNT(*) FILTER (WHERE "name" NOT IN ('page_view', 'page_leave')) AS events,
           MAX("userId") AS "userId", MAX("source") AS source, MAX("device") AS device, MAX("country") AS country,
           (ARRAY_AGG("path" ORDER BY "at") FILTER (WHERE "name" = 'page_view'))[1] AS entry
    FROM "AnalyticsEvent"
    WHERE "at" >= ${since} ${opts.userId ? Prisma.sql`AND "sessionId" IN (SELECT DISTINCT "sessionId" FROM "AnalyticsEvent" WHERE "userId" = ${opts.userId})` : Prisma.empty}
    GROUP BY "sessionId" ORDER BY MIN("at") DESC LIMIT ${opts.limit ?? 40}`;
  const users = await db.user.findMany({ where: { id: { in: rows.map((r) => r.userId).filter((x): x is string => !!x) } }, select: { id: true, name: true } });
  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  return rows.map((r) => ({ ...r, pages: n(r.pages), events: n(r.events), userName: r.userId ? (nameOf.get(r.userId) ?? "Deleted account") : null, durationMs: r.last.getTime() - r.start.getTime() }));
}

export const fmtDuration = (ms: number | null) => {
  if (ms === null || !Number.isFinite(ms)) return "–";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
};
