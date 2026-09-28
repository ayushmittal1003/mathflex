"use server";
// Team & roles: invite staff, change roles, remove people. Super admins only.
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ROLE_LABEL, STAFF_ROLES, type StaffRole } from "@/lib/permissions";
import { str } from "@/lib/form";

const INVITE_DAYS = 7;
const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const parseRole = (v: string): StaffRole | null => (STAFF_ROLES.includes(v as StaffRole) ? (v as StaffRole) : null);

// There must always be at least one super admin who can manage the team.
async function assertKeepsASuperAdmin(userId: string, nextRole: string) {
  if (nextRole === "ADMIN") return;
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (u.role !== "ADMIN") return;
  const others = await db.user.count({ where: { role: "ADMIN", isBlocked: false, id: { not: userId } } });
  if (!others) throw new Error("Keep at least one super admin on the team.");
}

export type InviteState = { ok?: string; link?: string; error?: string } | undefined;

export async function inviteMember(_: InviteState, form: FormData): Promise<InviteState> {
  const me = await requireStaff("team");
  const email = str(form, "email").toLowerCase();
  const role = parseRole(str(form, "role"));
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email." };
  if (!role) return { error: "Pick a role." };

  // Existing account: promote straight away.
  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    if (user.id === me.id) return { error: "You can't change your own role." };
    await assertKeepsASuperAdmin(user.id, role);
    await db.user.update({ where: { id: user.id }, data: { role } });
    await audit(me, "team.role", `Made ${user.name} (${email}) ${ROLE_LABEL[role]}`, { entity: "user", id: user.id, meta: { from: user.role, to: role } });
    revalidatePath("/admin/team");
    return { ok: `${user.name} already has an account, so they're now ${ROLE_LABEL[role]}. They'll see the admin panel on their next page load.` };
  }

  // No account yet: create a one-time link they use to sign up.
  await db.staffInvite.updateMany({ where: { email, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
  const token = randomBytes(24).toString("base64url");
  await db.staffInvite.create({ data: { email, role, token, invitedById: me.id, expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000) } });
  await audit(me, "team.invite", `Invited ${email} as ${ROLE_LABEL[role]}`, { entity: "team", meta: { email, role } });
  revalidatePath("/admin/team");
  return { ok: `Invite created. Send this link to ${email}; it works for ${INVITE_DAYS} days.`, link: `${appUrl()}/invite/${token}` };
}

export async function changeRole(form: FormData) {
  const me = await requireStaff("team");
  const userId = str(form, "userId");
  const role = str(form, "role") === "STUDENT" ? "STUDENT" : parseRole(str(form, "role"));
  if (!role || userId === me.id) return;
  await assertKeepsASuperAdmin(userId, role);
  const u = await db.user.update({ where: { id: userId }, data: { role } });
  await audit(me, role === "STUDENT" ? "team.remove" : "team.role", role === "STUDENT" ? `Removed ${u.name} (${u.email}) from the team` : `Changed ${u.name}'s role to ${ROLE_LABEL[role]}`, { entity: "user", id: userId, meta: { to: role } });
  revalidatePath("/admin/team");
  revalidatePath(`/admin/students/${userId}`);
}

export async function revokeInvite(id: string) {
  const me = await requireStaff("team");
  const inv = await db.staffInvite.update({ where: { id }, data: { revokedAt: new Date() } });
  await audit(me, "team.inviteRevoke", `Revoked invite for ${inv.email}`, { entity: "team", meta: { email: inv.email } });
  revalidatePath("/admin/team");
}

// Fresh token + another 7 days, for an invite that expired or got lost.
export async function renewInvite(id: string) {
  const me = await requireStaff("team");
  const token = randomBytes(24).toString("base64url");
  const inv = await db.staffInvite.update({ where: { id }, data: { token, revokedAt: null, expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000) } });
  await audit(me, "team.inviteRenew", `Renewed invite for ${inv.email}`, { entity: "team", meta: { email: inv.email } });
  revalidatePath("/admin/team");
  return `${appUrl()}/invite/${token}`;
}
