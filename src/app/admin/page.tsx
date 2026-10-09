import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { can, type Permission } from "@/lib/permissions";
import { requestNow } from "@/lib/time";
import { db } from "@/lib/db";
import { cashfreeConfigured, cashfreeMode } from "@/lib/cashfree";
import { bunnyConfigured } from "@/lib/video";
import { claudeConfigured } from "@/lib/flexcare";
import { inr } from "@/lib/format";
import { Card, PageHeader, Stat, Badge } from "@/components/admin/ui";
import { Bars } from "@/components/admin/Bars";

export default async function Dashboard() {
  const me = await requireStaff("dashboard");
  const money = can(me.role, "revenue");
  const allow = (p: Permission) => can(me.role, p);
  const day = 86_400_000;
  const now = requestNow();
  const since30 = new Date(now - 30 * day);
  const startToday = new Date(new Date().setHours(0, 0, 0, 0));
  const [paid30, students, newStudents, activeToday, pendingCalls, chats7, topItems, recent, practice7, practiceToday, questionCount, changesToday] = await Promise.all([
    db.order.findMany({ where: { status: "PAID", paidAt: { gte: since30 } }, select: { total: true, paidAt: true } }),
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { role: "STUDENT", createdAt: { gte: new Date(now - 7 * day) } } }),
    db.user.count({ where: { lastActiveOn: { gte: startToday } } }),
    db.mentorshipBooking.count({ where: { status: "REQUESTED" } }),
    db.chatLog.count({ where: { createdAt: { gte: new Date(now - 7 * day) } } }),
    db.orderItem.groupBy({ by: ["title"], where: { order: { status: "PAID" } }, _sum: { price: true }, _count: true, orderBy: { _sum: { price: "desc" } }, take: 8 }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
    db.attempt.groupBy({ by: ["isCorrect"], where: { createdAt: { gte: new Date(now - 7 * day) } }, _count: true }),
    db.attempt.count({ where: { createdAt: { gte: startToday } } }),
    db.question.count({ where: { isPublished: true } }),
    db.auditLog.count({ where: { createdAt: { gte: startToday } } }),
  ]);
  const practiced7 = practice7.reduce((s, p) => s + p._count, 0);
  const correct7 = practice7.find((p) => p.isCorrect)?._count ?? 0;
  const sum = (from: number) => paid30.filter((o) => o.paidAt!.getTime() >= from).reduce((s, o) => s + o.total, 0);
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(startToday.getTime() - (29 - i) * day);
    const next = d.getTime() + day;
    return {
      label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      value: paid30.filter((o) => o.paidAt!.getTime() >= d.getTime() && o.paidAt!.getTime() < next).reduce((s, o) => s + o.total, 0),
    };
  });

  const setup = [
    { ok: cashfreeConfigured() && cashfreeMode() === "production", label: "Live Cashfree payments", href: "/admin/settings", fix: cashfreeConfigured() ? "Cashfree is in sandbox mode (no real money). Set CASHFREE_ENV=production to go live" : "Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY" },
    { ok: bunnyConfigured(), label: "Bunny Stream video hosting", href: "/admin/video-hosting", fix: "Add Bunny keys to upload lectures" },
    { ok: claudeConfigured(), label: "MathMate AI answers", href: "/admin/flexcare", fix: "Add ANTHROPIC_API_KEY (FAQ-only mode now)" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="How MathFlex is doing today" />
      {allow("settings") && setup.some((s) => !s.ok) && (
        <Card title="Finish setup">
          <ul className="space-y-2 text-sm">
            {setup.map((s) => (
              <li key={s.label} className="flex items-center gap-3">
                <span className={`size-2.5 rounded-full ${s.ok ? "bg-ok" : "bg-gold"}`} />
                <span className="font-semibold">{s.label}</span>
                {!s.ok && <Link href={s.href} className="text-muted underline">{s.fix}</Link>}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {money && (
          <>
            <Stat label="Revenue today" value={inr(sum(startToday.getTime()))} />
            <Stat label="Revenue · 7 days" value={inr(sum(now - 7 * day))} />
            <Stat label="Revenue · 30 days" value={inr(sum(now - 30 * day))} sub={`${paid30.length} paid orders`} />
          </>
        )}
        <Stat label="Students" value={students.toLocaleString("en-IN")} sub={`+${newStudents} this week · ${activeToday} active today`} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Practice answers today" value={practiceToday.toLocaleString("en-IN")} />
        <Stat label="Practice answers · 7 days" value={practiced7.toLocaleString("en-IN")} />
        <Stat label="Student success · 7 days" value={practiced7 ? `${Math.round((correct7 / practiced7) * 100)}%` : "–"} sub="share of answers correct" />
        <Stat label="Questions in the bank" value={questionCount.toLocaleString("en-IN")} sub="published" />
      </div>
      {money && <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Daily revenue · last 30 days"><Bars data={series} format="inr" /></Card>
        <Card title="Best sellers">
          <ul className="space-y-3 text-sm">
            {topItems.map((t) => (
              <li key={t.title} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate font-semibold">{t.title}</span>
                <span className="text-muted">{t._count} sold</span>
                <span className="w-20 text-right font-bold">{inr(t._sum.price ?? 0)}</span>
              </li>
            ))}
            {!topItems.length && <p className="text-muted">No sales yet.</p>}
          </ul>
        </Card>
      </div>}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {allow("orders") && <Card title="Recent orders" action={<Link href="/admin/orders" className="text-sm font-bold text-brand">All orders</Link>}>
          <ul className="divide-y divide-border text-sm">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate"><span className="font-semibold">{o.user.name}</span> <span className="text-muted">· {o.orderNo}</span></span>
                <Badge tone={o.status === "PAID" ? "ok" : o.status === "PENDING" ? "gold" : "bad"}>{o.status}</Badge>
                <span className="w-16 text-right font-bold">{inr(o.total)}</span>
              </li>
            ))}
            {!recent.length && <p className="text-muted">No orders yet.</p>}
          </ul>
        </Card>}
        <Card title="Needs attention">
          <ul className="space-y-3 text-sm">
            {allow("mentorship") && <li><Link href="/admin/mentorship" className="flex justify-between"><span>Mentorship calls to schedule</span><Badge tone={pendingCalls ? "gold" : "muted"}>{pendingCalls}</Badge></Link></li>}
            {allow("flexcare") && <li><Link href="/admin/flexcare" className="flex justify-between"><span>MathMate questions this week</span><Badge>{chats7}</Badge></Link></li>}
            {allow("questions") && <li><Link href="/admin/questions?flag=key" className="flex justify-between"><span>Questions to review (answer key)</span><Badge tone="gold">Review</Badge></Link></li>}
            {allow("audit") && <li><Link href="/admin/audit" className="flex justify-between"><span>Admin changes today</span><Badge>{changesToday}</Badge></Link></li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
