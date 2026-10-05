"use client";
import { useRef } from "react";
import { cx } from "../ui";

export type Pillar = { key: string; kicker: string; big: string; small: string; body: string };

const GLYPH: Record<string, string> = { mentor: "★", chapters: "∑", hours: "∞", practice: "✓", price: "₹" };

// Swipeable proof cards (Allen's "Legacy & impact" row, on our tokens). The scroll row has
// vertical padding so card shadows aren't clipped; the first card is the dark lead.
export function AboutPillars({ pillars }: { pillars: Pillar[] }) {
  const row = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => row.current?.scrollBy({ left: dir * 340, behavior: "smooth" });

  return (
    <div className="relative">
      <div className="mx-auto flex w-[min(1240px,calc(100%-48px))] justify-end gap-2">
        {[-1, 1].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => scroll(d)}
            aria-label={d < 0 ? "Previous" : "Next"}
            className="hidden size-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-[0_6px_16px_-10px_rgb(0_0_0/0.3)] transition hover:scale-[1.06] hover:border-foreground tablet:grid"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={d < 0 ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
            </svg>
          </button>
        ))}
      </div>
      <div
        ref={row}
        className="no-scrollbar -mt-2 flex snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain scroll-px-6 px-6 pb-16 pt-8 min-[1288px]:scroll-px-[calc((100%-1240px)/2)] min-[1288px]:px-[calc((100%-1240px)/2)]"
      >
        {pillars.map((p, i) => {
          const dark = i === 0;
          return (
            <article
              key={p.key}
              className={cx(
                "relative flex min-h-[340px] w-[min(310px,82vw)] shrink-0 snap-start flex-col overflow-hidden rounded-xl p-7 transition duration-500 ease-mf hover:-translate-y-1.5",
                dark
                  ? "bg-foreground text-white shadow-[0_2px_4px_rgb(0_0_0/0.08),0_28px_50px_-26px_rgb(80_20_0/0.55)]"
                  : "bg-card ring-1 ring-border shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_44px_-30px_rgb(80_20_0/0.35)] hover:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_30px_54px_-30px_rgb(80_20_0/0.45)]",
              )}
            >
              {dark && <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full" style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--brand-2) 45%, transparent), transparent)" }} />}
              <span aria-hidden className={cx("pointer-events-none absolute -right-3 -top-7 select-none text-[130px] font-black leading-none", dark ? "text-white/[0.06]" : "text-foreground/[0.04]")}>{GLYPH[p.key] ?? "•"}</span>
              <div className="relative flex items-center gap-2.5">
                <span className={cx("grid size-9 place-items-center rounded-lg text-base font-black", dark ? "bg-white/10 text-brand-2" : "bg-primary/8 text-primary")}>{GLYPH[p.key] ?? "•"}</span>
                <span className={cx("text-xs font-extrabold uppercase tracking-[0.1em]", dark ? "text-white/70" : "text-muted-foreground")}>{p.kicker}</span>
              </div>
              <span className={cx("relative mt-9 text-[clamp(48px,5vw,64px)] font-extrabold leading-none tracking-[-0.05em]", dark && "bg-gradient-to-br from-white to-[color-mix(in_oklab,var(--brand-2)_60%,white)] bg-clip-text text-transparent")}>{p.big}</span>
              <span className={cx("relative mt-2.5 text-[15px] font-bold leading-snug", dark ? "text-white/90" : "text-foreground")}>{p.small}</span>
              <span className={cx("relative mt-auto pt-6 text-sm leading-[1.6]", dark ? "text-white/60" : "text-muted-foreground")}>{p.body}</span>
            </article>
          );
        })}
      </div>
    </div>
  );
}
