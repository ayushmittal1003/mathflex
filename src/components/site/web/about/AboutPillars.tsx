"use client";
import { useRef } from "react";
import { cx } from "../ui";

export type Pillar = { key: string; kicker: string; big: string; small: string; body: string };

// Swipeable proof cards (Allen's "Legacy & impact" row, on our tokens). First card is dark.
export function AboutPillars({ pillars }: { pillars: Pillar[] }) {
  const row = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => row.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  return (
    <div className="relative">
      <div className="mx-auto flex w-[min(1240px,calc(100%-48px))] justify-end gap-2">
        {[-1, 1].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => scroll(d)}
            aria-label={d < 0 ? "Previous" : "Next"}
            className="hidden size-10 place-items-center rounded-full border border-border bg-card text-foreground transition hover:scale-[1.06] hover:border-foreground tablet:grid"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={d < 0 ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
            </svg>
          </button>
        ))}
      </div>
      <div
        ref={row}
        className="no-scrollbar mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-px-6 px-6 pb-4 min-[1288px]:px-[calc((100%-1240px)/2)] min-[1288px]:scroll-px-[calc((100%-1240px)/2)]"
      >
        {pillars.map((p, i) => {
          const dark = i === 0;
          return (
            <article
              key={p.key}
              className={cx(
                "flex w-[min(300px,82vw)] shrink-0 snap-start flex-col rounded-xl border p-6 transition duration-300 ease-mf hover:-translate-y-1",
                dark ? "border-foreground bg-foreground text-white shadow-[0_30px_60px_-30px_rgb(80_20_0/0.55)]" : "border-border bg-card shadow-[0_20px_44px_-34px_rgb(80_20_0/0.45)]",
              )}
            >
              <span className={cx("text-xs font-extrabold uppercase tracking-[0.1em]", dark ? "text-brand-2" : "text-primary")}>{p.kicker}</span>
              <span className="mt-8 text-[clamp(44px,5vw,60px)] font-extrabold leading-none tracking-[-0.05em]">{p.big}</span>
              <span className={cx("mt-2 text-[15px] font-bold", dark ? "text-white/85" : "text-foreground")}>{p.small}</span>
              <span className={cx("mt-auto pt-6 text-sm leading-[1.55]", dark ? "text-white/65" : "text-muted-foreground")}>{p.body}</span>
            </article>
          );
        })}
      </div>
    </div>
  );
}
