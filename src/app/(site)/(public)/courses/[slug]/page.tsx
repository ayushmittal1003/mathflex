import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getCatalog } from "@/lib/catalog";
import { isStaff } from "@/lib/permissions";
import { inr, pctOff } from "@/lib/format";
import { courseFaqs, fillFaq, instructor, instructorNames } from "@/lib/site-content";
import { WashHero } from "@/components/site/web/WashHero";
import { CheckIcon, Mark, posterBg } from "@/components/site/web/primitives";
import { AddToCartButton, BuyNow } from "@/components/site/web/CartButtons";
import { CourseCalculator } from "@/components/site/web/courses/CourseParts";
import { COURSE_INCLUDE, toCourseView } from "@/components/site/web/courses/course-view";
import { FaqList } from "@/components/site/web/FaqList";
import { VideoFrame } from "@/components/site/web/VideoFrame";
import { button, container, cx, tone } from "@/components/site/web/ui";
import { CtaBand } from "@/components/site/web/CtaBand";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const c = await db.course.findUnique({ where: { slug: (await params).slug }, select: { title: true, subtitle: true, isPublished: true } });
  return c?.isPublished ? { title: c.title, description: c.subtitle || undefined } : {};
}

// Course detail, built from the Chapter Detail and Courses designs. Price, highlights,
// chapters and access come from the admin; owned courses show progress instead of buying.
export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const course = await db.course.findUnique({ where: { slug }, include: COURSE_INCLUDE });
  if (!course || (!course.isPublished && !isStaff(user?.role))) notFound();

  const [ent, catalog, settings, questionTypes] = await Promise.all([
    user ? db.entitlement.findFirst({ where: { userId: user.id, courseId: course.id, expiresAt: { gt: new Date() } }, select: { expiresAt: true } }) : null,
    getCatalog(user?.id),
    getSettings(),
    db.question.groupBy({ by: ["type"], where: { isPublished: true, chapterId: { in: course.chapters.map((c) => c.chapter.id) } }, _count: true }),
  ]);
  const owned = !!ent;
  const v = toCourseView(course, owned);
  const progress = new Map(catalog.map((c) => [c.id, c]));
  const classes = [...new Set(v.chapters.map((c) => c.classLevel))].sort();
  const off = pctOff(v.price, v.mrp);
  const saving = v.chapterSum - v.price;
  const dpp = questionTypes.find((q) => q.type === "DPP")?._count ?? 0;
  const pyq = questionTypes.find((q) => q.type === "PYQ")?._count ?? 0;
  const notes = course.chapters.reduce((s, c) => s + c.chapter._count.resources, 0);
  const parts = v.chapters.reduce((s, c) => s + c.parts, 0);
  const breakeven = v.avgChapter > 0 && v.chapters.length > 1 ? Math.ceil(v.price / v.avgChapter) : null;
  const names = instructorNames(settings);
  const item = { type: "COURSE" as const, id: v.id };
  const doneParts = v.chapters.reduce((s, c) => s + Math.round((progress.get(c.id)?.progress ?? 0) * c.parts), 0);

  const stats = [
    { big: `${v.chapters.length} chapters`, small: classes.length ? `Class ${classes.join(" & ")}` : "" },
    { big: `${parts} parts`, small: v.hours ? `${v.hours} of video` : "Video lessons" },
    ...(dpp + pyq > 0 ? [{ big: `${dpp + pyq} questions`, small: "DPPs + PYQs" }] : []),
    { big: `${v.validityDays} days`, small: "of access" },
  ];
  const includes = [
    `All ${v.chapters.length} chapters, every part`,
    ...(dpp + pyq > 0 ? [`${dpp + pyq} DPPs and PYQs with solutions`] : []),
    ...(notes > 0 ? ["Notes for the chapters"] : []),
    ...v.highlights,
    ...(settings.features.leaderboard ? ["XP, streaks and the weekly leaderboard"] : []),
    `${v.validityDays} days of access on phone and laptop`,
  ];
  const faqs = courseFaqs.map((f) => ({
    q: f.q,
    a: fillFaq(f.a, {
      breakevenLine: breakeven ? ` than buying ${breakeven} or more of its chapters separately` : "",
      unlockRule: settings.features.sequentialUnlock ? "each part opens after you watch most of the previous one and try its practice set." : "every part is open from the start.",
      accessLine: `${v.validityDays} days`,
    }),
  }));
  const sectionH2 = "text-[clamp(28px,3.2vw,40px)] font-extrabold leading-tight tracking-[-0.04em]";

  return (
    <>
      <WashHero className="!pb-[128px]">
        <div className="mx-auto mt-8 flex w-[min(1240px,calc(100%-48px))] flex-wrap items-center gap-x-16 gap-y-10 tablet:mt-12">
          <div className="order-2 min-w-0 flex-[1_1_340px] min-[900px]:order-1">
            <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-secondary-foreground">
              <Link href="/courses" className="hover:text-primary">Complete courses</Link>
              <span className="opacity-50">/</span>
              <span>{v.title}</span>
              {!course.isPublished && <span className="ml-2 rounded bg-gold/20 px-1.5 py-0.5 text-[11px] font-bold text-foreground">Unpublished · staff preview</span>}
            </div>
            <h1 className="mt-4.5 text-[clamp(42px,5.4vw,72px)] font-extrabold leading-none tracking-[-0.045em] text-balance">{v.title}</h1>
            <div className="mt-5.5 flex flex-wrap gap-2">
              <Pill>{v.chapters.length} chapters</Pill>
              {v.hours && <Pill>{v.hours} of video</Pill>}
              <Pill>{v.validityDays} days access</Pill>
            </div>
            {(course.description || v.subtitle) && (
              <p className="mt-4.5 max-w-[540px] whitespace-pre-line text-[17px] leading-[1.55] text-secondary-foreground text-pretty">{course.description || v.subtitle}</p>
            )}

            {owned ? (
              <div className="mt-7 max-w-md">
                <div className="inline-flex rounded-full bg-ok/12 px-3 py-1.5 text-sm font-bold text-[oklch(0.5_0.16_149)]">
                  ✓ You own this course · till {ent!.expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
                <div className="mb-2 mt-5 flex justify-between text-sm font-semibold"><span>Your progress</span><span>{doneParts}/{parts} parts</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-primary" style={{ width: `${(doneParts / Math.max(1, parts)) * 100}%` }} /></div>
                <div className="mt-5.5 flex flex-wrap gap-2.5">
                  <Link href="/my-learning" className={cx(button.lg, tone.primary)}>Go to My Learning</Link>
                  <a href="#chapters" className={cx(button.lg, tone.glass)}>See chapters</a>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-7">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[44px] font-extrabold tracking-[-0.04em]">{inr(v.price)}</span>
                    {v.mrp > v.price && <span className="text-base text-muted-foreground line-through">{inr(v.mrp)}</span>}
                    {off > 0 && <span className="rounded-md bg-ok px-2 py-0.5 text-xs font-extrabold text-white">{off}% OFF</span>}
                  </div>
                  <div className="mt-0.5 text-[13px] text-secondary-foreground">
                    {v.chapters.length > 0 && `${inr(Math.round(v.price / v.chapters.length))} per chapter`}
                    {saving > 0 && ` · ${inr(saving)} less than buying them one by one`}
                  </div>
                </div>
                <div className="mt-5.5 flex flex-wrap gap-2.5">
                  <BuyNow item={item} />
                  <AddToCartButton item={item} title={v.title} />
                </div>
              </>
            )}
          </div>

          {/* Course cover: the chapters it contains, stacked. */}
          <div className="order-1 min-w-0 flex-[1.1_1_360px] min-[900px]:order-2">
            <div className="relative aspect-[16/11] overflow-hidden rounded-xl text-white shadow-[0_40px_80px_-30px_rgb(80_20_0/0.5)]" style={posterBg(course.coverFrom, course.coverTo)}>
              <span aria-hidden className="absolute -right-4 top-1/2 -translate-y-1/2 text-[clamp(220px,26vw,340px)] font-black leading-none text-white/14">Σ</span>
              <span className="absolute left-5 top-5 rounded-md bg-white px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-black">Complete course</span>
              <div className="absolute inset-x-5 bottom-5">
                <div className="flex -space-x-3">
                  {v.chapters.slice(0, 6).map((c) => (
                    <span key={c.id} className={cx("grid size-14 place-items-center rounded-xl border-2 border-white/80 font-black shadow-[0_8px_18px_-8px_rgb(0_0_0/0.5)]", c.symbol.length > 2 ? "text-xs" : "text-lg")} style={posterBg(c.coverFrom, c.coverTo)}>
                      {c.symbol}
                    </span>
                  ))}
                  {v.chapters.length > 6 && <span className="grid size-14 place-items-center rounded-xl border-2 border-white/80 bg-black/35 text-sm font-extrabold backdrop-blur">+{v.chapters.length - 6}</span>}
                </div>
                <div className="mt-4 text-[clamp(22px,2.4vw,28px)] font-extrabold tracking-[-0.025em]">{v.chapters.length} chapters · {parts} parts</div>
              </div>
            </div>
          </div>
        </div>
      </WashHero>

      {/* Stats strip overlapping the hero. */}
      <div className="relative z-[3] mx-auto -mt-16 grid w-[min(1240px,calc(100%-48px))] grid-cols-[repeat(auto-fit,minmax(150px,1fr))] overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_48px_-28px_rgb(80_20_0/0.45)]">
        {stats.map((s, i) => (
          <div key={s.big} className={cx("px-7 py-6", i > 0 && "border-l border-border")}>
            <div className="text-xl font-extrabold tracking-[-0.02em]">{s.big}</div>
            <div className="mt-0.5 text-[13px] text-muted-foreground">{s.small}</div>
          </div>
        ))}
      </div>

      {/* What's included */}
      <section className={cx(container.listing, "pt-28")}>
        <div className="grid gap-12 min-[900px]:grid-cols-[1fr_1.3fr] min-[900px]:items-start min-[900px]:gap-20">
          <div>
            <h2 className={sectionH2}>Everything in <Mark>one</Mark> purchase</h2>
            <p className="mt-4 max-w-[420px] text-[16px] leading-[1.6] text-secondary-foreground">
              One payment unlocks every chapter in {v.title}. Inside each chapter, parts open one after another as you watch and practise.
            </p>
          </div>
          <div className="grid gap-x-10 gap-y-5 rounded-2xl border border-border bg-card p-7 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-38px_rgb(80_20_0/0.4)] min-[600px]:grid-cols-2 tablet:p-10">
            {includes.map((l) => (
              <div key={l} className="flex gap-3 text-[15px] leading-[1.45]"><CheckIcon className="mt-[3px] size-4 shrink-0 text-ok" /><span>{l}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* Chapters */}
      <section id="chapters" className={cx(container.listing, "scroll-mt-24 pt-28")}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className={sectionH2}>Chapters in this course</h2>
          <span className="text-sm font-semibold text-muted-foreground">{v.chapters.length} chapters{v.hours && ` · ${v.hours}`}</span>
        </div>
        <div className="mt-10 grid gap-16">
          {classes.map((n) => {
            const rows = v.chapters.filter((c) => c.classLevel === n);
            return (
              <div key={n}>
                {classes.length > 1 && (
                  <div className="mb-6 flex items-baseline gap-3">
                    <span className="text-xl font-extrabold tracking-[-0.025em]">Class {n}</span>
                    <span className="text-[13px] font-semibold text-muted-foreground">{rows.length} chapters</span>
                  </div>
                )}
                <div className="grid gap-4 min-[640px]:grid-cols-2 min-[1040px]:grid-cols-3">
                  {rows.map((r) => {
                    const p = progress.get(r.id);
                    const pct = p?.owned ? p.progress : 0;
                    return (
                      <Link key={r.id} href={owned ? `/learn/${r.slug}` : `/chapter/${r.slug}`} className="flex min-h-[100px] items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 text-foreground transition duration-300 hover:-translate-y-[3px] hover:shadow-[0_18px_34px_-22px_rgb(80_20_0/0.45)]">
                        <span className={cx("grid size-14 shrink-0 place-items-center rounded-xl font-black tracking-[-0.03em] text-white shadow-[0_6px_14px_-8px_rgb(0_0_0/0.4)]", r.symbol.length > 2 ? "text-[13px]" : "text-lg")} style={posterBg(r.coverFrom, r.coverTo)}>
                          {r.symbol}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-base font-bold leading-[1.3] tracking-[-0.01em]">{r.title}</span>
                          <span className="mt-1.5 block text-[13px] font-semibold text-muted-foreground">{r.parts} parts{r.weight > 0 && ` · ${r.weight}% of JEE`}</span>
                          {owned && (
                            <span className="mt-2 block h-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${pct * 100}%` }} /></span>
                          )}
                        </span>
                        {!owned && <span className="shrink-0 text-xs font-semibold text-muted-foreground line-through">{inr(r.price)}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {!owned && breakeven && (
        <section className="pt-28">
          <CourseCalculator course={v} breakeven={breakeven} />
        </section>
      )}

      {/* Instructor */}
      <section className={cx(container.listing, "pt-28")}>
        <div className="flex flex-wrap items-center gap-x-14 gap-y-8 rounded-2xl border border-border bg-card p-7 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-38px_rgb(80_20_0/0.4)] tablet:p-12">
          <VideoFrame videoId={instructor.introVideoId} className="aspect-[16/10] w-full max-w-[360px] shrink-0" />
          <div className="min-w-0 flex-[1_1_300px]">
            <div className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Taught by</div>
            <div className="mt-1.5 text-[clamp(26px,3vw,34px)] font-extrabold tracking-[-0.035em]">{names.full}</div>
            <div className="text-[15px] font-semibold text-secondary-foreground">{instructor.title}</div>
            <p className="mt-3 max-w-[560px] text-[15px] leading-[1.6] text-secondary-foreground">{names.short} {instructor.bio}</p>
          </div>
        </div>
      </section>

      <section className="pt-28">
        <div className="mx-auto w-[min(820px,calc(100%-48px))]">
          <h2 className={cx(sectionH2, "text-center")}>Questions about this course</h2>
          <div className="mt-9"><FaqList items={faqs} initialOpen={-1} /></div>
        </div>
      </section>

      <CtaBand>
        <h2 className="mx-auto max-w-[820px] text-[clamp(34px,4.6vw,58px)] font-extrabold leading-[1.04] tracking-[-0.045em] text-balance">
          {owned ? <>Pick up where you <Mark>left off</Mark>.</> : <>Every chapter of {v.title}, <Mark>one</Mark> price.</>}
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {owned ? (
            <Link href="/my-learning" className={cx(button.md, tone.primary)}>Go to My Learning</Link>
          ) : (
            <>
              <BuyNow item={item} size="md" />
              <Link href="/courses" className={cx(button.md, tone.secondary)}>Compare courses</Link>
            </>
          )}
        </div>
      </CtaBand>
    </>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap rounded-full border border-card bg-card/80 px-2.5 py-1.5 text-[13px] font-bold">{children}</span>;
}
