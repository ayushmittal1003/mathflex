import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/format";
import { PageHeader, Table, Td, Badge, LinkButton } from "@/components/admin/ui";

export const metadata = { title: "Chapters" };

export default async function AdminChapters({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const { class: cls } = await searchParams;
  const chapters = await db.chapter.findMany({
    where: cls ? { classLevel: Number(cls) } : undefined,
    orderBy: [{ classLevel: "asc" }, { sortOrder: "asc" }],
    include: { _count: { select: { parts: true, questions: true, resources: true, entitlements: true } } },
  });
  return (
    <div>
      <PageHeader title="Chapters & content" subtitle="Prices, parts, videos, DPPs, PYQs, notes and mind maps." action={<LinkButton href="/admin/chapters/new" primary>+ New chapter</LinkButton>} />
      <div className="mb-4 flex gap-2 text-sm font-semibold">
        {[["", "All"], ["11", "Class 11"], ["12", "Class 12"]].map(([v, l]) => (
          <Link key={v} href={v ? `/admin/chapters?class=${v}` : "/admin/chapters"} className={`rounded-full px-3 py-1.5 ${cls === v || (!cls && !v) ? "bg-fg text-bg" : "bg-surface-2 text-muted"}`}>{l}</Link>
        ))}
      </div>
      <Table head={["Chapter", "Class", "Price", "Parts", "Questions", "Notes", "Sold", "Status"]} empty={!chapters.length}>
        {chapters.map((c) => (
          <tr key={c.id} className="hover:bg-surface-2">
            <Td>
              <Link href={`/admin/chapters/${c.id}`} className="flex items-center gap-3 font-semibold hover:text-brand">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${c.coverFrom}, ${c.coverTo})` }}>{c.symbol.slice(0, 3)}</span>
                {c.title}
              </Link>
            </Td>
            <Td>{c.classLevel}</Td>
            <Td><span className="font-semibold">{inr(c.price)}</span> <span className="text-xs text-muted line-through">{inr(c.mrp)}</span></Td>
            <Td>{c._count.parts}</Td>
            <Td>{c._count.questions}</Td>
            <Td>{c._count.resources}</Td>
            <Td>{c._count.entitlements}</Td>
            <Td>
              <div className="flex flex-wrap gap-1">
                {c.isPublished ? <Badge tone="ok">Live</Badge> : <Badge>Hidden</Badge>}
                {c.isTrending && <Badge tone="brand">Trending</Badge>}
                {c.isFeatured && <Badge tone="gold">Featured</Badge>}
              </div>
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
