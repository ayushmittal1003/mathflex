import Link from "next/link";
import { isStaff, ROLE_LABEL, STAFF_ROLES } from "@/lib/permissions";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestNow } from "@/lib/time";
import { PageHeader, Table, Td, Badge } from "@/components/admin/ui";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Students" };

type Search = { q?: string; cls?: string; plan?: string; status?: string; page?: string; per?: string };

const PER_PAGE = [25, 50, 100];

export default async function Students({ searchParams }: { searchParams: Promise<Search> }) {
  await requireStaff("students");
  const sp = await searchParams;
  const now = requestNow();
  const active7 = new Date(now - 7 * 86_400_000);
  const paid: Prisma.UserWhereInput = { entitlements: { some: { expiresAt: { gt: new Date(now) }, source: "purchase" } } };

  const where: Prisma.UserWhereInput = {
    ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q } }] } : {}),
    ...(sp.cls ? { classLevel: Number(sp.cls) } : {}),
    ...(sp.plan === "paid" ? paid : sp.plan === "free" ? { NOT: paid } : {}),
    ...(sp.status === "blocked" ? { isBlocked: true } : sp.status === "active" ? { lastActiveOn: { gte: active7 } } : sp.status === "team" ? { role: { in: STAFF_ROLES } } : {}),
  };
  const per = PER_PAGE.includes(Number(sp.per)) ? Number(sp.per) : 25;
  const page = Math.max(1, Number(sp.page) || 1);

  const student = { role: "STUDENT" as const };
  const [total, c11, c12, droppers, paidCount, activeCount, blocked, matching, users] = await Promise.all([
    db.user.count({ where: student }),
    db.user.count({ where: { ...student, classLevel: 11 } }),
    db.user.count({ where: { ...student, classLevel: 12 } }),
    db.user.count({ where: { ...student, classLevel: 13 } }),
    db.user.count({ where: { ...student, ...paid } }),
    db.user.count({ where: { ...student, lastActiveOn: { gte: active7 } } }),
    db.user.count({ where: { isBlocked: true } }),
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * per,
      take: per,
      include: {
        entitlements: { where: { expiresAt: { gt: new Date(now) } }, select: { source: true, chapterId: true, courseId: true } },
      },
    }),
  ]);
  const practice = await db.attempt.groupBy({ by: ["userId", "isCorrect"], where: { userId: { in: users.map((u) => u.id) } }, _count: true });
  const prac = new Map<string, { attempts: number; correct: number }>();
  for (const p of practice) {
    const cur = prac.get(p.userId) ?? { attempts: 0, correct: 0 };
    cur.attempts += p._count;
    if (p.isCorrect) cur.correct += p._count;
    prac.set(p.userId, cur);
  }
  const pages = Math.max(1, Math.ceil(matching / per));

  const href = (patch: Partial<Search>) => {
    const qs = new URLSearchParams(Object.entries({ ...sp, page: undefined, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/students${qs.size ? `?${qs}` : ""}`;
  };
  const tiles: { label: string; value: number; tone?: string; patch: Partial<Search>; active: boolean }[] = [
    { label: "Total students", value: total, patch: { cls: undefined, plan: undefined, status: undefined }, active: !sp.cls && !sp.plan && !sp.status },
    { label: "Class 11", value: c11, patch: { cls: "11" }, active: sp.cls === "11" },
    { label: "Class 12", value: c12, patch: { cls: "12" }, active: sp.cls === "12" },
    { label: "Droppers", value: droppers, patch: { cls: "13" }, active: sp.cls === "13" },
    { label: "Paid", value: paidCount, tone: "text-ok", patch: { plan: "paid" }, active: sp.plan === "paid" },
    { label: "Active · 7 days", value: activeCount, tone: "text-brand", patch: { status: "active" }, active: sp.status === "active" },
    { label: "Blocked", value: blocked, tone: "text-bad", patch: { status: "blocked" }, active: sp.status === "blocked" },
  ];

  return (
    <div>
      <PageHeader title="Students" subtitle="Manage learner accounts" />

      <div className="card mb-5 grid grid-cols-2 divide-border overflow-hidden sm:grid-cols-4 lg:grid-cols-7 lg:divide-x">
        {tiles.map((t) => (
          <Link key={t.label} href={href(t.patch)} className={`border-b-2 px-4 py-3.5 transition hover:bg-surface-2 ${t.active ? "border-brand bg-brand/5" : "border-transparent"}`}>
            <p className={`font-display text-2xl font-extrabold tabular-nums ${t.tone ?? ""}`}>{t.value.toLocaleString("en-IN")}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{t.label}</p>
          </Link>
        ))}
      </div>

      <form className="mb-4 grid gap-2 sm:grid-cols-[2fr_repeat(3,1fr)_auto]">
        <input name="q" defaultValue={sp.q} placeholder="Search name, email or phone" className="input" />
        <select name="cls" defaultValue={sp.cls ?? ""} className="input"><option value="">Any class</option><option value="11">Class 11</option><option value="12">Class 12</option><option value="13">Dropper</option></select>
        <select name="plan" defaultValue={sp.plan ?? ""} className="input"><option value="">Any plan</option><option value="paid">Paid</option><option value="free">Free</option></select>
        <select name="status" defaultValue={sp.status ?? ""} className="input"><option value="">Any status</option><option value="active">Active in 7 days</option><option value="blocked">Blocked</option><option value="team">Team members</option></select>
        <button className="btn btn-primary !py-2 text-sm">Filter</button>
      </form>

      <Table head={["Student", "Class", "Plan", "Practice", "XP", "Streak", "Last active", "Joined"]} empty={!users.length}>
        {users.map((u) => {
          const purchased = u.entitlements.filter((e) => e.source === "purchase");
          const granted = u.entitlements.length - purchased.length;
          const p = prac.get(u.id);
          return (
            <tr key={u.id} className="hover:bg-surface-2">
              <Td>
                <Link href={`/admin/students/${u.id}`} className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: u.avatarColor }}>{u.name[0]}</span>
                  <span className="min-w-0"><span className="block font-semibold hover:text-brand">{u.name}</span><span className="text-xs text-muted">{u.email}{u.phone ? ` · ${u.phone}` : ""}</span></span>
                  {isStaff(u.role) && <Badge tone="brand">{ROLE_LABEL[u.role]}</Badge>}
                  {u.isBlocked && <Badge tone="bad">Blocked</Badge>}
                </Link>
              </Td>
              <Td>{u.classLevel === 13 ? "Dropper" : u.classLevel ? `Class ${u.classLevel}` : "–"}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {purchased.length > 0 && <Badge tone="ok">Paid · {purchased.length}</Badge>}
                  {granted > 0 && <Badge tone="brand">Granted · {granted}</Badge>}
                  {!u.entitlements.length && <Badge>Free</Badge>}
                </div>
              </Td>
              <Td className="tabular-nums">{p ? <><b>{Math.round((p.correct / p.attempts) * 100)}%</b> <span className="text-xs text-muted">· {p.attempts} Qs</span></> : <span className="text-muted">–</span>}</Td>
              <Td className="tabular-nums">{u.xp.toLocaleString("en-IN")}</Td>
              <Td className="tabular-nums">{u.streak}</Td>
              <Td className="text-xs text-muted">{u.lastActiveOn ? u.lastActiveOn.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "–"}</Td>
              <Td className="text-xs text-muted">{u.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Td>
            </tr>
          );
        })}
      </Table>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted">
          Showing <b className="text-fg">{matching ? (page - 1) * per + 1 : 0}–{Math.min(page * per, matching)}</b> of <b className="text-fg">{matching.toLocaleString("en-IN")}</b>
        </p>
        <div className="flex items-center gap-2">
          <span className="text-muted">Rows</span>
          {PER_PAGE.map((n) => (
            <Link key={n} href={href({ per: n === 25 ? undefined : String(n) })} className={`rounded-lg px-2.5 py-1 font-semibold ${per === n ? "bg-fg text-bg" : "bg-surface-2 text-muted"}`}>{n}</Link>
          ))}
          <span className="mx-2 h-5 w-px bg-border" />
          {page > 1 ? <Link href={href({ page: String(page - 1) })} className="btn btn-ghost !px-3 !py-1.5">Prev</Link> : <span className="btn btn-ghost !px-3 !py-1.5 opacity-40">Prev</span>}
          <span className="tabular-nums text-muted">{page} / {pages}</span>
          {page < pages ? <Link href={href({ page: String(page + 1) })} className="btn btn-ghost !px-3 !py-1.5">Next</Link> : <span className="btn btn-ghost !px-3 !py-1.5 opacity-40">Next</span>}
        </div>
      </div>
    </div>
  );
}
