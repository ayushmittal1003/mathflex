"use client";
import Link from "next/link";
import { useState } from "react";
import { inr } from "@/lib/format";
import { Caret, Mark, PlayIcon } from "../primitives";
import { button, cx, tone } from "../ui";
import { glyphSize, type HomeChapter } from "./types";

// 12 Final CTA with a fan of real chapter posters that spreads on hover.
export function FinalCta({ chapters, minPrice, anyFree }: { chapters: HomeChapter[]; minPrice: number | null; anyFree: boolean }) {
  const [spread, setSpread] = useState(false);
  // Prefer high-weightage chapters for the fan, like the design's hand-picked set.
  const fan = [...chapters].sort((a, b) => b.jeeWeightage - a.jeeWeightage).slice(0, 7);
  const mid = (fan.length - 1) / 2;

  return (
    <section className="overflow-hidden pt-24">
      <div className="px-6 text-center">
        <h2 className="mx-auto max-w-[1000px] text-[clamp(44px,7vw,92px)] font-extrabold leading-none tracking-[-0.045em] text-balance">
          Your IIT seat starts with one{" "}
          <Mark>
            chapter
            <Caret />
          </Mark>
        </h2>
        <p className="mx-auto mt-6 max-w-[520px] text-lg leading-[1.55] text-secondary-foreground">
          {anyFree ? "Watch Part 1 free today. If it clicks, the rest of the chapter is yours" : "Pick the chapter you're stuck on. It's yours"}
          {minPrice !== null ? ` from ${inr(minPrice)}.` : "."}
        </p>
        <div className="mt-8.5 flex flex-wrap justify-center gap-3">
          {anyFree && (
            <a href="#previews" className={cx(button.lg, tone.primary)}>
              <PlayIcon /> Watch Part 1 free
            </a>
          )}
          <a href="#pricing" className={cx(button.lg, tone.secondary, "text-foreground")}>See pricing</a>
        </div>
      </div>
      {fan.length > 0 && (
        <div
          onMouseEnter={() => setSpread(true)}
          onMouseLeave={() => setSpread(false)}
          className="relative mt-16 flex h-[300px] justify-center"
        >
          {fan.map((c, i) => {
            const k = i - mid;
            const rot = k * (spread ? 11 : 7);
            const x = k * (spread ? 150 : 92);
            const y = Math.abs(k) * (spread ? 10 : 16);
            return (
              <Link
                key={c.id}
                href={`/chapter/${c.slug}`}
                className="absolute -bottom-[110px] left-1/2 -ml-[85px] aspect-[2/3] w-[170px] origin-[50%_140%] overflow-hidden rounded-xl text-white shadow-[0_20px_40px_-16px_rgb(0_0_0/0.4)] transition-transform duration-700 ease-mf"
                style={{ background: `linear-gradient(155deg, ${c.coverFrom}, ${c.coverTo})`, transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`, zIndex: 10 - Math.abs(Math.round(k)) }}
              >
                <div className={cx("absolute -right-2 top-1 whitespace-nowrap font-black leading-none text-white/20", glyphSize(c.symbol, "text-[70px]", "text-[120px]"))}>{c.symbol}</div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgb(255_255_255/0.22),transparent_45%),linear-gradient(transparent_30%,rgb(0_0_0/0.75)_60%)]" />
                <div className="absolute inset-x-3 top-[150px] text-[15px] font-extrabold leading-[1.15] tracking-[-0.02em]">{c.title}</div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
