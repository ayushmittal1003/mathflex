import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { isStaff } from "@/lib/permissions";
import { GOOGLE_STATE_COOKIE, googleConfigured, googleProfileFromCode } from "@/lib/google";

const AVATAR_COLORS = ["#F43F5E", "#FB923C", "#8B5CF6", "#0EA5E9", "#10B981", "#EC4899", "#F59E0B"];
const base = () => process.env.APP_URL ?? "http://localhost:3000";
const back = (error: string, next: string) => NextResponse.redirect(new URL(`/login?error=${error}${next ? `&next=${encodeURIComponent(next)}` : ""}`, base()), 303);
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Step 2: Google sends the browser back with a code. Check the state, get the verified
// email, then log in the matching account or create one (same rules as email sign-up).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const [savedState = "", next = ""] = (jar.get(GOOGLE_STATE_COOKIE)?.value ?? "").split("|");
  jar.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });

  if (!googleConfigured()) return back("google_unavailable", next);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  if (url.searchParams.get("error")) return back("google_cancelled", next);
  if (!code || !savedState || !same(state, savedState)) return back("google_failed", next);

  const profile = await googleProfileFromCode(code).catch(() => null);
  if (!profile) return back("google_failed", next);

  let user = await db.user.findUnique({ where: { email: profile.email } });
  if (user?.isBlocked) return back("blocked", next);
  if (!user) {
    const settings = await getSettings();
    if (!settings.features.signupOpen) return back("signup_paused", next);
    user = await db.user.create({
      data: {
        name: profile.name.length >= 2 ? profile.name : profile.email.split("@")[0],
        email: profile.email,
        // Google accounts don't use a password; this random one is never shown or sent.
        passwordHash: await hashPassword(randomBytes(32).toString("hex")),
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      },
    });
  }

  await createSession(user.id, user.role);
  return NextResponse.redirect(new URL(next || (isStaff(user.role) ? "/admin" : "/my-learning"), base()), 303);
}
