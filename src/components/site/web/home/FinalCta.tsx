"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { inr } from "@/lib/format";
import { Caret, Mark, MathSymbol, PlayIcon, cleanSymbol } from "../primitives";
import { button, cx, tone } from "../ui";
import { glyphSize, type HomeChapter } from "./types";

// 12 Final CTA with a fan of chapter cards, each showing its maths symbol, that spreads on hover.
export function FinalCta({ chapters, minPrice }: { chapters: HomeChapter[]; minPrice: number | null }) {
  const [spread, setSpread] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 759px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  // Prefer high-weightage chapters for the fan, like the design's hand-picked set.
  const fan = [...chapters].sort((a, b) => b.jeeWeightage - a.jeeWeightage).slice(0, 7);
  const mid = (fan.length - 1) / 2;

  return (
    <section className="px-4 pt-14 tablet:pt-24">
      <div className="mx-auto max-w-[1240px] overflow-hidden rounded-2xl bg-wash pt-12 shadow-[0_30px_60px_-50px_rgb(80_20_0/0.5)] tablet:pt-20">
      <div className="px-6 text-center">
        <h2 className="mx-auto max-w-[1000px] text-[clamp(34px,7vw,92px)] font-extrabold leading-[1.1] tablet:leading-none tracking-[-0.045em] text-balance">
          Your IIT seat starts with one{" "}
          <Mark>
            chapter
            <Caret />
          </Mark>
        </h2>
        <p className="mx-auto mt-6 max-w-[520px] text-lg leading-[1.55] text-secondary-foreground">
          {chapters.length ? "Watch a chapter preview today. If it clicks, the whole chapter is yours" : "Pick the chapter you're stuck on. It's yours"}
          {minPrice !== null ? ` from ${inr(minPrice)}.` : "."}
        </p>
        <div className="mt-8.5 cta-row">
          {chapters.length > 0 && (
            <a href="#previews" className={cx(button.lg, tone.primary)}>
              <PlayIcon /> Watch a preview
            </a>
          )}
          <a href="#pricing" className={cx(button.lg, tone.secondary, "text-foreground")}>See pricing</a>
        </div>
      </div>
      {fan.length > 0 && (
        <div
          onMouseEnter={() => setSpread(true)}
          onMouseLeave={() => setSpread(false)}
          className="relative mt-8 flex h-[170px] justify-center tablet:mt-16 tablet:h-[300px]"
        >
          {fan.map((c, i) => {
            const k = i - mid;
            const rot = k * (spread ? 11 : 7);
            // Closer together on phones, so the side cards' titles stay on screen.
            const x = k * (spread ? 150 : narrow ? 64 : 92);
            const y = Math.abs(k) * (spread ? 10 : 16);
            return (
              <Link
                key={c.id}
                href={`/chapter/${c.slug}`}
                className="absolute -bottom-[110px] left-1/2 -ml-[85px] aspect-[2/3] w-[170px] origin-[50%_140%] overflow-hidden rounded-xl border border-white/10 bg-foreground text-white shadow-[0_20px_40px_-16px_rgb(0_0_0/0.4)] transition-transform duration-700 ease-mf"
                style={{ transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`, zIndex: 10 - Math.abs(Math.round(k)) }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,color-mix(in_oklab,var(--primary)_55%,transparent),transparent_65%)]" />
                <div aria-hidden className={cx("absolute inset-x-0 top-5 whitespace-nowrap text-center font-black leading-[1.1]", glyphSize(cleanSymbol(c.symbol), "text-[48px]", "text-[72px]"))}><MathSymbol symbol={cleanSymbol(c.symbol)} /></div>
                {/* On phones the side cards are mostly tucked behind the middle one, so only its title shows. */}
                {(!narrow || Math.round(k) === 0) && <div className="absolute inset-x-3 top-[104px] line-clamp-2 text-center text-[14px] font-extrabold leading-[1.15] tracking-[-0.02em]">{c.title}</div>}
              </Link>
            );
          })}
        </div>
      )}
      </div>
    </section>
  );
}
