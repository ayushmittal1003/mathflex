import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { duration, inr } from "@/lib/format";
import { courseFaqs, fillFaq, instructorNames } from "@/lib/site-content";
import { Caret, Eyebrow, Mark } from "@/components/site/web/primitives";
import { WashHero, heroH1, heroLead } from "@/components/site/web/WashHero";
import { FaqList } from "@/components/site/web/FaqList";
import { MentorSection } from "@/components/site/web/home/MentorSection";
import { CourseCards, CourseCalculator, CourseInside, type CourseView } from "@/components/site/web/courses/CourseParts";
import { button, cx, tone } from "@/components/site/web/ui";

export const metadata = { title: "Complete courses" };

// Courses (dipankar-design/designs/Courses.dc.html). Every course, price, highlight and
// chapter list comes from admin-managed data; hours are summed from part lengths. The
// design's "upgrade credit" and "free call with the combo" aren't in the pricing logic, so
// they aren't shown.
export default async function Courses() {
  const user = await getCurrentUser();
  const [courses, ents, settings, freePreview] = await Promise.all([
    db.course.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
      include: {
        chapters: {
          where: { chapter: { isPublished: true } },
          include: {
            chapter: {
              select: {
                id: true, slug: true, title: true, classLevel: true, price: true, symbol: true, coverFrom: true, coverTo: true, jeeWeightage: true, sortOrder: true,
                parts: { select: { durationSec: true } },
                _count: { select: { questions: true, resources: { where: { isPublished: true } } } },
              },
            },
          },
        },
      },
    }),
    user ? db.entitlement.findMany({ where: { userId: user.id, courseId: { not: null }, expiresAt: { gt: new Date() } } }) : [],
    getSettings(),
    db.chapter.findFirst({ where: { isPublished: true, parts: { some: { isFreePreview: true } } }, orderBy: [{ jeeWeightage: "desc" }], select: { slug: true } }),
  ]);
  const owned = new Set(ents.map((e) => e.courseId));
  const names = instructorNames(settings);

  const views: CourseView[] = courses.map((c) => {
    const chs = c.chapters.map((x) => x.chapter).sort((a, b) => a.classLevel - b.classLevel || a.sortOrder - b.sortOrder);
    const sec = chs.reduce((s, ch) => s + ch.parts.reduce((t, p) => t + p.durationSec, 0), 0);
    const sum = chs.reduce((s, ch) => s + ch.price, 0);
    return {
      id: c.id, slug: c.slug, title: c.title, subtitle: c.subtitle, price: c.price, mrp: c.mrp, highlights: c.highlights, validityDays: c.validityDays,
      owned: owned.has(c.id),
      hours: sec ? duration(sec) : null,
      chapterSum: sum,
      avgChapter: chs.length ? sum / chs.length : 0,
      hasPractice: chs.some((ch) => ch._count.questions > 0),
      hasNotes: chs.some((ch) => ch._count.resources > 0),
      chapters: chs.map((ch) => ({ id: ch.id, slug: ch.slug, title: ch.title, classLevel: ch.classLevel, price: ch.price, symbol: ch.symbol, coverFrom: ch.coverFrom, coverTo: ch.coverTo, parts: ch.parts.length, weight: ch.jeeWeightage })),
    };
  });
  const best = views.length > 1 ? [...views].sort((a, b) => b.chapters.length - a.chapters.length)[0].id : null;
  const calc = views.filter((v) => v.id !== best && v.chapters.length > 1 && v.avgChapter > 0)[0] ?? views.find((v) => v.avgChapter > 0) ?? null;
  const breakeven = calc ? Math.ceil(calc.price / calc.avgChapter) : null;
  const days = [...new Set(views.map((v) => v.validityDays))];

  const faqs = courseFaqs.map((f) => ({
    q: f.q,
    a: fillFaq(f.a, {
      breakevenLine: breakeven ? ` than buying ${breakeven} or more of its chapters separately` : "",
      unlockRule: settings.features.sequentialUnlock ? "each part opens after you watch most of the previous one and try its practice set." : "every part is open from the start.",
      accessLine: days.length === 1 ? `${days[0]} days` : "Each course shows its access period on its card",
    }),
  }));

  return (
    <>
      <WashHero>
        <div className="px-6 pt-10 text-center">
          <Eyebrow dot="ok" onWash>Complete courses · Class 11 &amp; 12</Eyebrow>
          <h1 className={cx(heroH1, "mt-6")}>
            The whole syllabus for one <Mark onWash>price<Caret /></Mark>
          </h1>
          <p className={cx(heroLead, "mt-5.5 max-w-[580px]")}>
            Get every chapter of a class, or both, with all parts, DPPs, PYQs and notes. Costs less than buying the chapters one by one.
          </p>
        </div>
        {views.length > 0 ? (
          <CourseCards courses={views} bestId={best} />
        ) : (
          <p className="mt-12 text-center text-secondary-foreground">Courses are being set up. <Link href="/chapters" className="font-bold text-primary">Browse chapters</Link> in the meantime.</p>
        )}
      </WashHero>

      {views.length > 0 && <CourseInside courses={views} />}

      {calc && breakeven && (
        <section className="border-t border-border py-22">
          <CourseCalculator course={calc} breakeven={breakeven} />
        </section>
      )}

      {views.length > 1 && (
        <section className="border-t border-border py-22">
          <div className="mx-auto w-[min(1000px,calc(100%-48px))]">
            <h2 className="text-center text-[clamp(34px,4.2vw,54px)] font-extrabold leading-[1.04] tracking-[-0.045em]">Compare courses</h2>
            <div className="no-scrollbar mt-10 overflow-x-auto">
              <div className="min-w-[620px]">
                <div className="grid items-end border-b-2 border-foreground pb-3.5" style={{ gridTemplateColumns: `minmax(0,1.6fr) repeat(${views.length}, minmax(0,1fr))` }}>
                  <span />
                  {views.map((v) => <span key={v.id} className={cx("text-center text-[15px] font-extrabold", v.id === best && "text-primary")}>{v.title}</span>)}
                </div>
                {[
                  ["Chapters", views.map((v) => `${v.chapters.length}`)],
                  ["Hours of video", views.map((v) => v.hours ?? "—")],
                  ["DPPs and PYQs", views.map((v) => (v.hasPractice ? "✓" : "—"))],
                  ["Notes", views.map((v) => (v.hasNotes ? "✓" : "—"))],
                  ...(settings.features.leaderboard ? [["XP, streaks and leaderboard", views.map(() => "✓")] as [string, string[]]] : []),
                  ["Access", views.map((v) => `${v.validityDays} days`)],
                  ["Price", views.map((v) => inr(v.price))],
                ].map(([label, cells]) => (
                  <div key={label as string} className="grid items-center border-b border-border py-3.5 text-[15px]" style={{ gridTemplateColumns: `minmax(0,1.6fr) repeat(${views.length}, minmax(0,1fr))` }}>
                    <span className="font-semibold text-secondary-foreground">{label}</span>
                    {(cells as string[]).map((v, i) => (
                      <span key={i} className={cx("text-center", v === "✓" ? "font-extrabold text-ok" : v === "—" ? "font-semibold text-muted-foreground" : label === "Price" ? cx("font-extrabold", views[i].id === best && "text-primary") : "font-semibold")}>{v}</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="border-t border-border">
        <MentorSection mentorship={settings.features.mentorshipUpsell ? { price: settings.mentorshipPrice } : null} names={names} />
      </div>

      <section className="border-t border-border py-22">
        <div className="mx-auto w-[min(820px,calc(100%-48px))]">
          <h2 className="text-center text-[clamp(34px,4.2vw,54px)] font-extrabold leading-[1.04] tracking-[-0.045em]">Questions about courses</h2>
          <div className="mt-9"><FaqList items={faqs} initialOpen={-1} /></div>
        </div>
      </section>

      <section className="border-t border-border px-6 pb-26 pt-22 text-center">
        <h2 className="mx-auto max-w-[820px] text-[clamp(36px,5vw,64px)] font-extrabold leading-[1.02] tracking-[-0.045em] text-balance">
          Not sure yet? {freePreview ? <>Watch a <Mark>free</Mark> Part 1 first.</> : <>Start with <Mark>one</Mark> chapter.</>}
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          <Link href="/chapters" className={cx(button.md, tone.primaryFlat)}>Browse chapters</Link>
          {freePreview && <Link href={`/chapter/${freePreview.slug}`} className={cx(button.md, tone.secondary)}>Watch a free preview</Link>}
        </div>
      </section>
    </>
  );
}
