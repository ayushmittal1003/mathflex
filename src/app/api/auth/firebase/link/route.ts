import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, getImpersonator } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { allow } from "@/lib/rate-limit";
import { verifyFirebaseToken } from "@/lib/firebase";

const fail = (error: string, status = 400) => Response.json({ error }, { status });

// A signed-in student proves a mobile number with an OTP, so that number can log in to this account.
export async function POST(req: Request) {
  // Only our own page can send JSON here: another site's form can't, so it can't attach its number to this account.
  if (req.headers.get("content-type") !== "application/json") return fail("Bad request.");
  const user = await getCurrentUser();
  if (!user) return fail("Please log in again.", 401);
  if (await getImpersonator()) return fail("Students must verify their own number.", 403);
  // A team account stays behind its stronger login: a number alone must not open the admin panel.
  if (isStaff(user.role)) return fail("Team accounts can't log in with a mobile number.", 403);
  if (user.verifiedPhone) return fail("Your number is already verified.");
  if (!(await allow(`firebase-link:user:${user.id}`, 10, 3600))) return fail("Too many attempts. Please try again later.", 429);

  const body = (await req.json().catch(() => null)) as { idToken?: unknown } | null;
  const who = typeof body?.idToken === "string" ? await verifyFirebaseToken(body.idToken) : null;
  if (who?.provider !== "phone") return fail("We couldn't verify that number. Please try again.", 401);

  try {
    await db.user.update({ where: { id: user.id }, data: { verifiedPhone: who.phone, phone: who.phone.replace(/^\+91/, "") } });
  } catch {
    return fail("This number already has its own account. Contact support to combine them.", 409);
  }
  revalidatePath("/profile");
  return Response.json({ ok: true });
}
