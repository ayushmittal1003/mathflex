"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, getCurrentUser, hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ROLE_LABEL } from "@/lib/permissions";
import { findOpenInvite } from "@/lib/invites";

// Signed in with the invited email: take the role.
export async function acceptInvite(token: string) {
  const inv = await findOpenInvite(token);
  const user = await getCurrentUser();
  if (!inv || !user || user.email !== inv.email) redirect(`/invite/${token}`);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { role: inv.role } }),
    db.staffInvite.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } }),
  ]);
  await audit(user, "team.join", `${user.name} accepted the invite and joined as ${ROLE_LABEL[inv.role]}`, { entity: "user", id: user.id });
  redirect("/admin");
}

export type InviteSignupState = { error?: string } | undefined;

// No account yet: create one with the invited email and role.
export async function signupWithInvite(token: string, _: InviteSignupState, form: FormData): Promise<InviteSignupState> {
  const inv = await findOpenInvite(token);
  if (!inv) return { error: "This invite has expired or was revoked. Ask for a new one." };
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (name.length < 2) return { error: "Please enter your name." };
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };
  if (await db.user.findUnique({ where: { email: inv.email } })) return { error: "An account with this email already exists. Log in, then open this link again." };
  const user = await db.user.create({ data: { name, email: inv.email, passwordHash: await hashPassword(password), role: inv.role, avatarColor: "#8B5CF6" } });
  await db.staffInvite.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
  await audit(user, "team.join", `${name} created an account from an invite and joined as ${ROLE_LABEL[inv.role]}`, { entity: "user", id: user.id });
  await createSession(user.id, user.role);
  redirect("/admin");
}
