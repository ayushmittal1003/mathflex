"use client";
import { useState } from "react";
import { inr, pctOff } from "@/lib/format";
import { BuyButton } from "../BuyButton";
import { CheckIcon, Mark, SectionHead } from "../primitives";
import { cx } from "../ui";
import type { HomeChapter, HomeCourse } from "./types";

// 09 Pricing: a single-chapter picker plus every published course (prices, MRP and
// highlights are managed in admin). The course with the most chapters gets the dark
// "Best value" card. Buttons add to the existing cart.
export function PricingSection({ chapters, courses, coupon }: { chapters: HomeChapter[]; courses: HomeCourse[]; coupon: { code: string; description: string } | null }) {
  const [pick, setPick] = useState(0);
  const pc = chapters[Math.min(pick, chapters.length - 1)];
  const best = courses.length > 1 ? [...courses].sort((a, b) => b.chapterCount - a.chapterCount)[0] : null;
  const plain = courses.filter((c) => c !== best).slice(0, best ? 2 : 3);
  const cta = "flex justify-center rounded-lg p-3 text-[15px] font-bold transition duration-200 hover:brightness-97";

  return (
    <section id="pricing" className="scroll-mt-6 py-22">
      <SectionHead
        eyebrow="Pricing"
        title={<>Pocket-money pricing for <Mark>IIT-level</Mark> prep.</>}
        lead="Start with one chapter. Move to a full class whenever you are ready."
      />
      <div className="mx-auto mt-12 grid w-[min(1120px,calc(100%-48px))] grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] items-stretch gap-4">
        {pc && (
          <div className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-[0_1px_4px_0_rgb(0_0_0/0.08)]">
            <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Single chapter</div>
            <div className="relative mt-4">
              <select
                aria-label="Pick a chapter"
                value={pick}
                onChange={(e) => setPick(Number(e.target.value))}
                className="w-full cursor-pointer appearance-none rounded-lg border border-border bg-muted py-2.5 pl-3 pr-8.5 text-sm font-bold text-foreground"
              >
                {chapters.map((c, i) => <option key={c.id} value={i}>Class {c.classLevel} · {c.title}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
            </div>
            <Price price={pc.price} mrp={pc.mrp} />
            <div className="text-[13px] text-muted-foreground">{pc.parts.length} parts{pc.jeeWeightage > 0 && ` · ${pc.jeeWeightage}% of JEE Main`}</div>
            <Checks items={["Every part of the chapter", "DPPs + PYQs for each part", "Notes for the chapter"]} />
            <div className="mt-auto pt-6">
              <BuyButton item={{ type: "CHAPTER", id: pc.id }} className={cx(cta, "w-full border border-border bg-secondary text-secondary-foreground")}>Buy this chapter</BuyButton>
            </div>
          </div>
        )}

        {plain.map((c) => {
          const off = pctOff(c.price, c.mrp);
          return (
            <div key={c.id} className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-[0_1px_4px_0_rgb(0_0_0/0.08)]">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">{c.title}</div>
                {off > 0 && <span className="shrink-0 whitespace-nowrap rounded-md bg-ok/15 px-2 py-0.5 text-[11px] font-bold text-ok">Save {off}%</span>}
              </div>
              <Price price={c.price} mrp={c.mrp} />
              <div className="text-[13px] text-muted-foreground">{c.subtitle || `${c.chapterCount} chapters`}</div>
              <Checks items={c.highlights} />
              <div className="mt-auto pt-6">
                <BuyButton item={{ type: "COURSE", id: c.id }} className={cx(cta, "w-full border border-border bg-secondary text-secondary-foreground")}>Get {c.title}</BuyButton>
              </div>
            </div>
          );
        })}

        {best && (
          <div className="relative flex flex-col overflow-hidden rounded-xl bg-foreground p-6 text-white shadow-[0_30px_60px_-24px_rgb(80_20_0/0.5)]">
            <div aria-hidden className="absolute -bottom-[70px] -right-4.5 text-[220px] font-black leading-none text-white/6">Σ</div>
            <div className="relative flex items-center justify-between gap-2">
              <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/70">{best.title}</div>
              <span className="shrink-0 whitespace-nowrap rounded-md bg-primary px-2 py-0.5 text-[11px] font-extrabold">Best value</span>
            </div>
            <Price price={best.price} mrp={best.mrp} dark />
            <div className="relative text-[13px] text-white/70">
              {best.subtitle || `${best.chapterCount} chapters`}
              {pctOff(best.price, best.mrp) > 0 && ` · save ${pctOff(best.price, best.mrp)}%`}
            </div>
            <Checks items={best.highlights} dark />
            <div className="relative mt-auto pt-6">
              <BuyButton item={{ type: "COURSE", id: best.id }} className={cx(cta, "w-full bg-primary text-primary-foreground hover:brightness-108")}>Get {best.title}</BuyButton>
            </div>
          </div>
        )}
      </div>
      <p className="mx-6 mt-7 text-center text-sm text-muted-foreground">
        Pay with UPI, cards or netbanking.
        {coupon && (
          <>
            {" "}New here? Use{" "}
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono font-bold text-foreground">{coupon.code}</span>
            {coupon.description && <> · {coupon.description}</>}
          </>
        )}
      </p>
    </section>
  );
}

function Price({ price, mrp, dark = false }: { price: number; mrp: number; dark?: boolean }) {
  return (
    <div className="relative mt-4 flex items-baseline gap-2">
      <span className="text-[42px] font-extrabold tracking-[-0.035em]">{inr(price)}</span>
      {mrp > price && <span className={cx("text-[15px] line-through", dark ? "text-white/55" : "text-muted-foreground")}>{inr(mrp)}</span>}
    </div>
  );
}

function Checks({ items, dark = false }: { items: string[]; dark?: boolean }) {
  if (!items.length) return null;
  return (
    <div className="relative mt-5.5 grid gap-2.5">
      {items.map((it) => (
        <div key={it} className="flex gap-2.5 text-sm leading-[1.4]">
          <CheckIcon className={cx("mt-0.5 size-4 shrink-0", dark ? "text-[oklch(0.8_0.15_60)]" : "text-ok")} />
          <span>{it}</span>
        </div>
      ))}
    </div>
  );
}
