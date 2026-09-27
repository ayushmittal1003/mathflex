import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, Table, Td, Badge } from "@/components/admin/ui";

export const metadata = { title: "Students" };

export default async function Students({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const users = await db.user.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { entitlements: true, orders: { where: { status: "PAID" } } } } },
  });
  return (
    <div>
      <PageHeader title="Students" subtitle={`${users.length}${users.length === 200 ? "+" : ""} accounts`} />
      <form className="mb-4"><input name="q" defaultValue={q} placeholder="Search name, email or phone" className="input max-w-sm" /></form>
      <Table head={["Student", "Class", "XP", "Streak", "Plans", "Paid orders", "Joined"]} empty={!users.length}>
        {users.map((u) => (
          <tr key={u.id} className="hover:bg-surface-2">
            <Td>
              <Link href={`/admin/students/${u.id}`} className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full text-sm font-bold text-white" style={{ background: u.avatarColor }}>{u.name[0]}</span>
                <span><span className="block font-semibold hover:text-brand">{u.name}</span><span className="text-xs text-muted">{u.email}{u.phone ? ` · ${u.phone}` : ""}</span></span>
                {u.role === "ADMIN" && <Badge tone="brand">Admin</Badge>}
                {u.isBlocked && <Badge tone="bad">Blocked</Badge>}
              </Link>
            </Td>
            <Td>{u.classLevel === 13 ? "Dropper" : u.classLevel ?? "–"}</Td>
            <Td>{u.xp.toLocaleString("en-IN")}</Td>
            <Td>{u.streak}</Td>
            <Td>{u._count.entitlements}</Td>
            <Td>{u._count.orders}</Td>
            <Td className="text-xs text-muted">{u.createdAt.toLocaleDateString("en-IN")}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
