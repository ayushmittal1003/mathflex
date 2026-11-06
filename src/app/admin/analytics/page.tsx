import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { FUNNEL, fmtDuration, recentSessions, siteReport } from "@/lib/site-analytics";
import { Bars } from "@/components/admin/Bars";
import { Badge, Card, PageHeader, Stat, Table, Td } from "@/components/admin/ui";

export const metadata = { title: "Analytics" };

const RANGES = [1, 7, 30, 90];
const EVENT_LABEL: Record<string, string> = {
  click: "Click", add_to_cart: "Add to cart", begin_checkout: "Checkout started", purchase: "Purchase", search: "Chapter search",
  video_play: "Video played", chat_open: "Chat opened", login: "Login", sign_up: "Sign-up", tour_start: "Tour started", tour_complete: "Tour finished", tour_skip: "Tour skipped",
};
const when = (d: Date) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

// Website analytics from our own tracking (see app/api/track): visits, bounce rate, pages, sources,
// clicks and named events, the purchase funnel and each visit's journey. Team members aren't counted.
export default async function Analytics({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireStaff("dashboard");
  const days = RANGES.includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 7;
  const [r, sessions] = await Promise.all([siteReport(days), recentSessions({ days, limit: 40 })]);
  const top = r.funnel[0]?.visitors || 1;

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        title="Analytics"
        subtitle={`Website visits and what visitors do, last ${days === 1 ? "24 hours" : `${days} days`}. ${r.liveNow} on the site right now. Team members aren't counted.`}
        action={
          <div className="flex gap-1">
            {RANGES.map((d) => (
              <Link key={d} href={`/admin/analytics?days=${d}`} className={`rounded-lg px-3 py-2 text-sm font-bold ${d === days ? "bg-brand text-white" : "bg-surface-2 hover:bg-border"}`}>{d === 1 ? "24h" : `${d}d`}</Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Visitors" value={r.visitors.toLocaleString("en-IN")} sub="unique browsers" />
        <Stat label="Visits" value={r.sessions.toLocaleString("en-IN")} sub="sessions" />
        <Stat label="Page views" value={r.pageviews.toLocaleString("en-IN")} />
        <Stat label="Bounce rate" value={r.bounceRate === null ? "–" : `${r.bounceRate}%`} sub="left after one page" />
        <Stat label="Avg. visit" value={fmtDuration(r.avgSessionMs)} sub="time on site" />
        <Stat label="Pages / visit" value={r.pagesPerSession ? r.pagesPerSession.toFixed(1) : "–"} />
      </div>

      <Card title="Visitors per day">
        {r.daily.length ? <Bars data={r.daily.map((d) => ({ label: d.day, value: d.visitors }))} format="count" /> : <p className="text-sm text-muted">No visits recorded yet.</p>}
      </Card>

      <Card title="Purchase funnel" action={<span className="text-xs text-muted">unique visitors at each step</span>}>
        <div className="space-y-2.5">
          {r.funnel.map((f, i) => (
            <div key={f.key} className="grid grid-cols-[150px_1fr_110px] items-center gap-3 text-sm">
              <span className="font-semibold">{f.label}</span>
              <span className="h-6 overflow-hidden rounded-md bg-surface-2"><span className="block h-full rounded-md bg-brand" style={{ width: `${Math.max(f.visitors ? 2 : 0, (f.visitors / top) * 100)}%` }} /></span>
              <span className="text-right tabular-nums"><b>{f.visitors.toLocaleString("en-IN")}</b>{i > 0 && <span className="text-muted"> · {Math.round((f.visitors / top) * 100)}%</span>}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">{FUNNEL.length} steps from first visit to payment. A drop between two steps shows where visitors give up.</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Top pages">
          <Table head={["Page", "Views", "Visitors", "Avg. time"]} empty={!r.pages.length}>
            {r.pages.map((p) => (
              <tr key={p.path}><Td className="max-w-[260px] truncate font-mono text-xs">{p.path}</Td><Td>{p.pageviews}</Td><Td>{p.visitors}</Td><Td>{fmtDuration(p.avgMs)}</Td></tr>
            ))}
          </Table>
        </Card>
        <Card title="Events and clicks">
          <Table head={["Event", "What", "Times", "Visitors"]} empty={!r.events.length}>
            {r.events.map((e) => (
              <tr key={`${e.name}:${e.label}`}><Td><Badge tone={e.name === "purchase" ? "ok" : e.name === "click" ? "muted" : "brand"}>{EVENT_LABEL[e.name] ?? e.name}</Badge></Td><Td className="max-w-[220px] truncate text-xs">{e.label ?? "–"}</Td><Td>{e.count}</Td><Td>{e.visitors}</Td></tr>
            ))}
          </Table>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Where visits come from">
          <Table head={["Source", "Visits"]} empty={!r.sources.length}>{r.sources.map((s) => <tr key={s.source}><Td className="truncate">{s.source}</Td><Td>{s.sessions}</Td></tr>)}</Table>
          <p className="mt-2 text-xs text-muted">Add ?utm_source=instagram (or youtube, whatsapp…) to links you share to see them here.</p>
        </Card>
        <Card title="Devices"><Table head={["Device", "Visitors"]} empty={!r.devices.length}>{r.devices.map((d) => <tr key={d.device}><Td className="capitalize">{d.device}</Td><Td>{d.visitors}</Td></tr>)}</Table></Card>
        <Card title="Countries"><Table head={["Country", "Visitors"]} empty={!r.countries.length}>{r.countries.map((c) => <tr key={c.country}><Td>{c.country}</Td><Td>{c.visitors}</Td></tr>)}</Table></Card>
      </div>

      <Card title="Recent visits" action={<span className="text-xs text-muted">open one to see the full journey</span>}>
        <Table head={["Started", "Who", "Came from", "Device", "Pages", "Actions", "Length", ""]} empty={!sessions.length}>
          {sessions.map((s) => (
            <tr key={s.sessionId}>
              <Td className="whitespace-nowrap text-xs">{when(s.start)}</Td>
              <Td className="text-xs">{s.userId ? <Link href={`/admin/students/${s.userId}`} className="font-semibold hover:text-brand">{s.userName}</Link> : <span className="text-muted">Visitor</span>}</Td>
              <Td className="max-w-[160px] truncate text-xs">{s.source ?? "Direct / none"}</Td>
              <Td className="text-xs capitalize">{s.device ?? "–"}{s.country ? ` · ${s.country}` : ""}</Td>
              <Td>{s.pages}</Td>
              <Td>{s.events}</Td>
              <Td className="text-xs">{fmtDuration(s.durationMs)}</Td>
              <Td><Link href={`/admin/analytics/${s.sessionId}`} className="text-sm font-bold text-brand">Journey →</Link></Td>
            </tr>
          ))}
        </Table>
      </Card>

      <p className="text-xs text-muted">Bounce rate: visits that saw only one page. Avg. visit: time spent on pages, from when a page opens until the visitor moves on or leaves. Raw events are kept for 180 days. Vercel&apos;s own Web Analytics (page views only on the free plan) is in the Vercel dashboard under Analytics.</p>
    </div>
  );
}
