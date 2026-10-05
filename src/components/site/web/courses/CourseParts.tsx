"use client";
import Link from "next/link";
import { useState } from "react";
import { inr, pctOff } from "@/lib/format";
import { BuyButton } from "../BuyButton";
import { CheckIcon, Eyebrow, Mark, SectionHead } from "../primitives";
import { splitH2 } from "../WashHero";
import { cx } from "../ui";

export type CourseChapter = { id: string; slug: string; title: string; classLevel: number; price: number; symbol: string; coverFrom: string; coverTo: string; parts: number; weight: number };
export type CourseView = {
  id: string; slug: string; title: string; subtitle: string; price: number; mrp: number; highlights: string[]; validityDays: number; owned: boolean;
  hours: string | null; chapterSum: number; avgChapter: number; hasPractice: boolean; hasNotes: boolean; chapters: CourseChapter[];
};

// design.md §4 Course card: the best-value course is dark, raised 14px, with a red tab.
export function CourseCards({ courses, bestId }: { courses: CourseView[]; bestId: string | null }) {
  // Best value sits in the middle, as in the design.
  const ordered = bestId && courses.length === 3 ? [courses.find((c) => c.id !== bestId)!, courses.find((c) => c.id === bestId)!, courses.filter((c) => c.id !== bestId)[1]] : courses;
  return (
    <div className="mx-auto mt-14 grid w-[min(1120px,calc(100%-48px))] grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-stretch gap-5">
      {ordered.map((c, i) => {
        const best = c.id === bestId;
        const off = pctOff(c.price, c.mrp);
        const perCh = c.chapters.length ? Math.round(c.price / c.chapters.length) : 0;
        return (
          <div
            key={c.id}
            className={cx(
              "relative flex animate-mf-rise flex-col rounded-xl border p-7",
              best ? "border-foreground bg-foreground text-white shadow-[0_40px_70px_-30px_rgb(80_20_0/0.55)] tablet:-translate-y-3.5" : "border-border bg-card shadow-[0_1px_4px_0_rgb(0_0_0/0.08)]",
            )}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {best && <span className="absolute -top-3 left-7 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-white">Best value</span>}
            <div className="text-[21px] font-extrabold tracking-[-0.02em]">{c.title}</div>
            <div className={cx("mt-1 text-sm", best ? "text-white/70" : "text-muted-foreground")}>
              {c.subtitle || `${c.chapters.length} chapters`}{c.hours && ` · ${c.hours}`}
            </div>
            <div className="mt-5.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
              <span className="text-5xl font-extrabold leading-none tracking-[-0.045em]">{inr(c.price)}</span>
              {c.mrp > c.price && <span className={cx("text-base line-through", best ? "text-white/55" : "text-muted-foreground")}>{inr(c.mrp)}</span>}
              {off > 0 && <span className="rounded-md bg-ok px-2 py-0.5 text-xs font-extrabold text-white">{off}% OFF</span>}
            </div>
            {perCh > 0 && (
              <div className={cx("mt-2 text-[13px]", best ? "text-white/70" : "text-muted-foreground")}>
                {inr(perCh)} per chapter{c.chapterSum > c.price && ` · ${inr(c.chapterSum)} if bought one by one`}
              </div>
            )}
            <div className={cx("my-5.5 h-px", best ? "bg-white/15" : "bg-border")} />
            <div className="grid gap-[11px]">
              {[`All ${c.chapters.length} chapters, every part`, ...(c.hasPractice ? ["DPPs and PYQs with solutions"] : []), ...(c.hasNotes ? ["Notes for every chapter"] : []), ...c.highlights, `${c.validityDays} days of access`].map((f) => (
                <div key={f} className="flex gap-2.5 text-sm leading-[1.4]">
                  <CheckIcon className={cx("mt-0.5 size-[15px] shrink-0", best ? "text-[oklch(0.8_0.15_60)]" : "text-ok")} />
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto grid gap-2 pt-6.5">
              {c.owned ? (
                <Link href="/my-learning" className="rounded-lg bg-ok p-3.5 text-center text-[15px] font-bold text-white">You own this · Go to My Learning</Link>
              ) : (
                <BuyButton item={{ type: "COURSE", id: c.id }} className={cx("rounded-lg p-3.5 text-[15px] font-bold text-white transition hover:brightness-110", best ? "bg-primary" : "bg-foreground")}>
                  Get {c.title}
                </BuyButton>
              )}
              <a href={`#inside-${c.id}`} className={cx("rounded-lg border p-3 text-center text-sm font-bold", best ? "border-white/15 text-white" : "border-border text-foreground")}>
                See all {c.chapters.length} chapters
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// "Every chapter, listed": tabs per course, chapters grouped by class.
export function CourseInside({ courses }: { courses: CourseView[] }) {
  const [tab, setTab] = useState(courses[0].id);
  const cur = courses.find((c) => c.id === tab) ?? courses[0];
  const classes = [...new Set(cur.chapters.map((c) => c.classLevel))].sort();
  return (
    <section id="inside" className="pb-22 pt-24">
      {courses.map((c) => <span key={c.id} id={`inside-${c.id}`} className="block scroll-mt-24" />)}
      <SectionHead eyebrow="What's inside" dot="brand-2" title={<>Every chapter, <Mark>listed</Mark>.</>} />
      {courses.length > 1 && (
        <div className="mt-8 flex justify-center px-6">
          <div className="no-scrollbar inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-foreground p-1">
            {courses.map((c) => (
              <button key={c.id} type="button" onClick={() => setTab(c.id)} aria-pressed={c.id === tab} className={cx("whitespace-nowrap rounded-md px-4 py-[9px] text-sm font-bold", c.id === tab ? "bg-card text-foreground" : "text-white/75 hover:text-white")}>
                {c.title}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="mt-4 text-center text-[15px] text-muted-foreground">{cur.chapters.length} chapters{cur.hours && ` · ${cur.hours} of video`} · {inr(cur.price)}</p>
      <div className="mx-auto mt-14 grid w-[min(1180px,calc(100%-48px))] gap-12">
        {classes.map((n, i) => {
          const rows = cur.chapters.filter((c) => c.classLevel === n);
          return (
            <div key={`${cur.id}-${n}`} className="min-w-0 animate-mf-rise">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 border-b border-border pb-3.5">
                <span className="font-mono text-[13px] font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[22px] font-extrabold tracking-[-0.025em]">Class {n}</span>
                <span className="ml-auto whitespace-nowrap text-[13px] font-semibold text-muted-foreground">{rows.length} chapters</span>
              </div>
              <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-3">
                {rows.map((r) => (
                  <Link key={r.id} href={`/chapter/${r.slug}`} className="flex min-h-[76px] items-center gap-3.5 rounded-xl border border-border bg-card px-3.5 py-3 text-foreground transition duration-300 hover:-translate-y-[3px] hover:border-[oklch(0.87_0.03_40)] hover:shadow-[0_18px_34px_-22px_rgb(80_20_0/0.45)]">
                    <span className={cx("grid size-12 shrink-0 place-items-center rounded-[10px] font-black tracking-[-0.03em] text-white shadow-[0_6px_14px_-8px_rgb(0_0_0/0.4)]", r.symbol.length > 2 ? "text-[13px]" : "text-lg")} style={{ background: `linear-gradient(155deg, ${r.coverFrom}, ${r.coverTo})` }}>
                      {r.symbol}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[15px] font-bold leading-[1.3] tracking-[-0.01em]">{r.title}</span>
                      <span className="mt-1 block text-xs font-semibold text-muted-foreground">{r.parts} parts{r.weight > 0 && ` · ${r.weight}% of JEE`}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// "How many chapters do you need?" slider against one course's real prices.
export function CourseCalculator({ course, breakeven }: { course: CourseView; breakeven: number }) {
  const max = course.chapters.length;
  const [n, setN] = useState(Math.min(Math.max(breakeven, 1), max));
  const sep = Math.round(n * course.avgChapter);
  const top = Math.max(sep, course.price, course.chapterSum);
  const cheaper = sep < course.price;

  return (
    <div className="mx-auto flex w-[min(1180px,calc(100%-48px))] flex-wrap items-center gap-x-18 gap-y-10">
      <div className="min-w-0 flex-[1_1_340px]">
        <Eyebrow>Course or chapters?</Eyebrow>
        <h2 className={cx(splitH2, "mt-5.5")}>How many chapters do you <Mark>need</Mark>?</h2>
        <p className="mt-4.5 max-w-[440px] text-base leading-[1.6] text-secondary-foreground">
          Weak in only a few chapters? Buy them one by one. Once you need {breakeven} or more from {course.title}, the full course costs less.
        </p>
      </div>
      <div className="min-w-0 flex-[1.2_1_420px]">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="chapters-needed" className="text-[15px] font-bold">Chapters I need</label>
          <span className="text-[40px] font-extrabold leading-none tracking-[-0.04em]">{n}</span>
        </div>
        <input id="chapters-needed" type="range" min={1} max={max} value={n} onChange={(e) => setN(Number(e.target.value))} className="mb-1 mt-4 h-6 w-full cursor-pointer accent-primary" />
        <div className="flex justify-between text-xs text-muted-foreground"><span>1</span><span>{max} (all of {course.title})</span></div>
        <div className="mt-8 grid gap-4.5">
          <Bar label={`One by one, about ${inr(Math.round(course.avgChapter))} each`} value={inr(sep)} width={(sep / top) * 100} className="bg-muted-foreground" />
          <Bar label={course.title} value={inr(course.price)} width={(course.price / top) * 100} className="bg-gradient-to-r from-primary to-brand-2" />
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t border-border pt-5">
          <span className="max-w-[380px] text-[17px] font-bold tracking-[-0.01em]">
            {cheaper ? `Buying ${n} chapter${n === 1 ? "" : "s"} separately saves you ${inr(course.price - sep)}.` : `The course saves you ${inr(sep - course.price)} and includes every chapter.`}
          </span>
          {cheaper ? (
            <Link href="/chapters" className="shrink-0 rounded-lg bg-foreground px-4.5 py-3 text-sm font-bold text-card hover:brightness-120">Pick your chapters</Link>
          ) : (
            <BuyButton item={{ type: "COURSE", id: course.id }} className="shrink-0 rounded-lg bg-foreground px-4.5 py-3 text-sm font-bold text-card hover:brightness-120">Get {course.title}</BuyButton>
          )}
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, width, className }: { label: string; value: string; width: number; className: string }) {
  return (
    <div>
      <div className="flex justify-between gap-3 text-sm font-semibold"><span>{label}</span><span className="font-extrabold">{value}</span></div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
        <div className={cx("h-full rounded-full transition-[width] duration-350 ease-mf", className)} style={{ width: `${Math.max(2, width)}%` }} />
      </div>
    </div>
  );
}
