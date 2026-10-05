import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { CartView, type CheckoutMeta } from "@/components/site/CartView";

export const metadata = { title: "Checkout" };

// Checkout: the existing CartView (getQuote / placeOrder / Cashfree SDK, unchanged) with the
// redesigned layout. Chapter and course details here are display-only; every price shown in
// the summary comes from the server quote.
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ mentorship?: string }> }) {
  const [{ mentorship }, s, user] = await Promise.all([searchParams, getSettings(), getCurrentUser()]);
  const [chapters, courses] = await Promise.all([
    db.chapter.findMany({
      where: { isPublished: true },
      orderBy: [{ jeeWeightage: "desc" }, { sortOrder: "asc" }],
      select: { id: true, title: true, symbol: true, coverFrom: true, coverTo: true, classLevel: true, price: true, mrp: true, _count: { select: { parts: true } } },
    }),
    db.course.findMany({ where: { isPublished: true }, orderBy: { sortOrder: "asc" }, select: { id: true, title: true, price: true, chapters: { select: { chapterId: true } } } }),
  ]);
  const meta: CheckoutMeta = {
    chapters: Object.fromEntries(chapters.map((c) => [c.id, { title: c.title, symbol: c.symbol, coverFrom: c.coverFrom, coverTo: c.coverTo, classLevel: c.classLevel, parts: c._count.parts, price: c.price, mrp: c.mrp }])),
    courses: courses.map((c) => ({ id: c.id, title: c.title, price: c.price, chapterIds: c.chapters.map((x) => x.chapterId), count: c.chapters.length })),
    suggestions: chapters.map((c) => c.id),
    user: user ? { name: user.name, email: user.email } : null,
    whatsapp: s.whatsappNumber,
  };
  return (
    <CartView
      mentorship={{ enabled: s.features.mentorshipUpsell, price: s.mentorshipPrice, title: s.mentorshipTitle, blurb: s.mentorshipBlurb, mentor: s.mentorName }}
      couponsEnabled={s.features.coupons}
      initialMentorship={mentorship === "1" && s.features.mentorshipUpsell}
      loggedIn={!!user}
      meta={meta}
    />
  );
}
