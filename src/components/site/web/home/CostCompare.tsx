"use client";
import { useEffect, useRef, useState } from "react";
import { inr } from "@/lib/format";
import type { Settings } from "@/lib/settings";
import { Marked, SectionHead } from "../primitives";
import { button, cx, tone } from "../ui";
import type { HomeCourse } from "./types";

type Copy = Pick<Settings["home"], "problemEyebrow" | "problemTitle" | "problemLead" | "coachingName" | "coachingPrice" | "coachingNote" | "problemConclusion">;

// 04 The problem: a year of coaching (approximate, edited on Admin → Home page) against our live
// prices: the full syllabus and one chapter. Bars grow when the section scrolls into view.
export function CostCompare({ fullCourse, minChapterPrice, copy }: { fullCourse: HomeCourse | null; minChapterPrice: number | null; copy: Copy }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return setSeen(true);
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const top = copy.coachingPrice;
  const rows = [
    { name: copy.coachingName, note: copy.coachingNote, price: top, unit: "per year, approx.", us: false },
    ...(fullCourse ? [{ name: `Full syllabus · ${fullCourse.title}`, note: "Every chapter, every part, DPPs, PYQs and notes. Pay once.", price: fullCourse.price, unit: "one-time", us: true }] : []),
    ...(minChapterPrice !== null ? [{ name: "One chapter", note: "Just the chapter you're stuck on.", price: minChapterPrice, unit: "starting price", us: true }] : []),
  ];
  // Rounded up, so "less than 5%" is always true. Derived from the figures shown above it.
  const percent = fullCourse && top > 0 ? Math.max(1, Math.ceil((fullCourse.price / top) * 100)) : 0;
  const conclusion = percent
    ? copy.problemConclusion.replace("{percent}", `${percent}%`).replace("{fullPrice}", inr(fullCourse!.price)).replace("{minPrice}", minChapterPrice !== null ? inr(minChapterPrice) : "")
    : minChapterPrice !== null ? `Start with one chapter from *${inr(minChapterPrice)}*. No yearly fee, no batch timings.` : "";

  return (
    <section className="py-9 tablet:py-14">
      <SectionHead eyebrow={copy.problemEyebrow} title={<Marked text={copy.problemTitle} />} lead={copy.problemLead} />
      <div ref={ref} className="mx-auto mt-12 w-[min(1120px,calc(100%-var(--gutter)*2))] overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_4px_0_rgb(0_0_0/0.08)]">
        {rows.map((r, i) => (
          <div
            key={r.name}
            className={cx("grid grid-cols-1 items-start gap-x-7 gap-y-3 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-y-4 sm:px-7 sm:py-6", i > 0 && "border-t border-border", r.us && "bg-primary/4")}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[17px] font-extrabold tracking-[-0.02em]">{r.name}</span>
                {r.us && <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-extrabold uppercase tracking-[0.08em] text-primary-foreground">Mathflex</span>}
              </div>
              <div className="mt-1 text-sm leading-[1.45] text-muted-foreground">{r.note}</div>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:block sm:text-right">
              <div className={cx("whitespace-nowrap text-[26px] font-extrabold leading-none tracking-[-0.035em] sm:text-[30px]", r.us ? "text-primary" : "text-foreground")}>{inr(r.price)}</div>
              <div className="whitespace-nowrap text-xs font-semibold text-muted-foreground sm:mt-1">{r.unit}</div>
            </div>
            <div className="col-span-full h-3.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cx("h-full rounded-full transition-[width] duration-[1400ms] ease-mf", r.us ? "bg-gradient-to-r from-primary to-brand-2" : "bg-muted-foreground/60")}
                style={{ width: seen ? `${Math.max((r.price / top) * 100, 0.8)}%` : "0%", transitionDelay: `${i * 150}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-7 flex w-[min(1120px,calc(100%-var(--gutter)*2))] flex-wrap items-center justify-between gap-5">
        {conclusion ? (
          <p className="max-w-[640px] text-[clamp(20px,2.2vw,26px)] font-bold leading-[1.3] tracking-[-0.02em] text-balance [&_span]:text-primary">
            {conclusion.split(/(\*[^*]+\*)/g).map((p, i) => (/^\*[^*]+\*$/.test(p) ? <span key={i}>{p.slice(1, -1)}</span> : p))}
          </p>
        ) : <span />}
        <a href="#pricing" className={cx(button.lg, tone.dark)}>See all prices →</a>
      </div>
    </section>
  );
}
