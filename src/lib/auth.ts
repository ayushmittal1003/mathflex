import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { can, isStaff, type Permission } from "./permissions";

const COOKIE = "mf_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (32+ chars)");
  return new TextEncoder().encode(s);
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function signSession(userId: string, role: string, maxAge = MAX_AGE) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(secret());
}

export async function setSessionCookie(token: string, maxAge = MAX_AGE, name = COOKIE) {
  (await cookies()).set(name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function createSession(userId: string, role: string) {
  await setSessionCookie(await signSession(userId, role));
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
  jar.delete(IMPERSONATOR_COOKIE);
}

export async function readSessionToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { userId: payload.sub as string, role: payload.role as string };
  } catch {
    return null;
  }
}

// The signed-in user, fresh from the DB (so blocking / role changes apply immediately).
export const getCurrentUser = cache(async () => {
  const session = await readSessionToken((await cookies()).get(COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.isBlocked) return null;
  return user;
});

export async function requireUser(next = "/") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

// Any team member (super admin, editor, support). Pass a permission to also require it.
// Used by admin pages and by every admin server action (those are public endpoints).
export async function requireStaff(permission?: Permission) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  // Signed in as a non-staff account (e.g. a student): let them switch accounts.
  if (!isStaff(user.role)) redirect("/login?next=/admin");
  if (permission && !can(user.role, permission)) redirect(`/admin/no-access?need=${permission}`);
  return user;
}

export const SESSION_COOKIE = COOKIE;
// While a super admin views the site as a student, their own session waits here.
export const IMPERSONATOR_COOKIE = "mf_impersonator";

// When a super admin is viewing the site as a student, who they really are.
export const getImpersonator = cache(async () => {
  const session = await readSessionToken((await cookies()).get(IMPERSONATOR_COOKIE)?.value);
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true } });
});
