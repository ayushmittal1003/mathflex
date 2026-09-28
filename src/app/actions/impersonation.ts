"use server";
// "View as student": a super admin temporarily signs in as a student to see exactly
// what they see. Their own session waits in a separate cookie until they return.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { IMPERSONATOR_COOKIE, SESSION_COOKIE, getCurrentUser, readSessionToken, requireStaff, setSessionCookie, signSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { can } from "@/lib/permissions";

const HOUR = 60 * 60;

export async function startImpersonation(userId: string) {
  const me = await requireStaff("impersonate");
  const target = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (target.role !== "STUDENT") throw new Error("You can only view the site as a student.");
  if (target.isBlocked) throw new Error("This account is blocked.");
  const jar = await cookies();
  const own = jar.get(SESSION_COOKIE)?.value;
  if (!own) redirect("/login?next=/admin");
  await setSessionCookie(own, 2 * HOUR, IMPERSONATOR_COOKIE);
  await setSessionCookie(await signSession(target.id, target.role, HOUR), HOUR);
  await audit(me, "impersonate.start", `Started viewing the site as ${target.name} (${target.email})`, { entity: "user", id: target.id });
  redirect("/my-learning");
}

export async function stopImpersonation() {
  const jar = await cookies();
  const adminToken = jar.get(IMPERSONATOR_COOKIE)?.value;
  const admin = adminToken ? await readSessionToken(adminToken) : null;
  const adminUser = admin ? await db.user.findUnique({ where: { id: admin.userId } }) : null;
  const student = await getCurrentUser();
  jar.delete(IMPERSONATOR_COOKIE);
  if (!adminToken || !adminUser || adminUser.isBlocked || !can(adminUser.role, "impersonate")) {
    jar.delete(SESSION_COOKIE);
    redirect("/login?next=/admin");
  }
  await setSessionCookie(adminToken);
  if (student) await audit(adminUser, "impersonate.stop", `Stopped viewing the site as ${student.name}`, { entity: "user", id: student.id });
  redirect(student ? `/admin/students/${student.id}` : "/admin");
}
