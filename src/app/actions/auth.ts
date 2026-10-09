"use server";
import { redirect } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { allow, clientIp } from "@/lib/rate-limit";

// Compared against when the email is unknown, so response time doesn't reveal which emails have accounts.
const DUMMY_HASH = "$2b$10$X3JZmmyNzQ2K5OUExlckcOK3FKv/I0h5pE17c4UW/Nym6beKJfdJa";

export type AuthState = { error?: string } | undefined;

const AVATAR_COLORS = ["#F43F5E", "#FB923C", "#8B5CF6", "#0EA5E9", "#10B981", "#EC4899", "#F59E0B"];

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "/";
  return n.startsWith("/") && !n.startsWith("//") && !n.includes("\\") ? n : "/";
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const ip = await clientIp();
  // 8 tries per email and 30 per address every 15 minutes, whether or not the email exists.
  if (!(await allow(`login:e:${email}`, 8, 900)) || !(await allow(`login:ip:${ip}`, 30, 900))) {
    return { error: "Too many attempts. Please wait 15 minutes and try again." };
  }
  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return { error: "Wrong email or password." };
  if (user.isBlocked) return { error: "This account is suspended. Please contact support." };
  await createSession(user.id, user.role);
  const next = safeNext(form.get("next"));
  // Team members signing in from the plain login page go straight to the admin panel.
  redirect(isStaff(user.role) && next === "/" ? "/admin" : next);
}

const SignupSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  classLevel: z.coerce.number().int().min(11).max(13).optional(),
});

export async function signup(_: AuthState, form: FormData): Promise<AuthState> {
  const settings = await getSettings();
  if (!settings.features.signupOpen) return { error: "New sign-ups are paused right now." };
  if (!(await allow(`signup:ip:${await clientIp()}`, 10, 3600))) return { error: "Too many sign-ups from this network. Please try again later." };
  const parsed = SignupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, phone, password, classLevel } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { error: "An account with this email already exists. Try logging in." };
  const user = await db.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      classLevel,
      passwordHash: await hashPassword(password),
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    },
  });
  await createSession(user.id, user.role);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
