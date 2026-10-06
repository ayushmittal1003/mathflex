"use client";
import { useEffect, useRef, useState } from "react";
import { inr } from "@/lib/format";
import { problem } from "@/lib/site-content";
import { Mark, SectionHead } from "../primitives";
import { button, cx, tone } from "../ui";
import type { HomeCourse } from "./types";

// 04 The problem: approximate competitor prices (static copy) against our live prices.
// Bars grow when the section scrolls into view.
export function CostCompare({ fullCourse, minChapterPrice }: { fullCourse: HomeCourse | null; minChapterPrice: number | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return setSeen(true);
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const top = problem.competitors[0].price;
  const rows = [
    ...problem.competitors.map((c) => ({ name: c.name, note: c.note, price: c.price, unit: c.unit, us: false })),
    ...(fullCourse ? [{ name: fullCourse.title, note: problem.courseNote, price: fullCourse.price, unit: "one-time", us: true }] : []),
    ...(minChapterPrice !== null ? [{ name: "One chapter", note: problem.chapterNote, price: minChapterPrice, unit: "starting price", us: true }] : []),
  ];
  // e.g. ₹1,50,000 ÷ ₹149 ≈ 1/1000th. Derived from the figures shown above it.
  const ratio = minChapterPrice ? Math.round(top / minChapterPrice / 100) * 100 : 0;

  return (
    <section className="py-22">
      <SectionHead eyebrow="The problem" title={<>JEE maths shouldn&apos;t cost a <Mark>lakh</Mark>.</>} lead={problem.lead} />
      <div ref={ref} className="mx-auto mt-12 w-[min(1120px,calc(100%-48px))] overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_4px_0_rgb(0_0_0/0.08)]">
        {rows.map((r, i) => (
          <div
            key={r.name}
            className={cx("grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-7 gap-y-4 px-5 py-6 sm:px-7", i > 0 && "border-t border-border", r.us && "bg-primary/4")}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[17px] font-extrabold tracking-[-0.02em]">{r.name}</span>
                {r.us && <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-primary-foreground">Mathflex</span>}
              </div>
              <div className="mt-1 text-sm leading-[1.45] text-muted-foreground">{r.note}</div>
            </div>
            <div className="text-right">
              <div className={cx("whitespace-nowrap text-[30px] font-extrabold leading-none tracking-[-0.035em]", r.us ? "text-primary" : "text-foreground")}>{inr(r.price)}</div>
              <div className="mt-1 whitespace-nowrap text-xs font-semibold text-muted-foreground">{r.unit}</div>
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
      <div className="mx-auto mt-7 flex w-[min(1120px,calc(100%-48px))] flex-wrap items-center justify-between gap-5">
        {ratio > 0 ? (
          <p className="max-w-[640px] text-[clamp(20px,2.2vw,26px)] font-bold leading-[1.3] tracking-[-0.02em] text-balance">
            One Mathflex chapter costs about <span className="text-primary">1/{ratio}th</span> of a year at a big coaching institute.
          </p>
        ) : <span />}
        <a href="#pricing" className={cx(button.lg, tone.dark)}>See all prices →</a>
      </div>
    </section>
  );
}
