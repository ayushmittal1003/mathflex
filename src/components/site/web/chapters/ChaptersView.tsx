"use client";
import { PosterImage } from "@/components/site/web/PosterImage";
import { HoverClip } from "@/components/site/web/HoverClip";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { track } from "@/lib/track";
import { useRouter } from "next/navigation";
import { inr } from "@/lib/format";
import { ChapterCard, type CardChapter } from "../ChapterCard";
import { BottomSheet } from "../BottomSheet";
import { Caret, CheckIcon, Eyebrow, LockIcon, Mark, MathSymbol, PlayIcon, SectionHead, cleanSymbol } from "../primitives";
import { WashHero, heroH1, heroLead, splitH2 } from "../WashHero";
import { cx } from "../ui";
import { clock } from "../home/types";

type Peek = {
  id: string; slug: string; title: string; classLevel: number; price: number; mrp: number; coverFrom: string; coverTo: string; coverImage: string | null; symbol: string; jeeWeightage: number;
  parts: { id: string; order: number; title: string; durationSec: number; isFreePreview: boolean }[];
};
type Bundle = { id: string; slug: string; title: string; subtitle: string; price: number; mrp: number; chapterCount: number; breakeven: number | null };
type Sort = "default" | "weight" | "price";
const SORTS: [Sort, string][] = [["default", "Syllabus order"], ["weight", "Sort: JEE weightage"], ["price", "Sort: price, low to high"]];

export function ChaptersView({ chapters, top5, peek, bundles, initial }: { chapters: CardChapter[]; top5: (CardChapter & { formula: string | null; focus: string[] })[]; peek: Peek | null; bundles: Bundle[]; initial: { q: string; cls: number | "all"; sort: Sort } }) {
  const [q, setQ] = useState(initial.q);
  const [cls, setCls] = useState<number | "all">(initial.cls);
  const [sort, setSort] = useState<Sort>(initial.sort);
  const [freeOnly, setFreeOnly] = useState(false);
  const [sheet, setSheet] = useState(false);

  const classes = [...new Set(chapters.map((c) => c.classLevel))].sort();
  const anyFree = chapters.some((c) => c.free);
  const minPrice = chapters.length ? Math.min(...chapters.map((c) => c.price)) : null;
  const parts = chapters.map((c) => c.partsCount).filter(Boolean);
  const partsRange = parts.length ? (Math.min(...parts) === Math.max(...parts) ? `${Math.min(...parts)}` : `${Math.min(...parts)}–${Math.max(...parts)}`) : null;
  const popular = chapters.filter((c) => c.isTrending).slice(0, 4);
  const best = bundles.length > 1 ? [...bundles].sort((a, b) => b.chapterCount - a.chapterCount)[0] : null;
  const breakeven = bundles.map((b) => b.breakeven).filter((n): n is number => !!n && n > 1).sort((a, b) => a - b)[0];

  const list = useMemo(() => {
    let l = chapters.filter((c) => (cls === "all" || c.classLevel === cls) && (!freeOnly || c.free) && matchesChapter(c.title, q));
    if (sort === "weight") l = [...l].sort((a, b) => b.jeeWeightage - a.jeeWeightage);
    if (sort === "price") l = [...l].sort((a, b) => a.price - b.price);
    return l;
  }, [chapters, q, cls, sort, freeOnly]);

  // Grouped by class in syllabus order; one flat grid when sorted.
  const groups = sort === "default" ? classes.map((n) => ({ title: `Class ${n}`, rows: list.filter((c) => c.classLevel === n) })).filter((g) => g.rows.length) : [{ title: "", rows: list }];
  const activeFilters = (cls !== "all" ? 1 : 0) + (sort !== "default" ? 1 : 0) + (freeOnly ? 1 : 0);
  const reset = () => { setQ(""); setCls("all"); setFreeOnly(false); setSort("default"); };
  const goList = () => document.getElementById("all")?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <WashHero peek={!!peek}>
        <div className="px-4 pt-10 text-center tablet:px-6">
          <Eyebrow dot="ok" onWash>{chapters.length} chapters · Class {classes.join(" & ")}{anyFree && " · Free previews"}</Eyebrow>
          <h1 className={cx(heroH1, "mt-6 max-w-[980px]")}>
            Find the chapter that&apos;s costing you{" "}
            <Mark onWash>marks<Caret /></Mark>
          </h1>
          <p className={cx(heroLead, "mt-5.5")}>
            Every chapter is split into {partsRange ? `${partsRange} parts` : "short parts"}, with DPPs, PYQs and notes. Buy just the one you need{minPrice !== null && `, from ${inr(minPrice)}`}.
          </p>
          <ChapterSearch chapters={chapters} q={q} setQ={setQ} onSeeAll={goList} />
          {popular.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 max-sm:[&>button:nth-of-type(n+3)]:hidden">
              <span className="text-[13px] text-secondary-foreground">Popular:</span>
              {popular.map((p) => (
                <button key={p.id} type="button" onClick={() => { setQ(p.title); goList(); }} className="tap relative rounded-full border border-white/95 bg-white/75 px-3 py-1.5 text-[13px] font-semibold text-foreground transition hover:bg-card">
                  {p.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {peek && <HeroPeek peek={peek} />}
      </WashHero>

      {top5.length > 0 && (
        <section id="top" className="overflow-hidden pb-12 pt-12 tablet:pb-18 tablet:pt-24">
          <SectionHead
            eyebrow="Highest JEE weightage"
            dot="gold"
            title={<>Most marks for your <Mark>time</Mark>.</>}
            lead="The chapters that carry the most weight across recent JEE Main papers. Short on time? Start here."
          />
          <p className="mt-3 text-center text-sm text-muted-foreground">
            New to JEE? Read the <Link href="/jee-exam" className="font-bold text-primary underline underline-offset-[3px]">JEE 2027 exam guide</Link>: dates, pattern and syllabus.
          </p>
          <div className="no-scrollbar mx-auto mt-10 w-[min(1240px,calc(100%-var(--gutter)*2))] overflow-x-auto overflow-y-hidden overscroll-x-contain px-1 pb-5 pt-6">
            <div className="mx-auto flex w-max gap-4">
            {top5.map((c, i) => (
              <Link key={c.id} href={`/chapter/${c.slug}`} className="relative flex w-[232px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card p-5 text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-38px_rgb(80_20_0/0.4)] transition duration-300 ease-mf hover:-translate-y-1 hover:border-primary/40">
                <span aria-hidden className={cx("absolute -right-1 -top-1 whitespace-nowrap font-black leading-none text-primary/10", cleanSymbol(c.symbol).length > 2 ? "text-[48px]" : "text-[84px]")}><MathSymbol symbol={cleanSymbol(c.symbol)} /></span>
                <span className="grid size-8 place-items-center rounded-lg bg-foreground text-sm font-extrabold text-card">{i + 1}</span>
                <span className="mt-4 block text-[40px] font-black leading-none tracking-[-0.04em] text-primary tabular-nums">{c.jeeWeightage}%</span>
                <span className="mt-1 block text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">JEE Main weightage</span>
                <span aria-hidden className="mt-3 block h-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${(c.jeeWeightage / top5[0].jeeWeightage) * 100}%` }} /></span>
                <span className="mt-4 block text-[17px] font-extrabold leading-[1.2] tracking-[-0.02em]">{c.title}</span>
                {c.formula && (
                  // rendered on the server by chapterFormulas from our own list
                  <span aria-hidden className="mt-3 block overflow-hidden whitespace-nowrap rounded-lg bg-muted px-3 py-2.5 text-[13px]" dangerouslySetInnerHTML={{ __html: c.formula }} />
                )}
                <span className="mt-4 block text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">Focus on</span>
                <span className="mt-2 mb-4 flex flex-col gap-1.5">
                  {c.focus.map((f) => (
                    <span key={f} className="flex items-start gap-2 text-[13px] font-semibold leading-[1.3] text-secondary-foreground">
                      <CheckIcon className="mt-0.5 size-3 shrink-0 text-primary" strokeWidth={3.5} /> {f}
                    </span>
                  ))}
                </span>
                <span className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3 text-[13px]">
                  <span className="text-muted-foreground">Class {c.classLevel} · {inr(c.price)}</span>
                  <span className="font-extrabold text-primary">Start →</span>
                </span>
              </Link>
            ))}
            </div>
          </div>
        </section>
      )}

      {/* Sticky filter bar (design.md §3.6), parked under the sticky site nav. On phones it is one
          row (search + Filters button) and the rest lives in a bottom sheet (design.md §6a). */}
      <div id="all" className="sticky top-[67px] z-30 scroll-mt-[67px] border-y border-border bg-card/90 backdrop-blur-lg">
        <div className="mx-auto flex w-[min(1240px,calc(100%-var(--gutter)*2))] items-center gap-x-3 gap-y-2.5 py-2 tablet:flex-wrap tablet:py-3">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 tablet:max-w-[340px] tablet:flex-[1_1_220px]">
            <svg className="size-[15px] shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chapters" aria-label="Search chapters" className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground" />
            {q && <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="tap relative grid size-5.5 shrink-0 place-items-center rounded-full bg-muted text-[13px] leading-none">×</button>}
          </label>
          <button type="button" onClick={() => setSheet(true)} aria-haspopup="dialog" className="relative flex h-11 shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-bold text-foreground tablet:hidden">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            Filters
            {activeFilters > 0 && <span className="grid size-5 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{activeFilters}</span>}
          </button>
          <div className="hidden flex-wrap items-center gap-x-3 gap-y-2.5 tablet:contents">
            <div className="flex shrink-0 gap-0.5 rounded-lg bg-foreground p-1">
              {(["all", ...classes] as const).map((v) => (
                <button key={v} type="button" onClick={() => setCls(v)} aria-pressed={cls === v} className={cx("tap relative whitespace-nowrap rounded-md px-3 py-[7px] text-[13px] font-bold", cls === v ? "bg-card text-foreground" : "text-white/75 hover:text-white")}>
                  {v === "all" ? "All" : `Class ${v}`}
                </button>
              ))}
            </div>
            <div className="relative shrink-0">
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort chapters" className="h-11 cursor-pointer appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-[13px] font-bold text-foreground">
                {SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 size-[13px] -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
            </div>
            {anyFree && (
              <button type="button" role="switch" aria-checked={freeOnly} onClick={() => setFreeOnly((f) => !f)} className="tap relative flex shrink-0 items-center gap-2.5 whitespace-nowrap text-[13px] font-bold text-foreground">
                <span className={cx("relative h-5 w-9 rounded-full transition-colors", freeOnly ? "bg-ok" : "bg-border")}>
                  <span className={cx("absolute top-0.5 size-4 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-[left]", freeOnly ? "left-[18px]" : "left-0.5")} />
                </span>
                Free preview
              </button>
            )}
            <span className="ml-auto shrink-0 whitespace-nowrap text-[13px] font-semibold text-muted-foreground">
              {list.length} chapter{list.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {sheet && (
        <BottomSheet
          title="Filters"
          onClose={() => setSheet(false)}
          footer={
            <div className="flex gap-2.5">
              {activeFilters > 0 && <button type="button" onClick={() => { setCls("all"); setSort("default"); setFreeOnly(false); }} className="min-h-12 rounded-lg border border-border bg-card px-4 text-[15px] font-bold">Reset</button>}
              <button type="button" onClick={() => setSheet(false)} className="min-h-12 flex-1 rounded-lg bg-primary px-4 text-[15px] font-bold text-primary-foreground">Show {list.length} chapter{list.length === 1 ? "" : "s"}</button>
            </div>
          }
        >
          <div className="grid gap-5 pt-2">
            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Class</legend>
              <div className="flex gap-0.5 rounded-lg bg-foreground p-1">
                {(["all", ...classes] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setCls(v)} aria-pressed={cls === v} className={cx("min-h-11 flex-1 rounded-md px-3 text-sm font-bold", cls === v ? "bg-card text-foreground" : "text-white/75")}>
                    {v === "all" ? "All" : `Class ${v}`}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Sort by</legend>
              <div className="grid gap-2">
                {SORTS.map(([v, label]) => (
                  <button key={v} type="button" onClick={() => setSort(v)} aria-pressed={sort === v} className={cx("flex min-h-12 items-center justify-between rounded-lg border px-3.5 text-left text-[15px] font-bold", sort === v ? "border-foreground bg-muted" : "border-border")}>
                    {label}
                    {sort === v && <CheckIcon className="size-4" />}
                  </button>
                ))}
              </div>
            </fieldset>
            {anyFree && (
              <button type="button" role="switch" aria-checked={freeOnly} onClick={() => setFreeOnly((f) => !f)} className="flex min-h-12 items-center justify-between rounded-lg border border-border px-3.5 text-[15px] font-bold">
                Only chapters with a free preview
                <span className={cx("relative h-6 w-10 shrink-0 rounded-full transition-colors", freeOnly ? "bg-ok" : "bg-border")}>
                  <span className={cx("absolute top-0.5 size-5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-[left]", freeOnly ? "left-[18px]" : "left-0.5")} />
                </span>
              </button>
            )}
          </div>
        </BottomSheet>
      )}

      <section className="pb-14 pt-6 tablet:pb-24 tablet:pt-8">
        <div className="mx-auto w-[min(1240px,calc(100%-var(--gutter)*2))]">
          {groups.map((g) => (
            <div key={g.title || "all"} className="mb-10 last:mb-0">
              {g.title && (
                <div className="mb-5 flex items-baseline justify-between border-b-2 border-foreground pb-3">
                  <h2 className="text-[clamp(22px,2.4vw,28px)] font-extrabold tracking-[-0.03em]">{g.title}</h2>
                  <span className="text-[13px] font-semibold text-muted-foreground">{g.rows.length} chapters</span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] sm:gap-4 tablet:gap-5">
                {g.rows.map((c, i) => <ChapterCard key={c.id} c={c} index={i} />)}
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="px-6 py-18 text-center">
              <div className="text-2xl font-extrabold tracking-[-0.02em]">{q ? `No chapter matches “${q}”` : "No chapters match these filters"}</div>
              <p className="mt-2 text-[15px] text-muted-foreground">Try a shorter word, or clear the filters.</p>
              <button type="button" onClick={reset} className="mt-5 rounded-lg bg-foreground px-5 py-3 font-bold text-card">Show all chapters</button>
            </div>
          )}
        </div>
      </section>

      {bundles.length > 0 && (
        <section id="bundles" className="scroll-mt-16 py-12 tablet:py-20">
          <div className="mx-auto flex w-[min(1240px,calc(100%-var(--gutter)*2))] flex-wrap items-center gap-x-16 gap-y-10">
            <div className="min-w-0 flex-[1_1_360px]">
              <Eyebrow>Complete courses</Eyebrow>
              <h2 className={cx(splitH2, "mt-5.5")}>
                {breakeven ? <>Need {breakeven} or more chapters? Take the <Mark>whole class</Mark>.</> : <>Need most of a class? Take the <Mark>whole class</Mark>.</>}
              </h2>
              <p className="mt-4.5 max-w-[460px] text-base leading-[1.6] text-secondary-foreground">
                {breakeven ? `Past about ${breakeven} chapters, a full class works out cheaper than buying them one by one.` : "A full class usually works out cheaper than buying chapters one by one."}
              </p>
            </div>
            <div className="min-w-0 flex-[1.3_1_460px] border-t border-border">
              {bundles.map((b) => (
                <Link key={b.id} href={`/courses/${b.slug}`} className="flex items-center gap-5 border-b border-border px-1 py-5.5 text-foreground transition-[padding] duration-300 hover:pl-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl font-extrabold tracking-[-0.02em]">{b.title}</span>
                      {best?.id === b.id && <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-extrabold uppercase tracking-[0.06em] text-primary-foreground">Best value</span>}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{b.subtitle || `${b.chapterCount} chapters`}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[28px] font-extrabold tracking-[-0.03em]">{inr(b.price)}</div>
                    {b.mrp > b.price && <div className="text-xs text-muted-foreground line-through">{inr(b.mrp)}</div>}
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-base text-card">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function HeroPeek({ peek }: { peek: Peek }) {
  const free = peek.parts.find((p) => p.isFreePreview);
  const shown = peek.parts.slice(0, 3);
  // An uploaded thumbnail is shown whole (16:9) with the title under it, so its own text is never cut off.
  const fit = !!peek.coverImage;
  // On an uploaded thumbnail these would cover its corner, so they move into the title bar under it.
  const labels = (
    <div className={cx("flex gap-2", fit ? "mb-2" : "absolute left-3 top-3 tablet:left-5.5 tablet:top-5")}>
      <span className={cx("rounded-md px-2 py-1 text-xs font-bold uppercase tracking-[0.08em]", fit ? "bg-white/15" : "bg-black/35")}>Class {peek.classLevel}</span>
      {free && <span className="rounded-md bg-white px-2 py-1 text-xs font-bold uppercase tracking-[0.06em] text-black">Free preview</span>}
    </div>
  );
  return (
    <div className={cx("relative mx-auto mb-4 mt-10 grid w-[min(980px,calc(100%-var(--gutter)*2))] overflow-hidden rounded-xl border-[6px] border-foreground bg-card shadow-[0_40px_80px_-30px_rgb(80_20_0/0.45)] tablet:mt-14 tablet:-mb-[150px] tablet:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]", !fit && "tablet:h-[420px]")}>
      <div className="relative overflow-hidden text-white" style={{ background: `linear-gradient(125deg, ${peek.coverFrom}, ${peek.coverTo})` }}>
        {/* Phones always show the whole 16:9 thumbnail with the title under it; wider screens do too when there's an
            uploaded thumbnail, and overlay the title on the gradient poster when there isn't. */}
        <div className={cx("relative aspect-video", !fit && "tablet:absolute tablet:inset-0 tablet:aspect-auto")}>
        {peek.coverImage ? <PosterImage src={peek.coverImage} sizes="(max-width: 1000px) 100vw, 570px" /> : <div className="absolute -right-5 top-1/2 -translate-y-1/2 whitespace-nowrap text-[300px] font-black leading-none text-white/14">{peek.symbol}</div>}
        {!fit && <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent to-70%" />}
        <HoverClip chapterId={peek.id} />
        {!fit && labels}
        {free && (
          <Link href={`/learn/${peek.slug}?part=${free.order}`} aria-label={`Watch Part ${free.order} of ${peek.title} free`} className={cx("absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-primary shadow-[0_0_0_12px_rgb(255_255_255/0.16)] transition hover:scale-[1.06] tablet:size-18", !fit && "tablet:top-[38%]")}>
            <PlayIcon className="size-6" />
          </Link>
        )}
        </div>
        <div className={cx("relative bg-foreground p-4 text-left", !fit && "tablet:absolute tablet:inset-x-5.5 tablet:top-[200px] tablet:bg-transparent tablet:p-0")}>
          {fit && labels}
          {free && <div className="text-[13px] font-semibold opacity-85">Part {free.order} · {free.title}</div>}
          <div className={cx("mt-1 text-[22px] font-extrabold tracking-[-0.03em]", !fit && "tablet:text-[30px]")}>{peek.title}</div>
        </div>
      </div>
      <div className="hidden flex-col gap-2.5 p-5 text-left tablet:flex">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">{peek.parts.length} parts</span>
          {peek.jeeWeightage > 0 && <span className="rounded-md bg-brand-2/14 px-2 py-0.5 text-xs font-bold text-[oklch(0.5_0.17_47)]">{peek.jeeWeightage}% of JEE Main</span>}
        </div>
        {shown.map((p, i) => (
          <div key={p.id} className={cx("flex items-center gap-2.5 rounded-lg border p-2.5", p.isFreePreview ? "border-primary/35 bg-selected" : "border-border")}>
            <span className={cx("grid size-6.5 shrink-0 place-items-center rounded-full", p.isFreePreview ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
              {p.isFreePreview ? <PlayIcon className="size-2.5" /> : <LockIcon className="size-[11px]" />}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold">{p.title}</div>
              <div className="text-xs text-muted-foreground">
                {p.durationSec > 0 && `${clock(p.durationSec)} · `}
                {p.isFreePreview ? "Free preview" : i > 0 ? `Unlocks after Part ${shown[i - 1].order}` : "Unlocks after purchase"}
              </div>
            </div>
          </div>
        ))}
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[26px] font-extrabold tracking-[-0.03em]">{inr(peek.price)}</span>
          {peek.mrp > peek.price && <span className="text-[13px] text-muted-foreground line-through">{inr(peek.mrp)}</span>}
        </div>
      </div>
    </div>
  );
}

// "&" and "and" read the same, and every word typed must appear in the title ("int calc" finds Integral Calculus).
function matchesChapter(title: string, q: string) {
  const norm = (t: string) => t.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]/g, " ");
  const words = norm(q).split(/\s+/).filter(Boolean);
  const t = norm(title);
  return words.every((w) => t.includes(w));
}

// The hero search: results appear under the box as you type, without pressing Enter or scrolling. Picking one opens
// the chapter; "See all" scrolls to the filtered list below. Arrow keys move through the results, Enter opens one.
function ChapterSearch({ chapters, q, setQ, onSeeAll }: { chapters: CardChapter[]; q: string; setQ: (q: string) => void; onSeeAll: () => void }) {
  const router = useRouter();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const all = q.trim() ? chapters.filter((c) => matchesChapter(c.title, q)) : [];
  const hits = all.slice(0, 6);
  const show = open && !!q.trim();
  const go = (c: CardChapter) => router.push(`/chapter/${c.slug}`);
  // One "search" event per pause in typing, with how many chapters matched.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const t = setTimeout(() => track("search", `${term.slice(0, 60)} (${chapters.filter((c) => matchesChapter(c.title, term)).length})`), 1200);
    return () => clearTimeout(t);
  }, [q, chapters]);

  return (
    <div
      ref={box}
      className="relative z-20 mx-auto mt-8 w-[min(640px,100%)] text-left"
      onBlur={(e) => { if (!box.current?.contains(e.relatedTarget)) setOpen(false); }}
    >
      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); if (hits[active]) go(hits[active]); else { setOpen(false); onSeeAll(); } }}
        className="flex items-center gap-2.5 rounded-xl bg-card py-2 pl-4.5 pr-2 shadow-[0_20px_50px_-20px_rgb(120_40_0/0.35)]"
      >
        <svg className="size-5 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(hits.length - 1, a + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search a chapter: integrals, vectors…"
          aria-label="Search chapters"
          role="combobox"
          aria-expanded={show}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
          className="h-full min-w-0 flex-1 bg-transparent py-2.5 text-[17px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        {q && <button type="button" onClick={() => { setQ(""); setActive(-1); }} aria-label="Clear search" className="tap relative grid size-6 shrink-0 place-items-center rounded-full bg-muted text-sm leading-none text-muted-foreground hover:text-foreground">×</button>}
        <button className="shrink-0 rounded-lg bg-primary px-5 py-3 text-[15px] font-bold text-primary-foreground transition hover:brightness-108">Search</button>
      </form>
      {show && (
        <div className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-[0_30px_60px_-20px_rgb(80_20_0/0.35)]">
          <ul id={`${id}-list`} role="listbox" aria-label="Matching chapters">
            {hits.map((c, i) => (
              <li key={c.id} id={`${id}-${i}`} role="option" aria-selected={i === active}>
                <Link
                  href={`/chapter/${c.slug}`}
                  onMouseEnter={() => setActive(i)}
                  className={cx("flex min-h-12 items-center gap-3 px-4 py-2.5 text-foreground", i === active ? "bg-selected" : "hover:bg-muted")}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{c.title}</span>
                    <span className="block text-xs text-muted-foreground">Class {c.classLevel} · {c.partsCount} parts{c.free ? " · Free preview" : ""}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold">{c.owned ? "Owned" : inr(c.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {hits.length ? (
            <button type="button" onClick={() => { setOpen(false); onSeeAll(); }} className="flex min-h-11 w-full items-center justify-center border-t border-border text-sm font-bold text-primary hover:bg-muted">
              See all {all.length} result{all.length === 1 ? "" : "s"} below
            </button>
          ) : (
            <p className="px-4 py-4 text-sm text-muted-foreground">No chapter matches “{q.trim()}”. Try a shorter word.</p>
          )}
        </div>
      )}
    </div>
  );
}
