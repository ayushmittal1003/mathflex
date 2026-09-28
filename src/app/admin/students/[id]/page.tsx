import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { inr } from "@/lib/format";
import { levelFromXp } from "@/lib/gamification";
import { getSettings } from "@/lib/settings";
import { getAccessibleChapterIds } from "@/lib/access";
import { practiceAnalytics } from "@/lib/qbank";
import { accuracyOf, fmtTime, strengthOf } from "@/lib/grading";
import { Card, Field, PageHeader, Stat, Badge, SubmitButton } from "@/components/admin/ui";
import { ConfirmButton, ActionButton } from "@/components/admin/ConfirmButton";
import { grantAccess, revokeEntitlement, extendEntitlement, setBlocked, setRole } from "../../actions";

export default async function Student({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireAdmin();
  const u = await db.user.findUnique({
    where: { id },
    include: {
      entitlements: { orderBy: { expiresAt: "desc" }, include: { chapter: true, course: true } },
      orders: { orderBy: { createdAt: "desc" }, include: { items: true } },
      badges: { include: { badge: true } },
    },
  });
  if (!u) notFound();
  const [chapters, courses, attempts, correct, partsDone] = await Promise.all([
    db.chapter.findMany({ orderBy: [{ classLevel: "asc" }, { sortOrder: "asc" }], select: { id: true, title: true, classLevel: true } }),
    db.course.findMany({ select: { id: true, title: true } }),
    db.attempt.count({ where: { userId: id } }),
    db.attempt.count({ where: { userId: id, isCorrect: true } }),
    db.partProgress.count({ where: { userId: id, completedAt: { not: null } } }),
  ]);
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
            <div className="flex flex-wrap gap-2">
              {u.phone && <a href={`https://wa.me/91${u.phone}`} target="_blank" className="btn btn-ghost !py-2 text-sm">WhatsApp</a>}
              <ActionButton action={setRole.bind(null, u.id, u.role === "ADMIN" ? "STUDENT" : "ADMIN")}>{u.role === "ADMIN" ? "Remove admin" : "Make admin"}</ActionButton>
              <ConfirmButton action={setBlocked.bind(null, u.id, !u.isBlocked)} message={u.isBlocked ? "Unblock this account?" : "Block this account? They won't be able to log in."}>{u.isBlocked ? "Unblock" : "Block"}</ConfirmButton>
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
                <span className="min-w-0 flex-1 font-semibold">{e.chapter?.title ?? e.course?.title}</span>
                <Badge tone={e.source === "admin" ? "brand" : "muted"}>{e.source}</Badge>
                <span className={expired ? "text-bad" : "text-muted"}>{expired ? "expired" : "until"} {e.expiresAt.toLocaleDateString("en-IN")}</span>
                <ActionButton action={extendEntitlement.bind(null, e.id, 30)}>+30 days</ActionButton>
                <ConfirmButton action={revokeEntitlement.bind(null, e.id)} message="Remove this access?">Revoke</ConfirmButton>
              </li>
            );
          })}
          {!u.entitlements.length && <li className="py-2 text-muted">No access yet.</li>}
        </ul>
        <form action={grantAccess} className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-[1fr_120px_auto] sm:items-end">
          <input type="hidden" name="userId" value={u.id} />
          <Field label="Grant free access">
            <select name="target" className="input" required>
              <optgroup label="Courses">{courses.map((c) => <option key={c.id} value={`course:${c.id}`}>{c.title}</option>)}</optgroup>
              {[11, 12].map((cls) => (
                <optgroup key={cls} label={`Class ${cls} chapters`}>
                  {chapters.filter((c) => c.classLevel === cls).map((c) => <option key={c.id} value={`chapter:${c.id}`}>{c.title}</option>)}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Days"><input name="days" type="number" defaultValue={365} className="input" /></Field>
          <SubmitButton>Grant</SubmitButton>
        </form>
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
