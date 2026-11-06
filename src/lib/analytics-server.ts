import "server-only";
import { cookies, headers } from "next/headers";
import { db } from "./db";

export const isBot = (ua: string) => !ua || /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|vercel-screenshot|pingdom|uptime/i.test(ua);
export const deviceOf = (ua: string) => (/ipad|tablet|(android(?!.*mobile))/i.test(ua) ? "tablet" : /mobi|iphone|android/i.test(ua) ? "mobile" : "desktop");

// Server-side events (login, sign-up) joined to the visit through the analytics cookies. Best effort.
export async function trackServer(name: "login" | "sign_up", userId: string, label?: string) {
  try {
    const jar = await cookies();
    const vid = jar.get("mf_vid")?.value;
    const sid = jar.get("mf_sid")?.value;
    if (!vid || !sid) return;
    const h = await headers();
    const ua = h.get("user-agent") ?? "";
    if (isBot(ua)) return;
    await db.analyticsEvent.create({ data: { name, visitorId: vid.slice(0, 40), sessionId: sid.slice(0, 40), userId, label, device: deviceOf(ua), country: h.get("x-vercel-ip-country")?.slice(0, 2) || null } });
  } catch (e) {
    console.error("[track] server event failed:", (e as Error).message);
  }
}
