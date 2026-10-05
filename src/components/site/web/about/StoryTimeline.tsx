"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cx } from "../ui";

export type Step = { tag: string; t: string; d: string; you?: boolean };

// "The story so far": a vertical step line that fills as you scroll. Each step drops in from
// above when it reaches the reading line, and its marker lights up once the fill passes it.
// Alternates sides on wide screens; single column on phones. Respects reduced motion.
export function StoryTimeline({ steps }: { steps: Step[] }) {
  const wrap = useRef<HTMLOListElement>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const [fill, setFill] = useState(0);
  const [shown, setShown] = useState(0);
  const [passed, setPassed] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const line = window.innerHeight * 0.6; // the "reading line"
      setFill(Math.min(1, Math.max(0, (line - r.top) / r.height)));
      let s = 0;
      let p = 0;
      items.current.forEach((li) => {
        if (!li) return;
        const b = li.getBoundingClientRect();
        if (b.top < window.innerHeight * 0.85) s++;
        if (b.top + 14 < line) p++;
      });
      setShown(s);
      setPassed(p);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <ol ref={wrap} className="relative mx-auto mt-16 w-[min(920px,calc(100%-48px))]">
      {/* rail + scroll fill */}
      <span aria-hidden className="absolute bottom-2 left-[15px] top-2 w-[3px] rounded-full bg-border min-[860px]:left-1/2 min-[860px]:-translate-x-1/2" />
      <span
        aria-hidden
        className="absolute left-[15px] top-2 w-[3px] origin-top rounded-full bg-gradient-to-b from-primary to-brand-2 transition-[height] duration-150 ease-out motion-reduce:transition-none min-[860px]:left-1/2 min-[860px]:-translate-x-1/2"
        style={{ height: `calc((100% - 16px) * ${fill})` }}
      />
      {steps.map((s, i) => {
        const right = i % 2 === 1;
        const visible = i < shown;
        const lit = i < passed;
        return (
          <li
            key={s.tag}
            ref={(el) => { items.current[i] = el; }}
            className={cx("relative pb-12 pl-14 last:pb-0 min-[860px]:grid min-[860px]:grid-cols-2 min-[860px]:gap-16 min-[860px]:pl-0")}
          >
            {/* marker */}
            <span
              className={cx(
                "absolute left-0 top-1 z-10 grid size-[33px] place-items-center rounded-full border-[3px] font-mono text-[11px] font-extrabold transition-all duration-500 ease-mf min-[860px]:left-1/2 min-[860px]:-translate-x-1/2",
                lit
                  ? s.you ? "border-primary bg-primary text-white shadow-[0_0_0_7px_color-mix(in_oklab,var(--primary)_16%,transparent)]" : "border-foreground bg-foreground text-white"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            {/* card */}
            <div
              className={cx(
                "transition-all duration-700 ease-mf motion-reduce:transition-none",
                right ? "min-[860px]:col-start-2" : "min-[860px]:col-start-1 min-[860px]:text-right",
                visible ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0",
              )}
            >
              <div
                className={cx(
                  "rounded-xl border p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-36px_rgb(80_20_0/0.45)]",
                  s.you ? "border-primary/40 bg-selected" : "border-border bg-card",
                )}
              >
                <div className={cx("font-mono text-xs font-bold uppercase tracking-[0.1em]", s.you ? "text-primary" : "text-muted-foreground")}>{s.tag}</div>
                <h3 className="mt-2 text-[22px] font-extrabold leading-[1.2] tracking-[-0.025em]">{s.t}</h3>
                <p className="mt-2 text-[15px] leading-[1.6] text-secondary-foreground">{s.d}</p>
                {s.you && <Link href="/chapters" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-cta hover:brightness-108">Find your chapter →</Link>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
