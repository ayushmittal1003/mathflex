import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

// Reports for Admin → Analytics, straight from AnalyticsEvent (filled by /api/track). Days are IST.
const n = (v: unknown) => Number(v ?? 0);
const IST = Prisma.sql`interval '330 minutes'`;
const DAY = 86_400_000;

export const FUNNEL = [
  { key: "visit", label: "Visited the site" },
  { key: "chapter", label: "Opened a chapter page" },
  { key: "add_to_cart", label: "Added to cart" },
  { key: "begin_checkout", label: "Started checkout" },
  { key: "purchase", label: "Paid" },
] as const;

export const LEAD_FUNNEL = [
  { key: "visit", label: "Opened the enquiry page" },
  { key: "enquiry_start", label: "Answered the first question" },
  { key: "lead_submit", label: "Sent the form" },
] as const;

// ---- Filters ---------------------------------------------------------------------------------
// Everything on the Analytics page is narrowed by these, read from the URL so a view can be shared.
export type Filters = {
  since: Date;
  until: Date;
  days: number; // length of the window, for the previous-period comparison
  preset: string; // "1" | "7" | "30" | "90" | "custom"
  device?: string;
  source?: string;
  country?: string;
  who?: "user" | "visitor";
  path?: string;
};

const PRESETS = ["1", "7", "30", "90"];
const clean = (v: string | undefined, max = 120) => (v ?? "").trim().slice(0, max) || undefined;

export function parseFilters(p: Record<string, string | undefined>, now = Date.now()): Filters {
  const from = p.from && /^\d{4}-\d{2}-\d{2}$/.test(p.from) ? new Date(`${p.from}T00:00:00+05:30`) : null;
  const to = p.to && /^\d{4}-\d{2}-\d{2}$/.test(p.to) ? new Date(`${p.to}T23:59:59.999+05:30`) : null;
  let since: Date, until: Date, preset: string;
  if (from && to && from < to && to.getTime() - from.getTime() <= 400 * DAY) {
    since = from; until = new Date(Math.min(to.getTime(), now)); preset = "custom";
  } else {
    preset = PRESETS.includes(p.days ?? "") ? p.days! : "7";
    until = new Date(now); since = new Date(now - Number(preset) * DAY);
  }
  return {
    since, until, preset,
    days: Math.max(1, Math.round((until.getTime() - since.getTime()) / DAY)),
    device: ["mobile", "tablet", "desktop"].includes(p.device ?? "") ? p.device : undefined,
    source: clean(p.source, 100),
    country: p.country && /^[A-Z?]{2}$/.test(p.country) ? p.country : undefined,
    who: p.who === "user" || p.who === "visitor" ? p.who : undefined,
    path: clean(p.path, 200),
  };
}

// The SQL condition for a window plus the filters. Device and country are on every event; source,
// logged-in and page are properties of the visit, so they pick whole sessions.
function scope(f: Filters, since = f.since, until = f.until) {
  const parts: Prisma.Sql[] = [Prisma.sql`"at" >= ${since} AND "at" <= ${until}`];
  if (f.device) parts.push(Prisma.sql`"device" = ${f.device}`);
  if (f.country) parts.push(Prisma.sql`COALESCE("country", '??') = ${f.country}`);
  const s: Prisma.Sql[] = [];
  if (f.source) s.push(Prisma.sql`COALESCE("source", 'Direct / none') = ${f.source}`);
  if (f.who === "user") s.push(Prisma.sql`"userId" IS NOT NULL`);
  if (f.path) s.push(Prisma.sql`"name" = 'page_view' AND "path" ILIKE ${`%${f.path}%`}`);
  for (const c of s) parts.push(Prisma.sql`"sessionId" IN (SELECT DISTINCT "sessionId" FROM "AnalyticsEvent" WHERE "at" >= ${since} AND "at" <= ${until} AND ${c})`);
  if (f.who === "visitor") parts.push(Prisma.sql`"sessionId" NOT IN (SELECT DISTINCT "sessionId" FROM "AnalyticsEvent" WHERE "at" >= ${since} AND "at" <= ${until} AND "userId" IS NOT NULL)`);
  return Prisma.join(parts, " AND ");
}

async function totals(W: Prisma.Sql) {
  const [t, s] = await Promise.all([
    db.$queryRaw<{ pv: bigint; visitors: bigint }[]>`
      SELECT COUNT(*) AS pv, COUNT(DISTINCT "visitorId") AS visitors FROM "AnalyticsEvent" WHERE ${W} AND "name" = 'page_view'`,
    db.$queryRaw<{ sessions: bigint; bounces: bigint; avg_ms: number | null; avg_pages: number | null }[]>`
      WITH s AS (
        SELECT "sessionId", COUNT(*) FILTER (WHERE "name" = 'page_view') AS pv, COALESCE(SUM("ms") FILTER (WHERE "name" = 'page_leave'), 0) AS ms
        FROM "AnalyticsEvent" WHERE ${W} GROUP BY "sessionId")
      SELECT COUNT(*) AS sessions, COUNT(*) FILTER (WHERE pv = 1) AS bounces, AVG(ms)::float AS avg_ms, AVG(pv)::float AS avg_pages FROM s WHERE pv > 0`,
  ]);
  const sessions = n(s[0]?.sessions);
  return {
    visitors: n(t[0]?.visitors),
    pageviews: n(t[0]?.pv),
    sessions,
    bounceRate: sessions ? Math.round((n(s[0]?.bounces) / sessions) * 100) : null,
    avgSessionMs: s[0]?.avg_ms ?? 0,
    pagesPerSession: s[0]?.avg_pages ?? 0,
  };
}

// Headline numbers for the window and the same-length window before it.
export async function overview(f: Filters) {
  const prevUntil = f.since;
  const prevSince = new Date(f.since.getTime() - (f.until.getTime() - f.since.getTime()));
  const W = scope(f);
  const PW = scope(f, prevSince, prevUntil);
  const dayRows = (where: Prisma.Sql) => db.$queryRaw<{ d: string; visitors: bigint; pv: bigint; sessions: bigint }[]>`
    SELECT to_char(date_trunc('day', "at" + ${IST}), 'YYYY-MM-DD') AS d, COUNT(DISTINCT "visitorId") AS visitors, COUNT(*) AS pv, COUNT(DISTINCT "sessionId") AS sessions
    FROM "AnalyticsEvent" WHERE ${where} AND "name" = 'page_view' GROUP BY 1 ORDER BY 1`;
  const [now, prev, daily, prevDaily, live, conversions, devices, who] = await Promise.all([
    totals(W),
    totals(PW),
    dayRows(W),
    dayRows(PW),
    db.$queryRaw<{ visitors: bigint }[]>`SELECT COUNT(DISTINCT "visitorId") AS visitors FROM "AnalyticsEvent" WHERE "at" >= ${new Date(Date.now() - 5 * 60_000)}`,
    db.$queryRaw<{ name: string; visitors: bigint }[]>`
      SELECT "name", COUNT(DISTINCT "visitorId") AS visitors FROM "AnalyticsEvent" WHERE ${W} AND "name" IN ('add_to_cart', 'begin_checkout', 'purchase', 'lead_submit', 'sign_up') GROUP BY 1`,
    db.$queryRaw<{ device: string; visitors: bigint }[]>`
      SELECT COALESCE("device", 'unknown') AS device, COUNT(DISTINCT "visitorId") AS visitors FROM "AnalyticsEvent" WHERE ${W} AND "name" = 'page_view' GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<{ users: bigint; all: bigint }[]>`
      SELECT COUNT(DISTINCT "sessionId") FILTER (WHERE "userId" IS NOT NULL) AS users, COUNT(DISTINCT "sessionId") AS all FROM "AnalyticsEvent" WHERE ${W}`,
  ]);
  // One slot per IST day of the window, with the matching day of the previous window beside it.
  const days: string[] = [];
  const istDay = (t: number) => new Date(t + 330 * 60_000).toISOString().slice(0, 10);
  for (let t = f.since.getTime(); istDay(t) <= istDay(f.until.getTime()) && days.length < 400; t += DAY) if (!days.includes(istDay(t))) days.push(istDay(t));
  const byDay = new Map(daily.map((d) => [d.d, d]));
  const prevByDay = new Map(prevDaily.map((d) => [d.d, d]));
  const offset = f.since.getTime() - prevSince.getTime();
  const series = days.map((d) => {
    const cur = byDay.get(d);
    const p = prevByDay.get(istDay(new Date(`${d}T12:00:00+05:30`).getTime() - offset));
    return { day: d, visitors: n(cur?.visitors), pageviews: n(cur?.pv), sessions: n(cur?.sessions), prevVisitors: n(p?.visitors), prevPageviews: n(p?.pv), prevSessions: n(p?.sessions) };
  });
  const users = n(who[0]?.users);
  return {
    now, prev,
    liveNow: n(live[0]?.visitors),
    daily: series,
    devices: devices.map((d) => ({ label: d.device, value: n(d.visitors) })),
    who: [{ label: "Not logged in", value: n(who[0]?.all) - users }, { label: "Logged in", value: users }],
    conversions: Object.fromEntries(conversions.map((c) => [c.name, n(c.visitors)])) as Record<string, number>,
  };
}

// Every named event with its count, then (for the chosen event) its labels and its trend.
export async function eventsReport(f: Filters, event?: string) {
  const W = scope(f);
  const [byName, labels, trend] = await Promise.all([
    db.$queryRaw<{ name: string; count: bigint; visitors: bigint }[]>`
      SELECT "name", COUNT(*) AS count, COUNT(DISTINCT "visitorId") AS visitors
      FROM "AnalyticsEvent" WHERE ${W} AND "name" NOT IN ('page_view', 'page_leave') GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<{ name: string; label: string | null; count: bigint; visitors: bigint }[]>`
      SELECT "name", "label", COUNT(*) AS count, COUNT(DISTINCT "visitorId") AS visitors
      FROM "AnalyticsEvent" WHERE ${W} AND "name" NOT IN ('page_view', 'page_leave') GROUP BY 1, 2 ORDER BY 1, 3 DESC`,
    event
      ? db.$queryRaw<{ d: string; count: bigint }[]>`
          SELECT to_char(date_trunc('day', "at" + ${IST}), 'YYYY-MM-DD') AS d, COUNT(*) AS count
          FROM "AnalyticsEvent" WHERE ${W} AND "name" = ${event} GROUP BY 1 ORDER BY 1`
      : Promise.resolve([]),
  ]);
  const grouped = new Map<string, { label: string | null; count: number; visitors: number }[]>();
  for (const l of labels) {
    const list = grouped.get(l.name) ?? [];
    if (list.length < 25) list.push({ label: l.label, count: n(l.count), visitors: n(l.visitors) });
    grouped.set(l.name, list);
  }
  return {
    events: byName.map((e) => ({ name: e.name, count: n(e.count), visitors: n(e.visitors), labels: grouped.get(e.name) ?? [] })),
    trend: trend.map((t) => ({ day: t.d, count: n(t.count) })),
  };
}

export async function funnelReport(f: Filters) {
  const W = scope(f);
  const [shop, lead] = await Promise.all([
    db.$queryRaw<{ visit: bigint; chapter: bigint; add_to_cart: bigint; begin_checkout: bigint; purchase: bigint }[]>`
      SELECT COUNT(DISTINCT "visitorId") FILTER (WHERE "name" = 'page_view') AS visit,
             COUNT(DISTINCT "visitorId") FILTER (WHERE "name" = 'page_view' AND "path" LIKE '/chapter/%') AS chapter,
             COUNT(DISTINCT "visitorId") FILTER (WHERE "name" = 'add_to_cart') AS add_to_cart,
             COUNT(DISTINCT "visitorId") FILTER (WHERE "name" = 'begin_checkout') AS begin_checkout,
             COUNT(DISTINCT "visitorId") FILTER (WHERE "name" = 'purchase') AS purchase
      FROM "AnalyticsEvent" WHERE ${W}`,
    db.$queryRaw<{ visit: bigint; enquiry_start: bigint; lead_submit: bigint }[]>`
      SELECT COUNT(DISTINCT "visitorId") FILTER (WHERE "name" = 'page_view' AND "path" = '/enquiry') AS visit,
             COUNT(DISTINCT "visitorId") FILTER (WHERE "name" = 'enquiry_start') AS enquiry_start,
             COUNT(DISTINCT "visitorId") FILTER (WHERE "name" = 'lead_submit') AS lead_submit
      FROM "AnalyticsEvent" WHERE ${W}`,
  ]);
  return {
    shop: FUNNEL.map((x) => ({ ...x, visitors: n(shop[0]?.[x.key]) })),
    lead: LEAD_FUNNEL.map((x) => ({ ...x, visitors: n(lead[0]?.[x.key]) })),
  };
}

export async function pagesReport(f: Filters) {
  const W = scope(f);
  const [pages, times, entries] = await Promise.all([
    db.$queryRaw<{ path: string; pv: bigint; visitors: bigint }[]>`
      SELECT "path", COUNT(*) AS pv, COUNT(DISTINCT "visitorId") AS visitors
      FROM "AnalyticsEvent" WHERE ${W} AND "name" = 'page_view' GROUP BY 1 ORDER BY 2 DESC LIMIT 60`,
    db.$queryRaw<{ path: string; total_ms: number }[]>`
      SELECT "path", SUM("ms")::float AS total_ms FROM "AnalyticsEvent" WHERE ${W} AND "name" = 'page_leave' GROUP BY 1`,
    db.$queryRaw<{ path: string; sessions: bigint; bounces: bigint }[]>`
      WITH s AS (
        SELECT "sessionId", (ARRAY_AGG("path" ORDER BY "at"))[1] AS entry, COUNT(*) AS pv
        FROM "AnalyticsEvent" WHERE ${W} AND "name" = 'page_view' GROUP BY 1)
      SELECT entry AS path, COUNT(*) AS sessions, COUNT(*) FILTER (WHERE pv = 1) AS bounces FROM s GROUP BY 1`,
  ]);
  const timeByPath = new Map(times.map((r) => [r.path, r.total_ms]));
  const entryByPath = new Map(entries.map((e) => [e.path, { sessions: n(e.sessions), bounces: n(e.bounces) }]));
  return pages.map((p) => {
    const e = entryByPath.get(p.path);
    return {
      path: p.path,
      pageviews: n(p.pv),
      visitors: n(p.visitors),
      avgMs: timeByPath.has(p.path) ? timeByPath.get(p.path)! / n(p.pv) : null,
      entries: e?.sessions ?? 0,
      bounceRate: e?.sessions ? Math.round((e.bounces / e.sessions) * 100) : null,
    };
  });
}

export async function sourcesReport(f: Filters) {
  const W = scope(f);
  const [sources, campaigns, devices, countries] = await Promise.all([
    db.$queryRaw<{ source: string; sessions: bigint; visitors: bigint }[]>`
      SELECT COALESCE("source", 'Direct / none') AS source, COUNT(DISTINCT "sessionId") AS sessions, COUNT(DISTINCT "visitorId") AS visitors
      FROM "AnalyticsEvent" WHERE ${W} AND "name" = 'page_view' GROUP BY 1 ORDER BY 2 DESC LIMIT 25`,
    db.$queryRaw<{ source: string | null; medium: string | null; campaign: string; sessions: bigint }[]>`
      SELECT "source", "medium", "campaign", COUNT(DISTINCT "sessionId") AS sessions
      FROM "AnalyticsEvent" WHERE ${W} AND "name" = 'page_view' AND "campaign" IS NOT NULL GROUP BY 1, 2, 3 ORDER BY 4 DESC LIMIT 25`,
    db.$queryRaw<{ device: string; visitors: bigint }[]>`
      SELECT COALESCE("device", 'unknown') AS device, COUNT(DISTINCT "visitorId") AS visitors
      FROM "AnalyticsEvent" WHERE ${W} AND "name" = 'page_view' GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<{ country: string; visitors: bigint }[]>`
      SELECT COALESCE("country", '??') AS country, COUNT(DISTINCT "visitorId") AS visitors
      FROM "AnalyticsEvent" WHERE ${W} AND "name" = 'page_view' GROUP BY 1 ORDER BY 2 DESC LIMIT 15`,
  ]);
  return {
    sources: sources.map((r) => ({ source: r.source, sessions: n(r.sessions), visitors: n(r.visitors) })),
    campaigns: campaigns.map((r) => ({ source: r.source, medium: r.medium, campaign: r.campaign, sessions: n(r.sessions) })),
    devices: devices.map((r) => ({ device: r.device, visitors: n(r.visitors) })),
    countries: countries.map((r) => ({ country: r.country, visitors: n(r.visitors) })),
  };
}

// Choices for the filter dropdowns, from the last 90 days.
export async function filterOptions() {
  const since = new Date(Date.now() - 90 * DAY);
  const [sources, countries] = await Promise.all([
    db.$queryRaw<{ v: string }[]>`SELECT COALESCE("source", 'Direct / none') AS v FROM "AnalyticsEvent" WHERE "at" >= ${since} AND "name" = 'page_view' GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 30`,
    db.$queryRaw<{ v: string }[]>`SELECT COALESCE("country", '??') AS v FROM "AnalyticsEvent" WHERE "at" >= ${since} AND "name" = 'page_view' GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 30`,
  ]);
  return { sources: sources.map((r) => r.v), countries: countries.map((r) => r.v) };
}

export async function recentSessions(opts: { days?: number; userId?: string; limit?: number; offset?: number; filters?: Filters }) {
  const since = new Date(Date.now() - (opts.days ?? 30) * DAY);
  const W = opts.filters ? scope(opts.filters) : Prisma.sql`"at" >= ${since}`;
  const rows = await db.$queryRaw<{ sessionId: string; start: Date; last: Date; pages: bigint; events: bigint; userId: string | null; source: string | null; device: string | null; country: string | null; entry: string | null; bought: boolean }[]>`
    SELECT "sessionId", MIN("at") AS start, MAX("at") AS last,
           COUNT(*) FILTER (WHERE "name" = 'page_view') AS pages,
           COUNT(*) FILTER (WHERE "name" NOT IN ('page_view', 'page_leave')) AS events,
           MAX("userId") AS "userId", MAX("source") AS source, MAX("device") AS device, MAX("country") AS country,
           (ARRAY_AGG("path" ORDER BY "at") FILTER (WHERE "name" = 'page_view'))[1] AS entry,
           BOOL_OR("name" IN ('purchase', 'lead_submit')) AS bought
    FROM "AnalyticsEvent"
    WHERE ${W} ${opts.userId ? Prisma.sql`AND "sessionId" IN (SELECT DISTINCT "sessionId" FROM "AnalyticsEvent" WHERE "userId" = ${opts.userId})` : Prisma.empty}
    GROUP BY "sessionId" ORDER BY MIN("at") DESC LIMIT ${opts.limit ?? 40} OFFSET ${opts.offset ?? 0}`;
  const users = await db.user.findMany({ where: { id: { in: rows.map((r) => r.userId).filter((x): x is string => !!x) } }, select: { id: true, name: true } });
  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  return rows.map((r) => ({ ...r, pages: n(r.pages), events: n(r.events), userName: r.userId ? (nameOf.get(r.userId) ?? "Deleted account") : null, durationMs: r.last.getTime() - r.start.getTime() }));
}

export const fmtDuration = (ms: number | null) => {
  if (ms === null || !Number.isFinite(ms)) return "–";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
};
