import { db } from "./db";
import { getSettings } from "./settings";

export type CartLine = { type: "CHAPTER" | "COURSE"; id: string };

export type QuoteLine = { type: "CHAPTER" | "COURSE" | "MENTORSHIP"; id: string | null; title: string; price: number; mrp: number };

export type Quote = {
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  coupon: { code: string; message: string } | null;
  couponError: string | null;
  skipped: string[]; // items dropped because already owned / unpublished
};

// Server-authoritative price calculation. The client cart only ever sends ids;
// prices always come from the database so they can be changed from admin.
export async function quoteCart(
  items: CartLine[],
  opts: { userId?: string; couponCode?: string | null; mentorship?: boolean },
): Promise<Quote> {
  const settings = await getSettings();
  const chapterIds = items.filter((i) => i.type === "CHAPTER").map((i) => i.id);
  const courseIds = items.filter((i) => i.type === "COURSE").map((i) => i.id);

  const [chapters, courses, owned] = await Promise.all([
    db.chapter.findMany({ where: { id: { in: chapterIds }, isPublished: true } }),
    db.course.findMany({ where: { id: { in: courseIds }, isPublished: true }, include: { chapters: true } }),
    opts.userId
      ? // Plans expiring within 30 days count as not owned, so they can be renewed early.
        db.entitlement.findMany({ where: { userId: opts.userId, expiresAt: { gt: new Date(Date.now() + 30 * 86_400_000) } } })
      : Promise.resolve([]),
  ]);

  const ownedChapters = new Set(owned.map((e) => e.chapterId).filter(Boolean));
  const ownedCourses = new Set(owned.map((e) => e.courseId).filter(Boolean));
  // A chapter already covered by a course in the cart shouldn't be charged twice.
  const coveredByCourse = new Set(courses.flatMap((c) => c.chapters.map((x) => x.chapterId)));

  const lines: QuoteLine[] = [];
  const skipped: string[] = [];
  for (const c of courses) {
    if (ownedCourses.has(c.id)) skipped.push(c.title);
    else lines.push({ type: "COURSE", id: c.id, title: c.title, price: c.price, mrp: c.mrp });
  }
  for (const ch of chapters) {
    if (ownedChapters.has(ch.id) || coveredByCourse.has(ch.id)) skipped.push(ch.title);
    else lines.push({ type: "CHAPTER", id: ch.id, title: ch.title, price: ch.price, mrp: ch.mrp });
  }
  if (opts.mentorship && settings.features.mentorshipUpsell) {
    const p = settings.mentorshipPrice;
    lines.push({ type: "MENTORSHIP", id: null, title: settings.mentorshipTitle, price: p, mrp: p });
  }

  const subtotal = lines.reduce((s, l) => s + l.price, 0);
  let discount = 0;
  let coupon: Quote["coupon"] = null;
  let couponError: string | null = null;

  if (opts.couponCode && settings.features.coupons) {
    const res = await evaluateCoupon(opts.couponCode, subtotal, opts.userId);
    if ("error" in res) couponError = res.error ?? null;
    else {
      discount = res.discount;
      coupon = { code: res.code, message: res.message };
    }
  }

  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round((taxable * settings.gstPercent) / 100);
  return { lines, subtotal, discount, tax, total: taxable + tax, coupon, couponError, skipped };
}

export async function evaluateCoupon(rawCode: string, subtotal: number, userId?: string) {
  const code = rawCode.trim().toUpperCase();
  const c = await db.coupon.findUnique({ where: { code } });
  const now = new Date();
  if (!c || !c.isActive) return { error: "That coupon code isn't valid." };
  if (c.startsAt && c.startsAt > now) return { error: "This coupon isn't live yet." };
  if (c.endsAt && c.endsAt < now) return { error: "This coupon has expired." };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { error: "This coupon has been fully claimed." };
  if (subtotal < c.minAmount) return { error: `Add ₹${c.minAmount - subtotal} more to use ${code}.` };
  if (userId) {
    const used = await db.couponRedemption.count({ where: { couponId: c.id, userId } });
    if (used >= c.perUserLimit) return { error: "You've already used this coupon." };
  }
  let discount = c.type === "PERCENT" ? Math.floor((subtotal * c.value) / 100) : c.value;
  if (c.maxDiscount != null) discount = Math.min(discount, c.maxDiscount);
  discount = Math.min(discount, subtotal);
  return { code, discount, couponId: c.id, message: `${code} applied — you save ₹${discount}` };
}
