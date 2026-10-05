import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { duration, inr } from "@/lib/format";
import { about, fillFaq, instructor, instructorNames, placeholders } from "@/lib/site-content";
import { Caret, Eyebrow, Mark, SectionHead } from "@/components/site/web/primitives";
import { WashHero, heroH1, heroLead } from "@/components/site/web/WashHero";
import { VideoFrame } from "@/components/site/web/VideoFrame";
import { MentorSection } from "@/components/site/web/home/MentorSection";
import { button, cx, tone } from "@/components/site/web/ui";

export const metadata = { title: "About us", alternates: { canonical: "/about" } };

// About (dipankar-design/designs/About.dc.html). Copy lives in lib/site-content.ts; prices,
// chapter counts and hours are live. The college results and app screenshots in the design
// have no data or images yet, so those sections are hidden.
export default async function AboutPage() {
  const settings = await getSettings();
  const [chapters, courses, freeCount] = await Promise.all([
    db.chapter.findMany({ where: { isPublished: true }, select: { price: true, classLevel: true, parts: { select: { durationSec: true } } } }),
    db.course.findMany({ where: { isPublished: true }, select: { price: true, _count: { select: { chapters: true } } } }),
    settings.features.freePreviews ? db.part.count({ where: { isFreePreview: true, chapter: { isPublished: true } } }) : Promise.resolve(0),
  ]);
  const names = instructorNames(settings);
  const minPrice = chapters.length ? Math.min(...chapters.map((c) => c.price)) : null;
  const full = [...courses].sort((a, b) => b._count.chapters - a._count.chapters).find((c) => c._count.chapters >= chapters.length && chapters.length > 0);
  const totalSec = chapters.reduce((s, c) => s + c.parts.reduce((t, p) => t + p.durationSec, 0), 0);
  const classes = [...new Set(chapters.map((c) => c.classLevel))].sort();
  const anyFree = freeCount > 0;
  const vars = {
    fullName: names.full,
    minPrice: minPrice !== null ? inr(minPrice) : "",
    fullPriceLine: full ? `, ${inr(full.price)} for both classes` : "",
  };

  const stats = [
    { big: instructor.studentsGuided, small: `JEE aspirants guided by ${names.short}` },
    ...(chapters.length ? [{ big: String(chapters.length), small: `chapters across Class ${classes.join(" and ")}` }] : []),
    ...(totalSec ? [{ big: duration(totalSec), small: "of chapter-wise video" }] : []),
    ...(minPrice !== null ? [{ big: inr(minPrice), small: "to start a chapter" }] : []),
  ];
  const rules = about.rules.filter((r) => !("needsFree" in r) || anyFree);

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

      <section className="pb-22 pt-22">
        <div className="mx-auto flex w-[min(1120px,calc(100%-48px))] flex-wrap items-start gap-x-18 gap-y-8">
          <div className="min-w-0 flex-[1_1_320px] min-[860px]:sticky min-[860px]:top-24">
            <Eyebrow dot="brand-2">Our story</Eyebrow>
            <h2 className="mt-5.5 text-[clamp(36px,4.6vw,60px)] font-extrabold leading-[1.04] tracking-[-0.045em] text-balance">
              Great JEE teaching shouldn&apos;t cost <Mark>₹2 lakh</Mark>.
            </h2>
          </div>
          <div className="grid min-w-0 flex-[1.2_1_420px] gap-5 text-lg leading-[1.7] text-secondary-foreground">
            {about.story.map((p) => <p key={p.slice(0, 20)} className="text-pretty">{fillFaq(p, vars)}</p>)}
            {anyFree && minPrice !== null && <p className="text-pretty">{fillFaq(about.storyFree, vars)}</p>}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-22">
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

      {stats.length > 0 && (
        <section className="pb-22">
          <div className="mx-auto grid w-[min(1120px,calc(100%-48px))] grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] border-t-2 border-foreground">
            {stats.map((st) => (
              <div key={st.small} className="border-b border-border py-7 pr-5">
                <div className="text-[clamp(40px,5vw,64px)] font-extrabold leading-none tracking-[-0.05em]">{st.big}</div>
                <div className="mt-2.5 text-[15px] text-muted-foreground">{st.small}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-border py-22">
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

      <div className="border-t border-border">
        <MentorSection mentorship={settings.features.mentorshipUpsell ? { price: settings.mentorshipPrice } : null} names={names} />
      </div>

      <section className="border-t border-border px-6 pb-26 pt-22 text-center">
        <h2 className="mx-auto max-w-[820px] text-[clamp(36px,5vw,64px)] font-extrabold leading-[1.02] tracking-[-0.045em] text-balance">
          That&apos;s why we&apos;re here: so you get your <Mark>seat</Mark> too.
        </h2>
        <p className="mx-auto mt-4.5 max-w-[520px] text-[17px] leading-[1.55] text-secondary-foreground">
          An IIT or NIT seat through JEE is within reach. Start with one chapter{anyFree ? ", watch Part 1 free," : ""} and build from there.
        </p>
        <div className="mt-7.5 flex flex-wrap justify-center gap-2.5">
          <Link href="/signup" className={cx(button.md, tone.primary)}>Start free</Link>
          <Link href="/chapters" className={cx(button.md, tone.secondary)}>Browse chapters</Link>
        </div>
        <p className="mx-auto mt-10 text-[13px] leading-[1.6] text-muted-foreground">{placeholders.address} · {placeholders.cin}</p>
      </section>
    </>
  );
}
