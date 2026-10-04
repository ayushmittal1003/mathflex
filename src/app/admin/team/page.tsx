import { appUrl as getAppUrl } from "@/lib/app-url";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { requestNow } from "@/lib/time";
import { PERMISSIONS, ROLE_BLURB, ROLE_LABEL, ROLE_PERMISSIONS, STAFF_ROLES, type Permission, type StaffRole } from "@/lib/permissions";
import { Badge, Card, PageHeader, Table, Td } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { CopyButton, InviteForm, RenewInvite, RoleSelect } from "@/components/admin/TeamControls";
import { revokeInvite } from "./actions";

export const metadata = { title: "Team & roles" };

type Search = { role?: string; q?: string };

export default async function Team({ searchParams }: { searchParams: Promise<Search> }) {
  const [me, sp] = await Promise.all([requireStaff("team"), searchParams]);
  const now = requestNow();
  const appUrl = getAppUrl();
  const [members, invites] = await Promise.all([
    db.user.findMany({ where: { role: { in: STAFF_ROLES } }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] }),
    db.staffInvite.findMany({ where: { acceptedAt: null, revokedAt: null }, orderBy: { createdAt: "desc" }, include: { invitedBy: { select: { name: true } } } }),
  ]);
  const role = STAFF_ROLES.includes(sp.role as StaffRole) ? (sp.role as StaffRole) : null;
  const q = sp.q?.trim().toLowerCase();
  const match = (name: string, email: string) => !q || name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  const shownMembers = members.filter((m) => (!role || m.role === role) && match(m.name, m.email));
  const shownInvites = invites.filter((i) => (!role || i.role === role) && match("", i.email));
  const pending = invites.filter((i) => i.expiresAt.getTime() > now).length;
  const count = (r: StaffRole) => members.filter((m) => m.role === r).length;
  const href = (patch: Search) => {
    const qs = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/team${qs.size ? `?${qs}` : ""}`;
  };
  const chip = (active: boolean) => `flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${active ? "border-brand bg-brand/5 text-brand" : "border-border text-muted hover:text-fg"}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Team & roles" subtitle={`${members.length} members · ${pending} invite${pending === 1 ? "" : "s"} pending`} />

      <Card title="Invite a member">
        <InviteForm />
        <p className="mt-3 text-xs text-muted">If the email already has a MathFlex account, they get the role immediately. Otherwise you get a 7-day sign-up link to share with them.</p>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href={href({ role: undefined })} className={chip(!role)}>All <span className="text-xs opacity-70">{members.length}</span></Link>
          {STAFF_ROLES.map((r) => (
            <Link key={r} href={href({ role: r })} className={chip(role === r)}>{ROLE_LABEL[r]} <span className="text-xs opacity-70">{count(r)}</span></Link>
          ))}
        </div>
        <form className="w-full sm:w-72">
          {role && <input type="hidden" name="role" value={role} />}
          <input name="q" defaultValue={sp.q} placeholder="Search by name or email" className="input" />
        </form>
      </div>

      <Table head={["Member", "Email", "Role", "Status", "Joined", "Last active", ""]} empty={!shownMembers.length && !shownInvites.length}>
        {shownMembers.map((m) => (
          <tr key={m.id} className="hover:bg-surface-2">
            <Td>
              <Link href={`/admin/students/${m.id}`} className="flex items-center gap-3 font-semibold hover:text-brand">
                <span className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: m.avatarColor }}>{m.name[0]}</span>
                {m.name}{m.id === me.id && <span className="text-xs font-normal text-muted">(you)</span>}
              </Link>
            </Td>
            <Td className="text-muted">{m.email}</Td>
            <Td>{m.id === me.id ? <Badge tone="brand">{ROLE_LABEL[m.role]}</Badge> : <RoleSelect userId={m.id} role={m.role} />}</Td>
            <Td>{m.isBlocked ? <Badge tone="bad">Blocked</Badge> : <Badge tone="ok">Active</Badge>}</Td>
            <Td className="text-xs text-muted">{m.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Td>
            <Td className="text-xs text-muted">{m.lastActiveOn ? m.lastActiveOn.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "–"}</Td>
            <Td />
          </tr>
        ))}
        {shownInvites.map((i) => {
          const expired = i.expiresAt.getTime() <= now;
          return (
            <tr key={i.id} className="hover:bg-surface-2">
              <Td>
                <span className="flex items-center gap-3 text-muted">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-dashed border-border text-sm font-bold">{i.email[0].toUpperCase()}</span>
                  Invited{i.invitedBy ? ` by ${i.invitedBy.name}` : ""}
                </span>
              </Td>
              <Td className="text-muted">{i.email}</Td>
              <Td><Badge>{ROLE_LABEL[i.role]}</Badge></Td>
              <Td>{expired ? <Badge tone="bad">Expired</Badge> : <Badge tone="gold">Pending</Badge>}</Td>
              <Td className="text-xs text-muted">{i.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Td>
              <Td className="text-xs text-muted">{expired ? "–" : `until ${i.expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}</Td>
              <Td>
                <div className="flex justify-end gap-1.5">
                  {expired ? <RenewInvite id={i.id} /> : <CopyButton text={`${appUrl}/invite/${i.token}`} />}
                  <ConfirmButton action={revokeInvite.bind(null, i.id)} message={`Revoke the invite for ${i.email}?`} className="!text-xs">Revoke</ConfirmButton>
                </div>
              </Td>
            </tr>
          );
        })}
      </Table>

      <Card title="What each role can do">
        <div className="grid gap-3 sm:grid-cols-3">
          {STAFF_ROLES.map((r) => (
            <div key={r} className="rounded-xl bg-surface-2 p-3 text-sm">
              <p className="font-bold">{ROLE_LABEL[r]}</p>
              <p className="text-muted">{ROLE_BLURB[r]}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr><th className="py-2 font-semibold">Area</th>{STAFF_ROLES.map((r) => <th key={r} className="py-2 text-center font-semibold">{ROLE_LABEL[r]}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(Object.keys(PERMISSIONS) as Permission[]).map((p) => (
                <tr key={p}>
                  <td className="py-2">{PERMISSIONS[p]}</td>
                  {STAFF_ROLES.map((r) => (
                    <td key={r} className="py-2 text-center">
                      {ROLE_PERMISSIONS[r].includes(p) ? <Check className="mx-auto size-4 text-ok" aria-label="Allowed" /> : <Minus className="mx-auto size-4 text-muted" aria-label="Not allowed" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
