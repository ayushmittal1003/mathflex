import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { startImpersonation } from "@/app/actions/impersonation";
import { Card, PageHeader, Table, Td } from "@/components/admin/ui";

export const metadata = { title: "View as student" };

export default async function Impersonation({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [, { q }] = await Promise.all([requireStaff("impersonate"), searchParams]);
  const [students, recent] = await Promise.all([
    q
      ? db.user.findMany({
          where: { role: "STUDENT", isBlocked: false, OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] },
          take: 20,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    db.auditLog.findMany({ where: { action: { startsWith: "impersonate." } }, orderBy: { createdAt: "desc" }, take: 25 }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="View as student" subtitle="See exactly what a student sees, to debug a problem they report. Every session is logged." />
      <Card>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>You&apos;re signed in as the student for up to an hour. A banner on every page takes you back.</li>
          <li>Anything you do, like answering a question or buying, is saved to <b className="text-fg">their</b> account. Look around; don&apos;t act for them.</li>
          <li>Team accounts and blocked students can&apos;t be viewed this way.</li>
        </ul>
        <form><input name="q" defaultValue={q} placeholder="Find a student by name, email or phone" className="input max-w-md" /></form>
        {q && (
          <ul className="mt-4 divide-y divide-border text-sm">
            {students.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <span className="grid size-9 place-items-center rounded-full text-sm font-bold text-white" style={{ background: s.avatarColor }}>{s.name[0]}</span>
                <Link href={`/admin/students/${s.id}`} className="min-w-0 flex-1 hover:text-brand"><span className="block font-semibold">{s.name}</span><span className="text-xs text-muted">{s.email}</span></Link>
                <form action={startImpersonation.bind(null, s.id)}><button className="btn btn-primary !px-3 !py-1.5 text-sm">View as {s.name.split(" ")[0]}</button></form>
              </li>
            ))}
            {!students.length && <li className="py-2 text-muted">No students match “{q}”.</li>}
          </ul>
        )}
      </Card>
      <div>
        <h2 className="mb-3 font-bold">Recent sessions</h2>
        <Table head={["When", "Who", "What"]} empty={!recent.length}>
          {recent.map((r) => (
            <tr key={r.id}>
              <Td className="whitespace-nowrap text-xs text-muted">{r.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</Td>
              <Td className="font-semibold">{r.actorName}</Td>
              <Td>{r.entityId ? <Link href={`/admin/students/${r.entityId}`} className="hover:text-brand">{r.summary}</Link> : r.summary}</Td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
