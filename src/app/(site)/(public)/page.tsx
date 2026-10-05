import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { activeBanners } from "@/lib/banners";
import { requestNow } from "@/lib/time";
import { inr } from "@/lib/format";
import { faqGroups, fillFaq, homeFaqs, instructorNames } from "@/lib/site-content";
import { HomeHero } from "@/components/site/web/home/HomeHero";
import { OffersStrip } from "@/components/site/web/home/OffersStrip";
import { PreviewExplorer } from "@/components/site/web/home/PreviewExplorer";
import { CostCompare } from "@/components/site/web/home/CostCompare";
import { HowItWorks } from "@/components/site/web/home/HowItWorks";
import { InsideMathflex } from "@/components/site/web/home/InsideMathflex";
import { MentorSection } from "@/components/site/web/home/MentorSection";
import { CompareTable } from "@/components/site/web/home/CompareTable";
import { PricingSection } from "@/components/site/web/home/PricingSection";
import { HomeFaq } from "@/components/site/web/home/HomeFaq";
import { FinalCta } from "@/components/site/web/home/FinalCta";
import type { HomeChapter, HomeCourse } from "@/components/site/web/home/types";

// Home (dipankar-design/designs/Landing Page v2.dc.html). Everything shown comes from the
// database or settings; static copy lives in lib/site-content.ts. The design's college
// carousel and student reviews are hidden until they have a backend.
export default async function Home() {
  const settings = await getSettings();
  const now = new Date(requestNow());
  const [chapterRows, courseRows, heroBanners, offerBanners, coupon, mindMaps, resources] = await Promise.all([
    db.chapter.findMany({
      where: { isPublished: true },
      orderBy: [{ classLevel: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true, slug: true, title: true, classLevel: true, price: true, mrp: true, coverFrom: true, coverTo: true, symbol: true, jeeWeightage: true,
        parts: { orderBy: { order: "asc" }, select: { id: true, order: true, title: true, durationSec: true, isFreePreview: true, watchThreshold: true } },
      },
    }),
    db.course.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, title: true, subtitle: true, price: true, mrp: true, highlights: true, _count: { select: { chapters: true } } },
    }),
    activeBanners("HERO"),
    activeBanners("OFFER"),
    settings.features.coupons
      ? db.coupon.findFirst({
          where: { isPublic: true, isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] },
          orderBy: { createdAt: "asc" },
          select: { code: true, description: true },
        })
      : null,
    db.resource.count({ where: { type: "MINDMAP", isPublished: true } }),
    db.resource.findMany({ where: { isPublished: true }, orderBy: { createdAt: "asc" }, take: 3, select: { title: true, type: true } }),
  ]);

  const freeOn = settings.features.freePreviews;
  const chapters: HomeChapter[] = chapterRows.map((c) => ({
    ...c,
    hasFreePart: freeOn && c.parts.some((p) => p.isFreePreview),
  }));
  const courses: HomeCourse[] = courseRows.map((c) => ({ ...c, chapterCount: c._count.chapters }));

  // A course that contains every published chapter is the "full syllabus" one.
  const fullCourse = [...courses].sort((a, b) => b.chapterCount - a.chapterCount).find((c) => chapters.length > 0 && c.chapterCount >= chapters.length) ?? null;
  const minChapterPrice = chapters.length ? Math.min(...chapters.map((c) => c.price)) : null;
  const anyFree = chapters.some((c) => c.hasFreePart);
  const names = instructorNames(settings);
  const mentorship = settings.features.mentorshipUpsell ? { price: settings.mentorshipPrice } : null;

  // The "how a chapter works" demo uses a real chapter and its first part's question counts.
  const demoChapter = chapters.find((c) => c.parts.length >= 2) ?? chapters.find((c) => c.parts.length > 0) ?? null;
  const demoCounts = demoChapter
    ? await db.question.groupBy({ by: ["type"], where: { partId: demoChapter.parts[0].id, isPublished: true }, _count: { _all: true } })
    : [];
  const practice = demoChapter
    ? { dpp: demoCounts.find((c) => c.type === "DPP")?._count._all ?? 0, pyq: demoCounts.find((c) => c.type === "PYQ")?._count._all ?? 0 }
    : null;

  // Weekly ranking for the dashboard mock-up: same query as the leaderboard page.
  const leaders = settings.features.leaderboard ? await weeklyLeaders(now) : [];

  const faqVars = {
    supportEmail: settings.supportEmail,
    mentorShort: names.short,
    mentorshipBlurb: settings.mentorshipBlurb,
    mentorshipPrice: inr(settings.mentorshipPrice),
    notesKind: mindMaps > 0 ? "notes and mind maps" : "notes",
  };
  const faqs = homeFaqs
    .map(([g, i]) => faqGroups.find((x) => x.id === g)?.items[i])
    .filter((f): f is NonNullable<typeof f> => !!f)
    .map((f) => ({ q: fillFaq(f.q, faqVars), a: fillFaq(f.a, faqVars) }));

  return (
    <>
      <HomeHero chapters={chapters} chapterCount={chapters.length} minPrice={minChapterPrice} anyFree={anyFree} />
      <OffersStrip banners={[...heroBanners, ...offerBanners]} />
      {anyFree && <PreviewExplorer chapters={chapters.filter((c) => c.parts.length > 0)} chapterCount={chapters.length} mentorShort={names.short} />}
      <CostCompare fullCourse={fullCourse} minChapterPrice={minChapterPrice} />
      <HowItWorks chapter={demoChapter} practice={practice} />
      <InsideMathflex chapters={chapters.slice(0, 2)} leaders={leaders} resources={resources} />
      <MentorSection mentorship={mentorship} names={names} />
      <CompareTable fullPrice={fullCourse?.price ?? null} callPrice={mentorship?.price ?? null} />
      <PricingSection chapters={chapters} courses={courses} coupon={coupon} />
      <HomeFaq faqs={faqs} whatsapp={settings.whatsappNumber} />
      <FinalCta chapters={chapters} minPrice={minChapterPrice} anyFree={anyFree} />
    </>
  );
}

async function weeklyLeaders(now: Date) {
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
