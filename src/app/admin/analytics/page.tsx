import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { requestNow } from "@/lib/time";
import { eventsReport, filterOptions, fmtDuration, funnelReport, overview, pagesReport, parseFilters, recentSessions, sourcesReport, type Filters } from "@/lib/site-analytics";
import { Bars } from "@/components/admin/Bars";
import { SplitBar, TrendChart } from "@/components/admin/charts";
import { AnalyticsFilters } from "@/components/admin/AnalyticsFilters";
import { Badge, Card, PageHeader, Table, Td } from "@/components/admin/ui";

export const metadata = { title: "Analytics" };

type SP = Record<string, string | undefined>;
const TABS = [
  ["overview", "Overview"],
  ["events", "Events"],
  ["funnel", "Funnels"],
  ["pages", "Pages"],
  ["sources", "Sources & devices"],
  ["visits", "Visits"],
] as const;
type Tab = (typeof TABS)[number][0];

const EVENT_LABEL: Record<string, string> = {
  click: "Click", add_to_cart: "Add to cart", begin_checkout: "Checkout started", purchase: "Purchase", search: "Chapter search",
  video_play: "Video played", chat_open: "Chat opened", login: "Login", sign_up: "Sign-up", tour_start: "Tour started", tour_complete: "Tour finished", tour_skip: "Tour skipped",
  enquiry_start: "Enquiry started", lead_submit: "Enquiry sent (lead)",
};
const eventName = (k: string) => EVENT_LABEL[k] ?? k.replace(/_/g, " ");
const KEY_EVENTS = ["purchase", "lead_submit", "begin_checkout", "add_to_cart", "sign_up"];
const when = (d: Date) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const fmt = (v: number) => v.toLocaleString("en-IN");
const COUNTRY = (c: string) => { if (c === "??") return "Unknown"; try { return new Intl.DisplayNames(["en"], { type: "region" }).of(c) ?? c; } catch { return c; } };

// Builds a link to this page keeping the current filters, with some values changed.
function href(sp: SP, patch: Record<string, string | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v) q.set(k, v);
  for (const [k, v] of Object.entries(patch)) {
    if (v) q.set(k, v);
    else q.delete(k);
  }
  const s = q.toString();
  return `/admin/analytics${s ? `?${s}` : ""}`;
}

function Delta({ now, prev, invert = false }: { now: number; prev: number; invert?: boolean }) {
  if (!prev) return <span className="text-xs text-muted">no earlier data</span>;
  const pct = Math.round(((now - prev) / prev) * 100);
  const good = invert ? pct < 0 : pct > 0;
  return <span className={`text-xs font-bold ${pct === 0 ? "text-muted" : good ? "text-ok" : "text-bad"}`}>{pct > 0 ? "▲" : pct < 0 ? "▼" : "●"} {Math.abs(pct)}% <span className="font-medium text-muted">vs previous</span></span>;
}

// A horizontal bar list: label, bar, value. Rows can link to a drill-down.
function BarList({ rows, empty = "Nothing yet." }: { rows: { key: string; label: React.ReactNode; value: number; sub?: string; href?: string }[]; empty?: string }) {
  if (!rows.length) return <p className="py-4 text-sm text-muted">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-1">
      {rows.map((r) => {
        const inner = (
          <>
            <span className="absolute inset-y-0 left-0 rounded-md bg-brand/12" style={{ width: `${(r.value / max) * 100}%` }} />
            <span className="relative min-w-0 flex-1 truncate">{r.label}</span>
            <span className="relative shrink-0 tabular-nums font-bold">{fmt(r.value)}{r.sub && <span className="ml-1 font-medium text-muted">{r.sub}</span>}</span>
          </>
        );
        return (
          <li key={r.key}>
            {r.href ? <Link href={r.href} className="relative flex items-center gap-3 overflow-hidden rounded-md px-2.5 py-1.5 text-sm hover:bg-surface-2">{inner}</Link> : <div className="relative flex items-center gap-3 overflow-hidden rounded-md px-2.5 py-1.5 text-sm">{inner}</div>}
          </li>
        );
      })}
    </ul>
  );
}

function Funnel({ steps }: { steps: { key: string; label: string; visitors: number }[] }) {
  const top = steps[0]?.visitors || 1;
  return (
    <div className="space-y-1">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].visitors : 0;
        const drop = i > 0 && prev ? Math.round(((prev - s.visitors) / prev) * 100) : null;
        return (
          <div key={s.key}>
            {drop !== null && <p className="py-1 pl-[170px] text-xs text-muted max-sm:pl-0">↓ {100 - drop}% continued <span className={drop >= 70 ? "font-bold text-bad" : ""}>· {drop}% dropped off</span></p>}
            <div className="grid grid-cols-[160px_1fr_120px] items-center gap-3 text-sm max-sm:grid-cols-[1fr_auto]">
              <span className="font-semibold max-sm:col-span-2">{i + 1}. {s.label}</span>
              <span className="h-8 overflow-hidden rounded-md bg-surface-2"><span className="block h-full rounded-md bg-gradient-to-r from-brand to-[#ff8a3d]" style={{ width: `${Math.max(s.visitors ? 1.5 : 0, (s.visitors / top) * 100)}%` }} /></span>
              <span className="text-right tabular-nums"><b>{fmt(s.visitors)}</b> <span className="text-muted">· {Math.round((s.visitors / top) * 100)}%</span></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

async function OverviewTab({ f, sp }: { f: Filters; sp: SP }) {
  const [o, ev, pages, src] = await Promise.all([overview(f), eventsReport(f), pagesReport(f), sourcesReport(f)]);
  const metric = sp.metric === "pageviews" || sp.metric === "sessions" ? sp.metric : "visitors";
  const tiles = [
    { k: "Visitors", v: fmt(o.now.visitors), d: <Delta now={o.now.visitors} prev={o.prev.visitors} /> },
    { k: "Visits", v: fmt(o.now.sessions), d: <Delta now={o.now.sessions} prev={o.prev.sessions} /> },
    { k: "Page views", v: fmt(o.now.pageviews), d: <Delta now={o.now.pageviews} prev={o.prev.pageviews} /> },
    { k: "Bounce rate", v: o.now.bounceRate === null ? "–" : `${o.now.bounceRate}%`, d: <Delta now={o.now.bounceRate ?? 0} prev={o.prev.bounceRate ?? 0} invert /> },
    { k: "Avg. visit", v: fmtDuration(o.now.avgSessionMs), d: <Delta now={o.now.avgSessionMs} prev={o.prev.avgSessionMs} /> },
    { k: "Pages / visit", v: o.now.pagesPerSession ? o.now.pagesPerSession.toFixed(1) : "–", d: <Delta now={o.now.pagesPerSession} prev={o.prev.pagesPerSession} /> },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.k} className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs font-semibold text-muted">{t.k}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{t.v}</p>
            <div className="mt-1">{t.d}</div>
          </div>
        ))}
      </div>

      <Card
        title="Trend"
        action={
          <div className="flex rounded-lg bg-surface-2 p-0.5 text-xs">
            {(["visitors", "sessions", "pageviews"] as const).map((m) => (
              <Link key={m} href={href(sp, { metric: m === "visitors" ? null : m })} scroll={false} className={`rounded-md px-2.5 py-1 font-bold ${metric === m ? "bg-surface shadow-sm" : "text-muted"}`}>{m === "visitors" ? "Visitors" : m === "sessions" ? "Visits" : "Page views"}</Link>
            ))}
          </div>
        }
      >
        <TrendChart
          name={metric === "visitors" ? "Visitors" : metric === "sessions" ? "Visits" : "Page views"}
          labels={o.daily.map((d) => d.day)}
          current={o.daily.map((d) => d[metric])}
          previous={o.daily.map((d) => (metric === "visitors" ? d.prevVisitors : metric === "sessions" ? d.prevSessions : d.prevPageviews))}
        />
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Devices"><SplitBar parts={o.devices} /></Card>
        <Card title="Logged in or not"><SplitBar parts={o.who} unit="visits" /></Card>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {KEY_EVENTS.map((k) => (
          <Link key={k} href={href(sp, { tab: "events", event: k })} className="rounded-2xl border border-border bg-surface p-4 hover:border-brand">
            <p className="text-xs font-semibold text-muted">{eventName(k)}</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums">{fmt(o.conversions[k] ?? 0)}</p>
            <p className="text-xs text-muted">{o.now.visitors ? `${(((o.conversions[k] ?? 0) / o.now.visitors) * 100).toFixed(1)}% of visitors` : "people"}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Top pages" action={<Link href={href(sp, { tab: "pages" })} className="text-xs font-bold text-brand">All →</Link>}>
          <BarList rows={pages.slice(0, 6).map((p) => ({ key: p.path, label: <span className="font-mono text-xs">{p.path}</span>, value: p.pageviews, href: href(sp, { path: p.path }) }))} />
        </Card>
        <Card title="Top sources" action={<Link href={href(sp, { tab: "sources" })} className="text-xs font-bold text-brand">All →</Link>}>
          <BarList rows={src.sources.slice(0, 6).map((s) => ({ key: s.source, label: s.source, value: s.sessions, href: href(sp, { source: s.source }) }))} />
        </Card>
        <Card title="Top events" action={<Link href={href(sp, { tab: "events" })} className="text-xs font-bold text-brand">All →</Link>}>
          <BarList rows={ev.events.slice(0, 6).map((e) => ({ key: e.name, label: eventName(e.name), value: e.count, href: href(sp, { tab: "events", event: e.name }) }))} />
        </Card>
      </div>
    </div>
  );
}

async function EventsTab({ f, sp }: { f: Filters; sp: SP }) {
  const selected = sp.event;
  const { events, trend } = await eventsReport(f, selected);
  const q = (sp.q ?? "").toLowerCase();
  const shown = events.filter((e) => !q || eventName(e.name).toLowerCase().includes(q) || e.name.includes(q) || e.labels.some((l) => l.label?.toLowerCase().includes(q)));
  return (
    <div className="space-y-5">
      {selected && (
        <Card title={`${eventName(selected)} per day`} action={<Link href={href(sp, { event: null })} className="text-xs font-bold text-muted hover:text-foreground">Close ✕</Link>}>
          {trend.length ? <Bars data={trend.map((t) => ({ label: t.day, value: t.count }))} format="count" /> : <p className="text-sm text-muted">No “{eventName(selected)}” in this period.</p>}
        </Card>
      )}
      <form className="flex gap-2">
        {Object.entries(sp).filter(([k, v]) => v && k !== "q").map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <input name="q" defaultValue={sp.q} placeholder="Search events or what was clicked, e.g. Buy, WhatsApp, integrals" className="input max-w-md" />
        <button className="rounded-xl bg-foreground px-3.5 py-2 text-sm font-semibold text-background">Search</button>
      </form>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="grid grid-cols-[1fr_90px_90px_80px] gap-3 border-b border-border px-4 py-2.5 text-xs font-semibold text-muted">
          <span>Event · tap to expand</span><span className="text-right">Times</span><span className="text-right">People</span><span />
        </div>
        {shown.length === 0 && <p className="px-4 py-6 text-sm text-muted">No events{q ? " match your search" : " in this period"}.</p>}
        {shown.map((e) => {
          const max = Math.max(1, ...e.labels.map((l) => l.count));
          return (
            <details key={e.name} open={selected === e.name || (!!q && shown.length <= 3)} className="group border-b border-border last:border-b-0">
              <summary className="grid cursor-pointer list-none grid-cols-[1fr_90px_90px_80px] items-center gap-3 px-4 py-3 hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="text-muted transition group-open:rotate-90">▸</span>
                  <Badge tone={e.name === "purchase" || e.name === "lead_submit" ? "ok" : e.name === "click" ? "muted" : "brand"}>{eventName(e.name)}</Badge>
                  <span className="text-xs font-normal text-muted">{e.labels.length > 1 ? `${e.labels.length}${e.labels.length === 25 ? "+" : ""} kinds` : ""}</span>
                </span>
                <span className="text-right tabular-nums font-bold">{fmt(e.count)}</span>
                <span className="text-right tabular-nums">{fmt(e.visitors)}</span>
                <Link href={href(sp, { event: e.name })} scroll={false} className="text-right text-xs font-bold text-brand">Trend</Link>
              </summary>
              <div className="bg-surface-2/50 px-4 pb-3 pt-1">
                {e.labels.map((l) => (
                  <div key={l.label ?? "–"} className="relative my-1 flex items-center gap-3 overflow-hidden rounded-md px-2.5 py-1.5 text-sm">
                    <span className="absolute inset-y-0 left-0 rounded-md bg-brand/10" style={{ width: `${(l.count / max) * 100}%` }} />
                    <span className="relative min-w-0 flex-1 truncate">{l.label ?? <span className="text-muted">(no detail)</span>}</span>
                    <span className="relative w-[90px] text-right tabular-nums font-bold">{fmt(l.count)}</span>
                    <span className="relative w-[90px] text-right tabular-nums text-muted">{fmt(l.visitors)}</span>
                    <span className="w-[80px]" />
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

async function FunnelTab({ f }: { f: Filters }) {
  const { shop, lead } = await funnelReport(f);
  return (
    <div className="space-y-5">
      <Card title="Buying funnel" action={<span className="text-xs text-muted">unique people at each step</span>}><Funnel steps={shop} /></Card>
      <Card title="Enquiry funnel (ads)" action={<span className="text-xs text-muted">the /enquiry form</span>}><Funnel steps={lead} /></Card>
      <p className="text-xs text-muted">A big drop between two steps shows where people give up. Use the filters above to compare, e.g. mobile vs desktop or one ad campaign against another.</p>
    </div>
  );
}

async function PagesTab({ f, sp }: { f: Filters; sp: SP }) {
  const pages = await pagesReport(f);
  return (
    <Card title="Pages" action={<span className="text-xs text-muted">click a page to filter everything by visits that saw it</span>}>
      <Table head={["Page", "Views", "People", "Avg. time", "Entries", "Bounce"]} empty={!pages.length}>
        {pages.map((p) => (
          <tr key={p.path}>
            <Td className="max-w-[340px] truncate font-mono text-xs"><Link href={href(sp, { path: p.path, tab: "overview" })} className="hover:text-brand">{p.path}</Link></Td>
            <Td className="tabular-nums font-bold">{fmt(p.pageviews)}</Td>
            <Td className="tabular-nums">{fmt(p.visitors)}</Td>
            <Td>{fmtDuration(p.avgMs)}</Td>
            <Td className="tabular-nums">{fmt(p.entries)}</Td>
            <Td>{p.bounceRate === null ? "–" : <span className={p.bounceRate >= 70 ? "font-bold text-bad" : ""}>{p.bounceRate}%</span>}</Td>
          </tr>
        ))}
      </Table>
      <p className="mt-2 text-xs text-muted">Entries: visits that started on this page. Bounce: of those, how many left without opening another page.</p>
    </Card>
  );
}

async function SourcesTab({ f, sp }: { f: Filters; sp: SP }) {
  const r = await sourcesReport(f);
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Where visits come from"><BarList rows={r.sources.map((s) => ({ key: s.source, label: s.source, value: s.sessions, sub: "visits", href: href(sp, { source: s.source, tab: "overview" }) }))} /></Card>
        <Card title="Ad campaigns" action={<span className="text-xs text-muted">from utm_campaign</span>}>
          <BarList rows={r.campaigns.map((c) => ({ key: `${c.source}/${c.medium}/${c.campaign}`, label: <>{c.campaign} <span className="text-xs text-muted">{[c.source, c.medium].filter(Boolean).join(" / ")}</span></>, value: c.sessions, sub: "visits" }))} empty="No tagged campaigns yet. Add ?utm_source=meta&utm_campaign=name to ad links." />
        </Card>
        <Card title="Devices"><SplitBar parts={r.devices.map((d) => ({ label: d.device, value: d.visitors }))} /></Card>
        <Card title="Countries"><BarList rows={r.countries.map((c) => ({ key: c.country, label: COUNTRY(c.country), value: c.visitors, sub: "people", href: href(sp, { country: c.country, tab: "overview" }) }))} /></Card>
      </div>
    </div>
  );
}

const PER_PAGE = 50;
async function VisitsTab({ f, sp }: { f: Filters; sp: SP }) {
  const page = Math.max(1, Number(sp.page) || 1);
  const rows = await recentSessions({ filters: f, limit: PER_PAGE + 1, offset: (page - 1) * PER_PAGE });
  const more = rows.length > PER_PAGE;
  return (
    <Card title="Visits" action={<span className="text-xs text-muted">newest first · open one to see its journey</span>}>
      <Table head={["Started", "Who", "Came from", "Landed on", "Device", "Pages", "Actions", "Length", ""]} empty={!rows.length}>
        {rows.slice(0, PER_PAGE).map((s) => (
          <tr key={s.sessionId} className={s.bought ? "bg-ok/5" : ""}>
            <Td className="whitespace-nowrap text-xs">{when(s.start)}</Td>
            <Td className="text-xs">{s.userId ? <Link href={`/admin/students/${s.userId}`} className="font-semibold hover:text-brand">{s.userName}</Link> : <span className="text-muted">Visitor</span>}{s.bought && <span className="ml-1.5"><Badge tone="ok">converted</Badge></span>}</Td>
            <Td className="max-w-[140px] truncate text-xs">{s.source ?? "Direct / none"}</Td>
            <Td className="max-w-[160px] truncate font-mono text-xs">{s.entry ?? "–"}</Td>
            <Td className="text-xs capitalize">{s.device ?? "–"}{s.country ? ` · ${s.country}` : ""}</Td>
            <Td>{s.pages}</Td>
            <Td>{s.events}</Td>
            <Td className="text-xs">{fmtDuration(s.durationMs)}</Td>
            <Td><Link href={`/admin/analytics/${s.sessionId}`} className="text-sm font-bold text-brand">Journey →</Link></Td>
          </tr>
        ))}
      </Table>
      <div className="mt-3 flex items-center justify-between text-sm">
        {page > 1 ? <Link href={href(sp, { page: page === 2 ? null : String(page - 1) })} className="font-bold text-brand">← Newer</Link> : <span />}
        <span className="text-xs text-muted">Page {page}</span>
        {more ? <Link href={href(sp, { page: String(page + 1) })} className="font-bold text-brand">Older →</Link> : <span />}
      </div>
    </Card>
  );
}

// Website analytics from our own tracking (see app/api/track), in tabs with one filter bar for all
// of them. Team members aren't counted.
export default async function Analytics({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff("dashboard");
  const sp = await searchParams;
  const f = parseFilters(sp, requestNow());
  const tab: Tab = TABS.some(([k]) => k === sp.tab) ? (sp.tab as Tab) : "overview";
  const options = await filterOptions();
  const range = f.preset === "custom" ? `${f.since.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })} – ${f.until.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}` : f.preset === "1" ? "the last 24 hours" : `the last ${f.preset} days`;

  return (
    <div className="max-w-6xl space-y-5">
      <PageHeader title="Analytics" subtitle={`What visitors do on the website, ${range}. Team members aren't counted.`} />
      <Suspense><AnalyticsFilters sources={options.sources} countries={options.countries} /></Suspense>
      <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label="Analytics views">
        {TABS.map(([k, label]) => (
          <Link key={k} href={href(sp, { tab: k === "overview" ? null : k, event: null, q: null, page: null, metric: null })} aria-current={tab === k ? "page" : undefined} className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-bold ${tab === k ? "border-brand text-foreground" : "border-transparent text-muted hover:text-foreground"}`}>
            {label}
          </Link>
        ))}
      </nav>
      {tab === "overview" && <OverviewTab f={f} sp={sp} />}
      {tab === "events" && <EventsTab f={f} sp={sp} />}
      {tab === "funnel" && <FunnelTab f={f} />}
      {tab === "pages" && <PagesTab f={f} sp={sp} />}
      {tab === "sources" && <SourcesTab f={f} sp={sp} />}
      {tab === "visits" && <VisitsTab f={f} sp={sp} />}
      <p className="text-xs text-muted">Bounce rate: visits that saw only one page. Avg. visit: time spent on pages. Raw events are kept for 180 days. Vercel&apos;s own Web Analytics is in the Vercel dashboard under Analytics.</p>
    </div>
  );
}
