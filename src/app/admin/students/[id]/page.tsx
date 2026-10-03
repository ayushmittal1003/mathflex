import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { can, isStaff, ROLE_LABEL } from "@/lib/permissions";
import { ACTION_LABEL } from "@/lib/audit";
import { AccessTarget } from "@/components/admin/AccessTarget";
import { startImpersonation } from "@/app/actions/impersonation";
import { inr } from "@/lib/format";
import { levelFromXp } from "@/lib/gamification";
import { getSettings } from "@/lib/settings";
import { getAccessibleChapterIds } from "@/lib/access";
import { practiceAnalytics } from "@/lib/qbank";
import { accuracyOf, fmtTime, strengthOf } from "@/lib/grading";
import { Card, Field, PageHeader, Stat, Badge, SubmitButton } from "@/components/admin/ui";
import { ConfirmButton, ActionButton } from "@/components/admin/ConfirmButton";
import { grantAccess, revokeEntitlement, extendEntitlement, setBlocked, deleteStudent } from "../../actions";

export default async function Student({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireStaff("students");
  const u = await db.user.findUnique({
    where: { id },
    include: {
      entitlements: { orderBy: { expiresAt: "desc" }, include: { chapter: { select: { title: true } }, course: { select: { title: true } } } },
      orders: { orderBy: { createdAt: "desc" }, include: { items: true } },
      badges: { include: { badge: true } },
    },
  });
  if (!u) notFound();
  const [chapters, courses, settledOrders, attempts, correct, partsDone, xpEvents, changes] = await Promise.all([
    db.chapter.findMany({ orderBy: [{ classLevel: "asc" }, { sortOrder: "asc" }], select: { id: true, title: true, classLevel: true } }),
    db.course.findMany({ select: { id: true, title: true } }),
    db.order.count({ where: { userId: id, status: { in: ["PAID", "REFUNDED"] } } }),
    db.attempt.count({ where: { userId: id } }),
    db.attempt.count({ where: { userId: id, isCorrect: true } }),
    db.partProgress.count({ where: { userId: id, completedAt: { not: null } } }),
    db.xpEvent.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 40, select: { amount: true, reason: true, createdAt: true } }),
    db.auditLog.findMany({ where: { entity: "user", entityId: id }, orderBy: { createdAt: "desc" }, take: 40 }),
  ]);
  const grantedBy = new Map(
    (await db.user.findMany({ where: { id: { in: u.entitlements.map((e) => e.grantedById).filter((x): x is string => !!x) } }, select: { id: true, name: true } })).map((x) => [x.id, x.name]),
  );
  const timeline = buildTimeline(u, xpEvents, changes);
  const canAccess = can(me.role, "access");
  const staffTarget = isStaff(u.role);
  const settings = await getSettings();
  const pa = await practiceAnalytics(u.id, await getAccessibleChapterIds(u.id), settings.marking);
  const chapterTitle = new Map(chapters.map((c) => [c.id, c.title]));
  const practiced = [...pa.byChapter.entries()].filter(([, t]) => t.attempted > 0).sort((a, b) => accuracyOf(a[1]) - accuracyOf(b[1]));
  const lvl = levelFromXp(u.xp);
  const self = me.id === u.id;
  return (
    <div className="max-w-5xl space-y-6">
      <p className="text-sm"><Link href="/admin/students" className="text-muted hover:text-brand">← All students</Link></p>
      <PageHeader
        title={u.name}
        subtitle={`${u.email}${u.phone ? ` · ${u.phone}` : ""} · joined ${u.createdAt.toLocaleDateString("en-IN")}`}
        action={
          !self && (
            <div className="flex flex-wrap items-center gap-2">
              {staffTarget && <Badge tone="brand">{ROLE_LABEL[u.role]}</Badge>}
              {u.phone && <a href={`https://wa.me/91${u.phone}`} target="_blank" className="btn btn-ghost !py-2 text-sm">WhatsApp</a>}
              {can(me.role, "impersonate") && u.role === "STUDENT" && !u.isBlocked && (
                <form action={startImpersonation.bind(null, u.id)}><button className="btn btn-ghost !py-2 text-sm">View as student</button></form>
              )}
              {can(me.role, "team") && <Link href={`/admin/team?q=${encodeURIComponent(u.email)}`} className="btn btn-ghost !py-2 text-sm">{staffTarget ? "Manage role" : "Add to team"}</Link>}
              {(!staffTarget || can(me.role, "team")) && (
                <ConfirmButton action={setBlocked.bind(null, u.id, !u.isBlocked)} message={u.isBlocked ? "Unblock this account?" : "Block this account? They'll be signed out and can't log in."}>{u.isBlocked ? "Unblock" : "Block"}</ConfirmButton>
              )}
              {!staffTarget && !settledOrders && (
                <ConfirmButton action={deleteStudent.bind(null, u.id)} message={`Permanently delete ${u.name}? Their progress, attempts and access are removed and this can't be undone.`}>Delete</ConfirmButton>
              )}
            </div>
          )
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="XP" value={u.xp.toLocaleString("en-IN")} sub={`Level ${lvl.level} ${lvl.title}`} />
        <Stat label="Streak" value={`${u.streak} days`} sub={`best ${u.bestStreak}`} />
        <Stat label="Accuracy" value={`${attempts ? Math.round((correct / attempts) * 100) : 0}%`} sub={`${attempts} attempts`} />
        <Stat label="Parts completed" value={`${partsDone}`} sub={`${u.badges.length} badges`} />
      </div>
      <Card title="Practice" action={<span className="text-xs text-muted">First attempts · JEE marking</span>}>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Mini label="Solved" value={`${pa.overall.attempted}/${pa.overall.total}`} />
          <Mini label="Accuracy" value={pa.overall.attempted ? `${accuracyOf(pa.overall)}%` : "–"} />
          <Mini label="Marks" value={pa.overall.attempted ? `${pa.overall.marks}/${pa.overall.maxMarks}` : "–"} />
          <Mini label="Avg time" value={pa.overall.attempted ? fmtTime(pa.overall.timeMs / pa.overall.attempted) : "–"} />
        </div>
        {practiced.length > 0 && (
          <ul className="mt-5 divide-y divide-border border-t border-border text-sm">
            {practiced.map(([id, t]) => {
              const st = strengthOf(t);
              return (
                <li key={id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1 truncate font-semibold">{chapterTitle.get(id) ?? "Chapter"}</span>
                  <span className="tabular-nums text-muted">{t.correct}/{t.attempted}</span>
                  <span className="w-12 text-right font-bold tabular-nums">{accuracyOf(t)}%</span>
                  <Badge tone={st === "strong" ? "ok" : st === "weak" ? "bad" : "gold"}>{st === "weak" ? "Needs work" : st === "strong" ? "Strong" : "Building"}</Badge>
                </li>
              );
            })}
          </ul>
        )}
        {pa.weakTopics.length > 0 && (
          <p className="mt-4 text-sm"><span className="font-semibold">Weak topics:</span> <span className="text-muted">{pa.weakTopics.map((t) => `${t.topic} (${accuracyOf(t)}%)`).join(" · ")}</span></p>
        )}
      </Card>
      <Card title="Access">
        <ul className="divide-y divide-border text-sm">
          {u.entitlements.map((e) => {
            const expired = e.expiresAt < new Date();
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{e.chapter?.title ?? e.course?.title}</span>
                  {(e.grantedById || e.note) && (
                    <span className="text-xs text-muted">{e.grantedById ? `Granted by ${grantedBy.get(e.grantedById) ?? "a removed member"}` : ""}{e.grantedById && e.note ? " · " : ""}{e.note}</span>
                  )}
                </span>
                <Badge tone={e.source === "admin" ? "brand" : "muted"}>{e.source === "admin" ? "granted" : e.source}</Badge>
                <span className={expired ? "text-bad" : "text-muted"}>{expired ? "expired" : "until"} {e.expiresAt.toLocaleDateString("en-IN")}</span>
                {canAccess && <ActionButton action={extendEntitlement.bind(null, e.id, 30)}>+30 days</ActionButton>}
                {canAccess && <ConfirmButton action={revokeEntitlement.bind(null, e.id)} message="Remove this access? The student loses it right away.">Revoke</ConfirmButton>}
              </li>
            );
          })}
          {!u.entitlements.length && <li className="py-2 text-muted">No access yet.</li>}
        </ul>
        {canAccess && (
          <form action={grantAccess} className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-[1fr_100px_1fr_auto] sm:items-end">
            <input type="hidden" name="userId" value={u.id} />
            <Field label="Grant free access"><AccessTarget chapters={chapters} courses={courses} /></Field>
            <Field label="Days"><input name="days" type="number" min={1} defaultValue={365} className="input" /></Field>
            <Field label="Note (optional)"><input name="note" placeholder="e.g. Scholarship, refund swap" className="input" /></Field>
            <SubmitButton>Grant</SubmitButton>
          </form>
        )}
        <p className="mt-3 text-xs text-muted">Changes reach the student within about 20 seconds, even on a page they already have open.</p>
      </Card>
      <Card title="Activity" action={<span className="text-xs text-muted">Latest first</span>}>
        {timeline.length ? (
          <ol className="relative space-y-3 border-l border-border pl-5 text-sm">
            {timeline.map((t, i) => (
              <li key={i} className="relative">
                <span className={`absolute -left-[25px] top-1.5 size-2.5 rounded-full ${t.tone}`} />
                <p><span className="font-semibold">{t.title}</span>{t.detail && <span className="text-muted"> · {t.detail}</span>}</p>
                <p className="text-xs text-muted">{t.at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">No activity yet.</p>
        )}
      </Card>
      <Card title="Orders">
        <ul className="divide-y divide-border text-sm">
          {u.orders.map((o) => (
            <li key={o.id} className="flex items-center gap-3 py-2.5">
              <span className="font-mono text-xs">{o.orderNo}</span>
              <span className="min-w-0 flex-1 truncate">{o.items.map((i) => i.title).join(", ")}</span>
              <Badge tone={o.status === "PAID" ? "ok" : o.status === "PENDING" ? "gold" : "bad"}>{o.status}</Badge>
              <span className="font-bold">{inr(o.total)}</span>
            </li>
          ))}
          {!u.orders.length && <li className="py-2 text-muted">No orders.</li>}
        </ul>
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-lg font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

type TimelineItem = { at: Date; title: string; detail?: string; tone: string };

// One feed of what happened on this account: learning, purchases and staff changes.
function buildTimeline(
  u: { createdAt: Date; orders: { createdAt: Date; orderNo: string; total: number; status: string; items: { title: string }[] }[] },
  xp: { amount: number; reason: string; createdAt: Date }[],
  changes: { createdAt: Date; action: string; summary: string; actorName: string }[],
): TimelineItem[] {
  const items: TimelineItem[] = [
    ...xp.map((e) => ({ at: e.createdAt, title: `+${e.amount} XP`, detail: e.reason, tone: "bg-xp" })),
    ...u.orders.map((o) => ({ at: o.createdAt, title: `Order ${o.status.toLowerCase()} · ₹${o.total}`, detail: o.items.map((i) => i.title).join(", "), tone: o.status === "PAID" ? "bg-ok" : "bg-gold" })),
    ...changes.map((c) => ({ at: c.createdAt, title: c.summary, detail: `by ${c.actorName} · ${ACTION_LABEL[c.action.split(".")[0]] ?? "Admin"}`, tone: "bg-brand" })),
    { at: u.createdAt, title: "Joined MathFlex", tone: "bg-muted" },
  ];
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 40);
}
