import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { requestNow } from "@/lib/time";
import { ACTION_LABEL } from "@/lib/audit";
import { STAFF_ROLES } from "@/lib/permissions";
import { Badge, PageHeader, Table, Td } from "@/components/admin/ui";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Activity log" };

type Search = { actor?: string; area?: string; q?: string; range?: string; page?: string };
const PAGE = 50;
const RANGES: Record<string, [string, number | null]> = { "1": ["Today", 1], "7": ["7 days", 7], "30": ["30 days", 30], all: ["All time", null] };

// Where a log entry's target lives in the admin, so rows can link to it.
function targetHref(entity: string, id: string | null, meta: unknown) {
  if (entity === "user" && id) return `/admin/students/${id}`;
  if (entity === "chapter" && id) return `/admin/chapters/${id}`;
  if (entity === "question") {
    const chapterId = (meta as { chapterId?: string } | null)?.chapterId;
    return chapterId ? `/admin/chapters/${chapterId}?tab=questions` : "/admin/questions";
  }
  if (entity === "course") return id ? `/admin/courses/${id}` : "/admin/courses";
  if (entity === "coupon") return "/admin/coupons";
  if (entity === "banner") return "/admin/banners";
  if (entity === "flexcare") return "/admin/flexcare";
  if (entity === "settings") return "/admin/settings";
  if (entity === "team") return "/admin/team";
  return null;
}

const TONE: Record<string, "ok" | "bad" | "gold" | "brand" | "muted"> = {
  delete: "bad", revoke: "bad", block: "bad", refund: "bad", remove: "bad", hide: "gold",
  create: "ok", grant: "ok", publish: "ok", join: "ok", markPaid: "ok", invite: "brand", role: "brand", start: "gold", stop: "muted",
};

export default async function AuditLog({ searchParams }: { searchParams: Promise<Search> }) {
  const [, sp] = await Promise.all([requireStaff("audit"), searchParams]);
  const days = RANGES[sp.range ?? "30"]?.[1] ?? null;
  const where: Prisma.AuditLogWhereInput = {
    ...(sp.actor ? { actorId: sp.actor } : {}),
    ...(sp.area ? { action: { startsWith: `${sp.area}.` } } : {}),
    ...(sp.q ? { summary: { contains: sp.q, mode: "insensitive" } } : {}),
    ...(days ? { createdAt: { gte: new Date(requestNow() - days * 86_400_000) } } : {}),
  };
  const page = Math.max(1, Number(sp.page) || 1);
  const [rows, total, staff, today] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    db.auditLog.count({ where }),
    db.user.findMany({ where: { OR: [{ role: { in: STAFF_ROLES } }, { auditLogs: { some: {} } }] }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.auditLog.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (patch: Partial<Search>) => {
    const qs = new URLSearchParams(Object.entries({ ...sp, page: undefined, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/audit${qs.size ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Activity log" subtitle={`Every change made in the admin panel · ${today} today`} />

      <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <input name="q" defaultValue={sp.q} placeholder="Search, e.g. a student's email or a chapter" className="input" />
        <select name="actor" defaultValue={sp.actor ?? ""} className="input">
          <option value="">Anyone</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select name="area" defaultValue={sp.area ?? ""} className="input">
          <option value="">All areas</option>
          {Object.entries(ACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="range" defaultValue={sp.range ?? "30"} className="input">
          {Object.entries(RANGES).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <button className="btn btn-primary !py-2 text-sm">Filter</button>
      </form>

      <Table head={["When", "Who", "Area", "What happened", ""]} empty={!rows.length}>
        {rows.map((r) => {
          const [area, verb = ""] = r.action.split(".");
          const link = targetHref(r.entity, r.entityId, r.meta);
          return (
            <tr key={r.id} className="hover:bg-surface-2">
              <Td className="whitespace-nowrap text-xs text-muted">
                {r.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </Td>
              <Td>
                <span className="block font-semibold">{r.actorName}</span>
                <span className="text-xs text-muted">{r.actorEmail}</span>
              </Td>
              <Td><Badge tone={TONE[verb] ?? "muted"}>{ACTION_LABEL[area] ?? area}</Badge></Td>
              <Td className="max-w-xl">{r.summary}</Td>
              <Td>{link && <Link href={link} className="text-sm font-bold text-brand">Open</Link>}</Td>
            </tr>
          );
        })}
      </Table>

      <div className="flex items-center justify-between text-sm">
        <p className="text-muted">{total.toLocaleString("en-IN")} entries</p>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            {page > 1 && <Link href={href({ page: String(page - 1) })} className="btn btn-ghost !px-3 !py-1.5">Prev</Link>}
            <span className="tabular-nums text-muted">{page} / {pages}</span>
            {page < pages && <Link href={href({ page: String(page + 1) })} className="btn btn-ghost !px-3 !py-1.5">Next</Link>}
          </div>
        )}
      </div>
    </div>
  );
}
