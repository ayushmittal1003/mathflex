import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { isStaff } from "@/lib/permissions";
import { appHref, STUDENT_HOME } from "@/lib/hosts";
import { allow, clientIp } from "@/lib/rate-limit";
import { verifyFirebaseToken } from "@/lib/firebase";
import { phoneOnlyEmail } from "@/lib/format";

const AVATAR_COLORS = ["#F43F5E", "#FB923C", "#8B5CF6", "#0EA5E9", "#10B981", "#EC4899", "#F59E0B"];
const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") && !n.includes("\\") ? n : "");
const fail = (error: string, status = 400) => Response.json({ error }, { status });

const newAccount = async (data: { name: string; email: string; phone?: string; verifiedPhone?: string }) =>
  db.user.create({
    data: {
      ...data,
      // These accounts don't use a password; this random one is never shown or sent.
      passwordHash: await hashPassword(randomBytes(32).toString("hex")),
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    },
  });

// The browser finished Google or OTP sign-in with Firebase and sends the ID token here.
// Log in the matching account or create one, then start our normal session.
export async function POST(req: Request) {
  if (!(await allow(`firebase-login:ip:${await clientIp()}`, 30, 600))) return fail("Too many attempts. Please try again in a few minutes.", 429);
  const body = (await req.json().catch(() => null)) as { idToken?: unknown; name?: unknown; next?: unknown } | null;
  if (typeof body?.idToken !== "string") return fail("We couldn't sign you in. Please try again.");
  const who = await verifyFirebaseToken(body.idToken);
  if (!who) return fail("We couldn't sign you in. Please try again.", 401);

  // An OTP proves the number, so it only opens an account whose number was proven the same way, never
  // the unverified "phone" someone typed in, which could be another person's number.
  const find = () => (who.provider === "google" ? db.user.findUnique({ where: { email: who.email } }) : db.user.findUnique({ where: { verifiedPhone: who.phone } }));
  let user = await find();
  if (user?.isBlocked) return fail("This account is suspended. Please contact support.", 403);

  if (!user) {
    if (!(await getSettings()).features.signupOpen) return fail("New sign-ups are paused right now. Existing accounts can still log in.", 403);
    let name = who.provider === "google" ? who.name : typeof body.name === "string" ? body.name.trim() : "";
    if (who.provider === "phone" && (name.length < 2 || name.length > 60)) return Response.json({ needName: true });
    if (who.provider === "google" && name.length < 2) name = who.email.split("@")[0];
    try {
      user = await newAccount(
        who.provider === "google"
          ? { name, email: who.email }
          : { name, email: phoneOnlyEmail(who.phone), phone: who.phone.replace(/^\+91/, ""), verifiedPhone: who.phone },
      );
    } catch {
      // Two tabs signing up at once: the other one won, so use its account.
      user = await find();
      if (!user) return fail("We couldn't create your account. Please try again.", 500);
    }
  }

  await createSession(user.id, user.role);
  const dest = safeNext(body.next);
  return Response.json({ redirect: appHref(dest && dest !== "/" ? dest : isStaff(user.role) ? "/admin" : STUDENT_HOME) });
}
