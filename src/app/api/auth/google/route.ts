import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GOOGLE_STATE_COOKIE, googleAuthUrl, googleConfigured } from "@/lib/google";

const base = () => process.env.APP_URL ?? "http://localhost:3000";
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") && !n.includes("\\") ? n : "");

// Step 1: remember a one-time state (and where to go after) in a short-lived cookie, then
// send the browser to Google's account picker.
export async function GET(req: Request) {
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  if (!googleConfigured()) return NextResponse.redirect(new URL(`/login?error=google_unavailable${next ? `&next=${encodeURIComponent(next)}` : ""}`, base()), 303);
  const state = randomBytes(24).toString("base64url");
  (await cookies()).set(GOOGLE_STATE_COOKIE, `${state}|${next}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return NextResponse.redirect(googleAuthUrl(state), 303);
}
