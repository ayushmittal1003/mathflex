import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { duration, inr } from "@/lib/format";
import { about, aboutPillars, aboutTimeline, fillFaq, instructor, instructorNames } from "@/lib/site-content";
import { Caret, Eyebrow, Mark, SectionHead } from "@/components/site/web/primitives";
import { WashHero, heroH1, heroLead } from "@/components/site/web/WashHero";
import { VideoFrame } from "@/components/site/web/VideoFrame";
import { MentorSection } from "@/components/site/web/home/MentorSection";
import { AboutPillars } from "@/components/site/web/about/AboutPillars";
import { StoryTimeline } from "@/components/site/web/about/StoryTimeline";
import { button, cx, tone } from "@/components/site/web/ui";
import { CtaBand } from "@/components/site/web/CtaBand";

export const metadata = { title: "About us", alternates: { canonical: "/about" } };

// About. Structure inspired by allen.in/about-us (proof cards → timeline → offerings), built
// on our design system and kept honest for a new platform: every number is live, and the
// timeline has no invented years or results. Copy lives in lib/site-content.ts.
export default async function AboutPage() {
  const settings = await getSettings();
  const [chapters, courses, questionCount] = await Promise.all([
    db.chapter.findMany({ where: { isPublished: true }, select: { price: true, classLevel: true, parts: { select: { durationSec: true } } } }),
    db.course.findMany({ where: { isPublished: true }, orderBy: { sortOrder: "asc" }, select: { title: true, slug: true, price: true, _count: { select: { chapters: true } } } }),
    db.question.count({ where: { isPublished: true, chapter: { isPublished: true } } }),
  ]);
  const names = instructorNames(settings);
  const minPrice = chapters.length ? Math.min(...chapters.map((c) => c.price)) : null;
  const full = [...courses].sort((a, b) => b._count.chapters - a._count.chapters).find((c) => c._count.chapters >= chapters.length && chapters.length > 0);
  const totalSec = chapters.reduce((s, c) => s + c.parts.reduce((t, p) => t + p.durationSec, 0), 0);
  const classes = [...new Set(chapters.map((c) => c.classLevel))].sort();
  const vars: Record<string, string> = {
    fullName: names.full,
    mentorShort: names.short,
    studentsGuided: instructor.studentsGuided,
    chapterCount: String(chapters.length),
    classes: classes.join(" and "),
    hours: totalSec ? (totalSec >= 36_000 ? `${Math.floor(totalSec / 3600)}+` : duration(totalSec)) : "",
    questionCount: questionCount ? questionCount.toLocaleString("en-IN") : "",
    minPrice: minPrice !== null ? inr(minPrice) : "",
    freeLine: "Every chapter has a free preview.",
    fullPriceLine: full ? `, ${inr(full.price)} for both classes` : "",
  };
  const has = (key: string) => ({ chapters: chapters.length > 0, hours: totalSec > 0, practice: questionCount > 0, price: minPrice !== null }[key] ?? true);
  const pillars = aboutPillars.filter((p) => has(p.key)).map((p) => ({ ...p, big: fillFaq(p.big, vars), small: fillFaq(p.small, vars), body: fillFaq(p.body, vars).trim() }));
  const timeline = aboutTimeline.filter((t) => chapters.length > 0 || !t.t.includes("launches")).map((t) => ({ ...t, t: fillFaq(t.t, vars), d: fillFaq(t.d, vars) }));
  const rules = about.rules;

  const offerings = [
    chapters.length > 0 && {
      key: "chapters", kicker: "Chapters", title: "Buy one chapter", href: "/chapters", cta: "Browse chapters",
      meta: `${chapters.length} chapters${minPrice !== null ? ` · from ${inr(minPrice)}` : ""}`,
      body: "Every part, practice set and note for the chapter you're stuck on.", glyph: "∫",
    },
    courses.length > 0 && {
      key: "courses", kicker: "Courses", title: "Take a whole class", href: "/courses", cta: "See courses",
      meta: courses.map((c) => c.title).join(" · "),
      body: "Every chapter of a class, or both, for one price that beats buying them one by one.", glyph: "Σ",
    },
    settings.features.mentorshipUpsell && {
      key: "call", kicker: "1:1 call", title: `Talk to ${names.short}`, href: "/book-a-call", cta: "Book a call",
      meta: inr(settings.mentorshipPrice), body: settings.mentorshipBlurb, glyph: "☎",
    },
    {
      key: "practice", kicker: "Practice", title: "Practice, XP and ranks", href: settings.features.leaderboard ? "/leaderboard" : "/chapters", cta: settings.features.leaderboard ? "See the leaderboard" : "Start a chapter",
      meta: questionCount ? `${questionCount.toLocaleString("en-IN")} questions` : "After every part",
      body: "Practice after every part, XP for every right answer, and streaks that keep you going.", glyph: "★",
    },
  ].filter(Boolean) as { key: string; kicker: string; title: string; href: string; cta: string; meta: string; body: string; glyph: string }[];

  return (
    <>
      <WashHero>
        <div className="px-6 pt-10 text-center">
          <Eyebrow dot="ok" onWash>About Mathflex</Eyebrow>
          <h1 className={cx(heroH1, "mt-6")}>
            Built by someone who sat where you <Mark onWash>sit<Caret /></Mark>
          </h1>
          <p className={cx(heroLead, "mt-5.5 max-w-[580px]")}>
            Mathflex is chapter-wise JEE maths, taught by IIT Delhi alumnus {names.full}, at a price every student can afford.
          </p>
        </div>
        <VideoFrame videoId={about.storyVideoId} caption="Why Mathflex exists" sub={`A note from ${names.short}`} className="mx-auto mt-12 aspect-video w-[min(980px,calc(100%-48px))]" />
      </WashHero>

      {/* What we stand for: proof cards */}
      {pillars.length > 0 && (
        <section className="overflow-hidden pb-4 pt-24">
          <div className="mx-auto flex w-[min(1240px,calc(100%-48px))] flex-wrap items-end justify-between gap-x-10 gap-y-4">
            <div className="max-w-[640px]">
              <Eyebrow>What we stand for</Eyebrow>
              <h2 className="mt-5.5 text-[clamp(38px,5vw,64px)] font-extrabold leading-[1.02] tracking-[-0.045em] text-balance">
                New platform. <Mark>Proven</Mark> teaching.
              </h2>
            </div>
            <p className="max-w-[420px] text-[17px] leading-[1.55] text-secondary-foreground">
              We&apos;re new, so we won&apos;t claim decades of results. Here&apos;s what we can show you today.
            </p>
          </div>
          <div className="mt-8">
            <AboutPillars pillars={pillars} />
          </div>
        </section>
      )}

      <section className="py-16 tablet:py-20">
        <div className="mx-auto w-[min(1120px,calc(100%-48px))]">
          <Eyebrow dot="brand-2">Our story</Eyebrow>
          <h2 className="mt-5.5 max-w-[1000px] text-[clamp(34px,4.4vw,58px)] font-extrabold leading-[1.06] tracking-[-0.045em] text-balance">
            Great JEE teaching shouldn&apos;t cost <Mark>₹2 lakh</Mark>.
          </h2>
          <div className="mt-9 gap-12 text-lg leading-[1.7] text-secondary-foreground tablet:columns-2 [&>p]:mb-5 [&>p]:break-inside-avoid">
            {about.story.map((p) => <p key={p.slice(0, 20)} className="text-pretty">{fillFaq(p, vars)}</p>)}
            {minPrice !== null && <p className="text-pretty">{fillFaq(about.storyFree, vars)}</p>}
          </div>
        </div>
      </section>

      {/* The story so far: timeline */}
      <section className="py-16 tablet:py-20">
        <SectionHead eyebrow="The story so far" dot="gold" title={<>From one student to <Mark>every chapter</Mark></>} lead="No decades of history yet. Just the road that led here, and where you come in." />
        <StoryTimeline steps={timeline} />
      </section>

      <section className="py-16 tablet:py-20">
        <SectionHead eyebrow="What we solve" title={<>JEE prep is <Mark>broken</Mark> for most students</>} lead="Most students lose marks in a handful of chapters. The usual options make them pay for everything to fix those few." />
        <div className="mx-auto mt-12 w-[min(1000px,calc(100%-48px))]">
          <div className="grid grid-cols-2 gap-x-6 border-b-2 border-foreground pb-3 text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground tablet:grid-cols-[160px_1fr_1fr]">
            <span className="hidden tablet:block" />
            <span>The usual way</span>
            <span className="text-primary">The Mathflex way</span>
          </div>
          {about.problems.map((p) => (
            <div key={p.k} className="grid grid-cols-2 items-baseline gap-x-6 gap-y-1.5 border-b border-border py-5 tablet:grid-cols-[160px_1fr_1fr]">
              <span className="col-span-2 text-[15px] font-extrabold tablet:col-span-1">{p.k}</span>
              <span className="text-base leading-[1.5] text-muted-foreground">{p.bad}</span>
              <span className="text-base font-bold leading-[1.5] text-foreground">{fillFaq(p.good, vars)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* What you can learn with us: offerings */}
      {offerings.length > 0 && (
        <section className="py-16 tablet:py-20">
          <SectionHead eyebrow="Our offerings" dot="ok" title={<>What you can learn <Mark>with us</Mark></>} lead="Start with one chapter, take a whole class, or plan your prep with a call." />
          <div className="mx-auto mt-12 grid w-[min(1180px,calc(100%-48px))] grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
            {offerings.map((o, i) => (
              <Link
                key={o.key}
                href={o.href}
                className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground transition duration-300 ease-mf hover:-translate-y-1 hover:shadow-[0_24px_44px_-26px_rgb(80_20_0/0.45)]"
              >
                <div
                  className="relative h-36 overflow-hidden"
                  style={{ background: i === 0 ? "linear-gradient(155deg, var(--primary), var(--brand-2))" : i === 1 ? "var(--foreground)" : i === 2 ? "linear-gradient(155deg, var(--xp), var(--primary))" : "linear-gradient(155deg, var(--ok), var(--chart-3))" }}
                >
                  <span aria-hidden className="absolute -right-3 top-1/2 -translate-y-1/2 text-[140px] font-black leading-none text-white/18">{o.glyph}</span>
                  <span className="absolute left-4 top-4 rounded-md bg-white/90 px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-black">{o.kicker}</span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="text-xl font-extrabold tracking-[-0.02em]">{o.title}</div>
                  <div className="mt-1 line-clamp-2 text-[13px] font-bold text-primary">{o.meta}</div>
                  <p className="mt-2.5 text-sm leading-[1.55] text-secondary-foreground">{o.body}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-bold">
                    {o.cta}
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="py-16 tablet:py-20">
        <SectionHead
          eyebrow="Why chapter-wise"
          title={<>Fix the chapter that&apos;s <Mark>costing you</Mark> marks</>}
          lead="JEE rewards depth in high-weightage chapters. Studying one chapter at a time, start to finish, is how toppers close gaps. So that's how we built Mathflex."
        />
        <div className="mx-auto mt-14 grid w-[min(1120px,calc(100%-48px))] grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-x-8 gap-y-10">
          {rules.map((r, i) => (
            <div key={r.t} className="min-w-0">
              <div aria-hidden className="select-none text-[120px] font-black leading-[0.8] tracking-[-0.06em] text-transparent [-webkit-text-stroke:2px_var(--muted-foreground)]">{i + 1}</div>
              <h3 className="mt-5.5 text-2xl font-extrabold tracking-[-0.025em]">{r.t}</h3>
              <p className="mt-2.5 text-base leading-[1.65] text-secondary-foreground">{r.d}</p>
            </div>
          ))}
        </div>
      </section>

      <div>
        <MentorSection mentorship={settings.features.mentorshipUpsell ? { price: settings.mentorshipPrice } : null} names={names} />
      </div>

      <CtaBand>
        <h2 className="mx-auto max-w-[820px] text-[clamp(36px,5vw,64px)] font-extrabold leading-[1.02] tracking-[-0.045em] text-balance">
          That&apos;s why we&apos;re here: so you get your <Mark>seat</Mark> too.
        </h2>
        <p className="mx-auto mt-4.5 max-w-[520px] text-[17px] leading-[1.55] text-secondary-foreground">
          An IIT or NIT seat through JEE is within reach. Watch a free chapter preview, start with one chapter and build from there.
        </p>
        <div className="mt-7.5 flex flex-wrap justify-center gap-2.5">
          <Link href="/signup" className={cx(button.md, tone.primary)}>Start free</Link>
          <Link href="/chapters" className={cx(button.md, tone.secondary)}>Browse chapters</Link>
        </div>
      </CtaBand>
    </>
  );
}
