import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/format";
import { PageHeader, Table, Td, Badge, LinkButton } from "@/components/admin/ui";

export const metadata = { title: "Courses" };

export default async function AdminCourses() {
  const courses = await db.course.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { chapters: true, entitlements: true } } } });
  return (
    <div>
      <PageHeader title="Courses (bundles)" subtitle="Complete Class 11, Class 12, combos — any set of chapters at one price." action={<LinkButton href="/admin/courses/new" primary>+ New course</LinkButton>} />
      <Table head={["Course", "Chapters", "Price", "Validity", "Sold", "Status"]} empty={!courses.length}>
        {courses.map((c) => (
          <tr key={c.id} className="hover:bg-surface-2">
            <Td><Link href={`/admin/courses/${c.id}`} className="font-semibold hover:text-brand">{c.title}</Link></Td>
            <Td>{c._count.chapters}</Td>
            <Td><span className="font-semibold">{inr(c.price)}</span> <span className="text-xs text-muted line-through">{inr(c.mrp)}</span></Td>
            <Td>{c.validityDays} days</Td>
            <Td>{c._count.entitlements}</Td>
            <Td>{c.isPublished ? <Badge tone="ok">Live</Badge> : <Badge>Hidden</Badge>}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
