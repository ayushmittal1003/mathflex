import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { requestNow } from "@/lib/time";
import { Badge, Card, PageHeader, Table, Td } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { AccessTarget } from "@/components/admin/AccessTarget";
import { BulkGrant } from "@/components/admin/BulkGrant";
import { revokeEntitlement } from "../actions";

export const metadata = { title: "Grant access" };

export default async function Access() {
  await requireStaff("access");
  const now = requestNow();
  const [chapters, courses, grants] = await Promise.all([
    db.chapter.findMany({ orderBy: [{ classLevel: "asc" }, { sortOrder: "asc" }], select: { id: true, title: true, classLevel: true } }),
    db.course.findMany({ select: { id: true, title: true } }),
    db.entitlement.findMany({
      where: { source: "admin" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { id: true, name: true, email: true } }, chapter: { select: { title: true } }, course: { select: { title: true } } },
    }),
  ]);
  const granters = new Map(
    (await db.user.findMany({ where: { id: { in: grants.map((g) => g.grantedById).filter((x): x is string => !!x) } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]),
  );
  return (
    <div className="space-y-6">
      <PageHeader title="Grant access" subtitle="Give students free access to chapters or courses. It shows up on their screen within about 20 seconds." />
      <Card title="Grant to many students at once">
        <BulkGrant>
          <label className="block text-sm"><span className="font-semibold">Chapter or course</span><div className="mt-1"><AccessTarget chapters={chapters} courses={courses} /></div></label>
        </BulkGrant>
        <p className="mt-4 text-xs text-muted">For one student, open their page under <Link href="/admin/students" className="underline">Students</Link>.</p>
      </Card>
      <div>
        <h2 className="mb-3 font-bold">Recent grants</h2>
        <Table head={["Student", "Access", "Granted by", "Note", "Expires", ""]} empty={!grants.length}>
          {grants.map((g) => {
            const expired = g.expiresAt.getTime() < now;
            return (
              <tr key={g.id} className="hover:bg-surface-2">
                <Td><Link href={`/admin/students/${g.user.id}`} className="hover:text-brand"><span className="block font-semibold">{g.user.name}</span><span className="text-xs text-muted">{g.user.email}</span></Link></Td>
                <Td>{g.chapter?.title ?? g.course?.title} {g.courseId && <Badge>course</Badge>}</Td>
                <Td className="text-sm">{g.grantedById ? granters.get(g.grantedById) ?? "Removed member" : "–"}</Td>
                <Td className="text-xs text-muted">{g.note || "–"}</Td>
                <Td className={`text-xs ${expired ? "text-bad" : "text-muted"}`}>{expired ? "Expired " : ""}{g.expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Td>
                <Td><ConfirmButton action={revokeEntitlement.bind(null, g.id)} message={`Revoke ${g.user.name}'s access? They lose it right away.`} className="!text-xs">Revoke</ConfirmButton></Td>
              </tr>
            );
          })}
        </Table>
      </div>
    </div>
  );
}
