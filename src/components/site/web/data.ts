import "server-only";
import { db } from "@/lib/db";
import { requestNow } from "@/lib/time";
import type { Settings } from "@/lib/settings";
import { activeEntitlements } from "@/lib/access";
import { isStaff } from "@/lib/permissions";

// Read-only lookups shared by the redesigned pages. Same filters the existing code uses.

// The first public, active coupon (admin-managed), for "New here? Use CODE" lines.
export async function getPublicCoupon(settings: Settings) {
  if (!settings.features.coupons) return null;
  const now = new Date(requestNow());
  return db.coupon.findFirst({
    where: { isPublic: true, isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] },
    orderBy: { createdAt: "asc" },
    select: { code: true, description: true },
  });
}

// Weekly XP ranking (same query as the leaderboard page), first name + initial.
export async function weeklyLeaders(now: Date) {
  const since = new Date(now.getTime() - 7 * 86_400_000);
  const grouped = await db.xpEvent.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: since }, user: { role: "STUDENT", isBlocked: false } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 8,
  });
  const users = await db.user.findMany({ where: { id: { in: grouped.map((g) => g.userId) } }, select: { id: true, name: true, avatarColor: true } });
  const byId = new Map(users.map((u) => [u.id, u]));
  return grouped
    .filter((g) => byId.has(g.userId))
    .map((g) => {
      const u = byId.get(g.userId)!;
      const [first, last] = u.name.split(" ");
      return { id: u.id, name: last ? `${first} ${last[0]}.` : first, avatarColor: u.avatarColor, xp: g._sum.amount ?? 0 };
    });
}

// Data for the "Inside Mathflex" dashboard mock-up: real chapters, notes and weekly ranking.
export async function getInsideData(settings: Settings) {
  const [chapters, resources, leaders] = await Promise.all([
    db.chapter.findMany({
      where: { isPublished: true, parts: { some: {} } },
      orderBy: [{ classLevel: "asc" }, { sortOrder: "asc" }],
      take: 2,
      select: { id: true, slug: true, title: true, classLevel: true, price: true, mrp: true, coverFrom: true, coverTo: true, symbol: true, jeeWeightage: true, parts: { orderBy: { order: "asc" }, select: { id: true, order: true, title: true, durationSec: true, isFreePreview: true, watchThreshold: true } } },
    }),
    db.resource.findMany({ where: { isPublished: true }, orderBy: { createdAt: "asc" }, take: 3, select: { title: true, type: true } }),
    settings.features.leaderboard ? weeklyLeaders(new Date(requestNow())) : Promise.resolve([]),
  ]);
  return { chapters: chapters.map((c) => ({ ...c, hasFreePart: false, previewSrc: null })), resources, leaders };
}

// Brand panel on log in / sign up: a few real chapters and live proof points.
export async function getAuthPanel(settings: Settings) {
  const [rows, min, free] = await Promise.all([
    db.chapter.findMany({ where: { isPublished: true }, orderBy: [{ jeeWeightage: "desc" }], take: 3, select: { title: true, symbol: true, coverFrom: true, coverTo: true } }),
    db.chapter.aggregate({ where: { isPublished: true }, _min: { price: true } }),
    settings.features.freePreviews ? db.part.count({ where: { isFreePreview: true, chapter: { isPublished: true } } }) : Promise.resolve(0),
  ]);
  const tagline = [
    ...(free > 0 ? ["Part 1 free"] : []),
    ...(min._min.price != null ? [`From ₹${min._min.price.toLocaleString("en-IN")} a chapter`] : []),
    "Taught by an IIT Delhi alumnus",
  ];
  return { rows, tagline };
}

// Props for the site nav: the signed-in student's account summary (same plan line as the
// original account menu), the feature switches and support contacts.
export async function getSiteNavProps(
  user: { id: string; name: string; email: string; avatarColor: string; role: string; xp: number; streak: number } | null,
  settings: Settings,
) {
  const ents = user ? await activeEntitlements(user.id).catch(() => []) : [];
  const planSummary = ents.length
    ? `${ents.length} active plan${ents.length > 1 ? "s" : ""} · next expiry ${ents[0].expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
    : null;
  const f = settings.features;
  return {
    user: user ? { name: user.name, email: user.email, avatarColor: user.avatarColor, isStaff: isStaff(user.role), xp: user.xp, streak: user.streak, planSummary } : null,
    features: { leaderboard: f.leaderboard, practice: f.practice, referAndEarn: f.referAndEarn },
    contact: { whatsapp: settings.whatsappNumber, email: settings.supportEmail },
  };
}
