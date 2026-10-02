import Link from "next/link";
import { Lock, Unlock, Trophy, PhoneCall } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getCatalog } from "@/lib/catalog";
import { activeBanners } from "@/lib/banners";
import { db } from "@/lib/db";
import { getAccessibleChapterIds } from "@/lib/access";
import { Hero, type HeroSlide } from "@/components/site/Hero";
import { Row } from "@/components/site/Row";
import { ChapterPoster, RankedPoster } from "@/components/site/ChapterCard";
import { CourseCard } from "@/components/site/CourseCard";
import { duration, inr } from "@/lib/format";

export default async function Home() {
  const user = await getCurrentUser();
  const [settings, chapters, heroBanners, offers, courses, owned] = await Promise.all([
    getSettings(),
    getCatalog(user?.id),
    activeBanners("HERO"),
    activeBanners("OFFER"),
    db.course.findMany({ where: { isPublished: true }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { chapters: true } } } }),
    getAccessibleChapterIds(user?.id),
  ]);
  const ownedCourseIds = user
    ? new Set((await db.entitlement.findMany({ where: { userId: user.id, courseId: { not: null }, expiresAt: { gt: new Date() } } })).map((e) => e.courseId))
    : new Set<string | null>();

  const featured = chapters.filter((c) => c.isFeatured);
  const slides: HeroSlide[] = [
    ...heroBanners.map((b) => ({
      id: b.id,
      eyebrow: "MathFlex Originals",
      title: b.title,
      subtitle: b.subtitle,
      symbol: "∞",
      colorFrom: b.colorFrom,
      colorTo: b.colorTo,
      imageUrl: b.imageUrl,
      primary: { label: b.ctaText || "Explore", href: b.ctaHref || "/browse" },
      secondary: { label: "All chapters", href: "/browse" },
    })),
    ...featured.slice(0, 4).map((c) => ({
      id: c.id,
      eyebrow: `Class ${c.classLevel} · Featured chapter`,
      title: c.title,
      subtitle: c.tagline,
      symbol: c.symbol,
      colorFrom: c.coverFrom,
      colorTo: c.coverTo,
      imageUrl: c.coverImage,
      meta: [
        `${c.partsCount} parts`,
        c.durationSec ? duration(c.durationSec) : "",
        c.jeeWeightage ? `${c.jeeWeightage}% of JEE Main` : "",
        c.owned ? "Owned" : inr(c.price),
      ].filter(Boolean),
      primary: { label: c.owned ? "Continue" : "Watch free preview", href: c.owned ? `/learn/${c.slug}` : `/chapter/${c.slug}` },
      secondary: { label: "More info", href: `/chapter/${c.slug}` },
    })),
  ];

  const continueWatching = chapters.filter((c) => c.owned && c.progress < 1);
  const trending = chapters.filter((c) => c.isTrending).slice(0, 10);
  const byClass = (n: number) => chapters.filter((c) => c.classLevel === n);
  const highWeight = [...chapters].filter((c) => c.jeeWeightage > 0).sort((a, b) => b.jeeWeightage - a.jeeWeightage).slice(0, 12);

  return (
    <div className="pb-8">
      <Hero slides={slides} />
      <div className="relative z-10 -mt-16 sm:-mt-24">
        {continueWatching.length > 0 && (
          <Row title={`Continue learning, ${user!.name.split(" ")[0]}`} subtitle="Pick up where you left off">
            {continueWatching.map((c) => <ChapterPoster key={c.id} c={c} />)}
          </Row>
        )}

        {offers.length > 0 && (
          <Row title="Offers for you">
            {offers.map((o) => (
              <Link
                key={o.id}
                href={o.ctaHref || "/browse"}
                className="relative flex h-40 w-[300px] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-3xl p-5 text-white shadow-lg transition hover:-translate-y-1 sm:w-[380px]"
                style={{ background: `linear-gradient(135deg, ${o.colorFrom}, ${o.colorTo})` }}
              >
                <span className="absolute -right-2 -top-6 font-display text-8xl font-extrabold text-white/15">%</span>
                <p className="font-display text-xl font-extrabold leading-tight">{o.title}</p>
                {o.subtitle && <p className="mt-1 text-sm opacity-90">{o.subtitle}</p>}
              </Link>
            ))}
          </Row>
        )}

        {trending.length > 0 && (
          <Row title="Top 10 chapters this week" subtitle="What JEE aspirants are binge-learning right now">
            {trending.map((c, i) => <RankedPoster key={c.id} c={c} rank={i + 1} />)}
          </Row>
        )}

        {courses.length > 0 && (
          <Row title="Complete courses" subtitle="Every chapter, one price" href="/courses">
            {courses.map((c) => (
              <CourseCard
                key={c.id}
                c={{ ...c, chapterCount: c._count.chapters, owned: ownedCourseIds.has(c.id) }}
              />
            ))}
          </Row>
        )}

        <HowItWorks />

        {[11, 12].map((n) =>
          byClass(n).length ? (
            <Row key={n} title={`Class ${n} chapters`} subtitle="Buy just the one you need" href={`/browse?class=${n}`}>
              {byClass(n).map((c) => <ChapterPoster key={c.id} c={c} />)}
            </Row>
          ) : null,
        )}

        {highWeight.length > 0 && (
          <Row title="Highest JEE weightage" subtitle="Maximum marks for your time">
            {highWeight.map((c) => <ChapterPoster key={c.id} c={c} />)}
          </Row>
        )}

        {settings.features.mentorshipUpsell && (
          <section className="mx-auto mt-14 max-w-[1500px] px-4 md:px-8">
            <div className="card flex flex-col items-start gap-5 overflow-hidden p-6 sm:flex-row sm:items-center sm:p-8">
              <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white"><PhoneCall className="size-8" /></div>
              <div className="flex-1">
                <h3 className="font-display text-2xl font-extrabold">{settings.mentorshipTitle}</h3>
                <p className="mt-1 text-muted-foreground">{settings.mentorshipBlurb}</p>
              </div>
              <Link href="/cart?mentorship=1" className="btn btn-primary">Book for {inr(settings.mentorshipPrice)}</Link>
            </div>
          </section>
        )}
        {owned.size === 0 && !user && (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            <Link href="/signup" className="font-bold text-primary">Create a free account</Link> to track XP and streaks.
          </p>
        )}
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Unlock, title: "Pick one chapter", body: "No ₹30,000 bundles. Buy exactly the chapter you're stuck on." },
    { icon: Lock, title: "Unlock part by part", body: "Watch Part 1, crush its DPPs & PYQs, and Part 2 unlocks. Like levels in a game." },
    { icon: Trophy, title: "Earn XP & badges", body: "Streaks, badges and a live leaderboard keep the momentum going." },
  ];
  return (
    <section className="mx-auto mt-14 max-w-[1500px] px-4 md:px-8">
      <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Maths, but make it <span className="text-gradient">bingeable</span>.</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {steps.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="card relative overflow-hidden p-6">
            <span className="absolute right-4 top-2 font-display text-7xl font-extrabold text-foreground/5">{i + 1}</span>
            <Icon className="size-8 text-primary" />
            <h3 className="mt-4 text-lg font-bold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
