import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDuration } from "@/lib/site-analytics";
import { Badge, Card, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Visit journey" };

const time = (d: Date) => d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", second: "2-digit" });

// One visit, step by step: every page opened (with time spent), every click and event, in order.
export default async function Journey({ params }: { params: Promise<{ session: string }> }) {
  await requireStaff("dashboard");
  const { session } = await params;
  const events = await db.analyticsEvent.findMany({ where: { sessionId: session }, orderBy: [{ at: "asc" }, { id: "asc" }], take: 1000 });
  if (!events.length) notFound();
  const first = events[0];
  const userId = events.find((e) => e.userId)?.userId;
  const user = userId ? await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true } }) : null;
  const previous = await db.analyticsEvent.groupBy({ by: ["sessionId"], where: { visitorId: first.visitorId, at: { lt: first.at } }, _count: true });
  const leaveFor = new Map<number, number>();
  // Time on each page view: its page_leave pieces up to the next page view.
  events.forEach((e, i) => {
    if (e.name !== "page_view") return;
    let ms = 0;
    for (const x of events.slice(i + 1)) {
      if (x.name === "page_view") break;
      if (x.name === "page_leave" && x.path === e.path) ms += x.ms ?? 0;
    }
    if (ms) leaveFor.set(i, ms);
  });

  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-sm"><Link href="/admin/analytics" className="text-muted hover:text-brand">← Analytics</Link></p>
      <PageHeader
        title={user ? `${user.name}'s visit` : "Visitor's visit"}
        subtitle={`${first.at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST · came from ${first.source ?? "direct / none"}${first.campaign ? ` (${first.campaign})` : ""} · ${first.device ?? "unknown device"}${first.country ? ` · ${first.country}` : ""} · ${previous.length ? `${previous.length} earlier visit${previous.length === 1 ? "" : "s"}` : "first visit"}`}
        action={user ? <Link href={`/admin/students/${user.id}`} className="btn btn-ghost !py-2 text-sm">Student profile</Link> : undefined}
      />
      <Card>
        <ol className="relative space-y-3 border-l-2 border-border pl-5">
          {events.map((e, i) =>
            e.name === "page_leave" ? null : (
              <li key={String(e.id)} className="relative">
                <span className={`absolute -left-[27px] top-1.5 size-3 rounded-full ${e.name === "page_view" ? "bg-brand" : e.name === "purchase" ? "bg-ok" : "bg-border"}`} />
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-mono text-xs text-muted">{time(e.at)}</span>
                  {e.name === "page_view" ? (
                    <><b>Opened</b><span className="font-mono text-xs">{e.path}</span>{leaveFor.has(i) && <span className="text-xs text-muted">· {fmtDuration(leaveFor.get(i)!)}</span>}</>
                  ) : (
                    <><Badge tone={e.name === "purchase" ? "ok" : e.name === "click" ? "muted" : "brand"}>{e.name.replace(/_/g, " ")}</Badge><span>{e.label ?? ""}</span>{e.path && <span className="font-mono text-xs text-muted">on {e.path}</span>}</>
                  )}
                </div>
              </li>
            ),
          )}
        </ol>
      </Card>
    </div>
  );
}
