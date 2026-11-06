import { cookies, headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { IMPERSONATOR_COOKIE, SESSION_COOKIE, readSessionToken } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { allow, clientIp } from "@/lib/rate-limit";
import { deviceOf, isBot } from "@/lib/analytics-server";

const Id = z.string().regex(/^[A-Za-z0-9_-]{8,40}$/);
const Text = (max: number) => z.string().max(max).optional();
const Body = z.object({
  vid: Id,
  sid: Id,
  events: z.array(z.object({
    name: z.string().regex(/^[a-z_]{2,40}$/),
    path: z.string().max(300).regex(/^\//),
    label: Text(120),
    ms: z.number().int().min(0).max(3_600_000).optional(),
    source: Text(100),
    medium: Text(100),
    campaign: Text(100),
  })).min(1).max(50),
});

const ok = () => new Response(null, { status: 204 });

// Collects batches from lib/track.ts. Never fails loudly: analytics must not break the site. Team
// members, "view as student" sessions and bots are left out so they don't skew the numbers.
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 32_000) return ok();
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  if (isBot(ua)) return ok();
  const jar = await cookies();
  if (jar.get(IMPERSONATOR_COOKIE)) return ok();
  const session = await readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (session && isStaff(session.role)) return ok();

  let parsed;
  try {
    parsed = Body.safeParse(JSON.parse(raw));
  } catch {
    return ok();
  }
  if (!parsed.success) return ok();
  if (!(await allow(`track:ip:${await clientIp()}`, 600, 600))) return ok();

  const { vid, sid, events } = parsed.data;
  const device = deviceOf(ua);
  const country = h.get("x-vercel-ip-country")?.slice(0, 2) || null;
  await db.analyticsEvent
    .createMany({ data: events.map((e) => ({ ...e, visitorId: vid, sessionId: sid, userId: session?.userId ?? null, device, country })) })
    .catch((e) => console.error("[track] insert failed:", (e as Error).message));
  // Housekeeping now and then: raw events are kept for 180 days.
  if (Math.random() < 0.005) await db.analyticsEvent.deleteMany({ where: { at: { lt: new Date(Date.now() - 180 * 86_400_000) } } }).catch(() => {});
  return ok();
}
