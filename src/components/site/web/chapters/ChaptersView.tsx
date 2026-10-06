"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { inr } from "@/lib/format";
import { ChapterCard, type CardChapter } from "../ChapterCard";
import { Caret, Eyebrow, LockIcon, Mark, PlayIcon, SectionHead } from "../primitives";
import { WashHero, heroH1, heroLead, splitH2 } from "../WashHero";
import { cx } from "../ui";
import { clock } from "../home/types";

type Peek = {
  id: string; slug: string; title: string; classLevel: number; price: number; mrp: number; coverFrom: string; coverTo: string; symbol: string; jeeWeightage: number;
  parts: { id: string; order: number; title: string; durationSec: number; isFreePreview: boolean }[];
};
type Bundle = { id: string; slug: string; title: string; subtitle: string; price: number; mrp: number; chapterCount: number; breakeven: number | null };
type Sort = "default" | "weight" | "price";

export function ChaptersView({ chapters, peek, bundles, initial }: { chapters: CardChapter[]; peek: Peek | null; bundles: Bundle[]; initial: { q: string; cls: number | "all"; sort: Sort } }) {
  const [q, setQ] = useState(initial.q);
  const [cls, setCls] = useState<number | "all">(initial.cls);
  const [sort, setSort] = useState<Sort>(initial.sort);
  const [freeOnly, setFreeOnly] = useState(false);

  const classes = [...new Set(chapters.map((c) => c.classLevel))].sort();
  const anyFree = chapters.some((c) => c.free);
  const minPrice = chapters.length ? Math.min(...chapters.map((c) => c.price)) : null;
  const parts = chapters.map((c) => c.partsCount).filter(Boolean);
  const partsRange = parts.length ? (Math.min(...parts) === Math.max(...parts) ? `${Math.min(...parts)}` : `${Math.min(...parts)}–${Math.max(...parts)}`) : null;
  const popular = chapters.filter((c) => c.isTrending).slice(0, 4);
  const top5 = [...chapters].filter((c) => c.jeeWeightage > 0).sort((a, b) => b.jeeWeightage - a.jeeWeightage).slice(0, 5);
  const best = bundles.length > 1 ? [...bundles].sort((a, b) => b.chapterCount - a.chapterCount)[0] : null;
  const breakeven = bundles.map((b) => b.breakeven).filter((n): n is number => !!n && n > 1).sort((a, b) => a - b)[0];

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let l = chapters.filter((c) => (cls === "all" || c.classLevel === cls) && (!freeOnly || c.free) && (!term || c.title.toLowerCase().includes(term)));
    if (sort === "weight") l = [...l].sort((a, b) => b.jeeWeightage - a.jeeWeightage);
    if (sort === "price") l = [...l].sort((a, b) => a.price - b.price);
    return l;
  }, [chapters, q, cls, sort, freeOnly]);

  // Grouped by class in syllabus order; one flat grid when sorted.
  const groups = sort === "default" ? classes.map((n) => ({ title: `Class ${n}`, rows: list.filter((c) => c.classLevel === n) })).filter((g) => g.rows.length) : [{ title: "", rows: list }];
  const reset = () => { setQ(""); setCls("all"); setFreeOnly(false); setSort("default"); };
  const goList = () => document.getElementById("all")?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <WashHero peek={!!peek}>
        <div className="px-6 pt-10 text-center">
          <Eyebrow dot="ok" onWash>{chapters.length} chapters · Class {classes.join(" & ")}{anyFree && " · Part 1 free"}</Eyebrow>
          <h1 className={cx(heroH1, "mt-6 max-w-[980px]")}>
            Find the chapter that&apos;s costing you{" "}
            <Mark onWash>marks<Caret /></Mark>
          </h1>
          <p className={cx(heroLead, "mt-5.5")}>
            Every chapter is split into {partsRange ? `${partsRange} parts` : "short parts"}, with DPPs, PYQs and notes. Buy just the one you need{minPrice !== null && `, from ${inr(minPrice)}`}.
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); goList(); }}
            className="mx-auto mt-8 flex w-[min(640px,100%)] items-center gap-2.5 rounded-xl bg-card py-2 pl-4.5 pr-2 shadow-[0_20px_50px_-20px_rgb(120_40_0/0.35)]"
          >
            <svg className="size-5 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try integrals, vectors, P&C…" aria-label="Search chapters" className="min-w-0 flex-1 bg-transparent py-2.5 text-[17px] text-foreground outline-none placeholder:text-muted-foreground" />
            <button className="shrink-0 rounded-lg bg-primary px-5 py-3 text-[15px] font-bold text-primary-foreground transition hover:brightness-108">Search</button>
          </form>
          {popular.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
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
        <section id="top" className="overflow-hidden pb-18 pt-24">
          <SectionHead
            eyebrow="Highest JEE weightage"
            dot="gold"
            title={<>Most marks for your <Mark>time</Mark>.</>}
            lead={`These ${top5.length} chapters carry the most weight in JEE Main. Short on time? Start here.`}
          />
          <div className="no-scrollbar mx-auto mt-10 w-[min(1240px,calc(100%-48px))] overflow-x-auto overflow-y-hidden overscroll-x-contain px-1 pb-5 pt-6">
            <div className="mx-auto flex w-max gap-2">
            {top5.map((c, i) => (
              <Link key={c.id} href={`/chapter/${c.slug}`} className="flex shrink-0 items-end text-white">
                <span aria-hidden className="-mr-6.5 select-none text-[120px] font-black leading-[0.78] tracking-[-0.06em] text-transparent [-webkit-text-stroke:3px_var(--muted-foreground)] tablet:text-[180px]">
                  {i + 1}
                </span>
                <span className="relative block aspect-[2/3] w-[130px] overflow-hidden rounded-xl shadow-[0_16px_32px_-16px_rgb(0_0_0/0.45)] transition-transform duration-300 hover:-translate-y-1.5 tablet:w-[170px]" style={{ background: `linear-gradient(155deg, ${c.coverFrom}, ${c.coverTo})` }}>
                  <span className={cx("absolute -right-2.5 top-1 whitespace-nowrap font-black leading-none text-white/20", c.symbol.length > 2 ? "text-[56px]" : "text-[96px]")}>{c.symbol}</span>
                  <span className="absolute inset-0 bg-gradient-to-b from-transparent from-35% to-black/85" />
                  <span className="absolute left-2.5 top-2.5 rounded bg-white px-1.5 py-0.5 text-[11px] font-extrabold text-black">{c.jeeWeightage}% of JEE</span>
                  <span className="absolute inset-x-3 bottom-3">
                    <span className="block text-[15px] font-extrabold leading-[1.15]">{c.title}</span>
                    <span className="mt-1 block text-xs opacity-80">Class {c.classLevel} · {inr(c.price)}</span>
                  </span>
                </span>
              </Link>
            ))}
            </div>
          </div>
        </section>
      )}

      {/* Sticky filter bar (design.md §3.6), parked under the sticky site nav. */}
      <div id="all" className="sticky top-[67px] z-30 scroll-mt-[67px] border-y border-border bg-card/90 backdrop-blur-lg">
        <div className="mx-auto flex w-[min(1240px,calc(100%-48px))] flex-wrap items-center gap-x-3 gap-y-2.5 py-3">
          <label className="flex h-10 max-w-[340px] flex-[1_1_220px] items-center gap-2 rounded-lg border border-border bg-card px-3">
            <svg className="size-[15px] shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chapters" aria-label="Search chapters" className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground" />
            {q && <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="tap relative grid size-5.5 shrink-0 place-items-center rounded-full bg-muted text-[13px] leading-none">×</button>}
          </label>
          <div className="flex shrink-0 gap-0.5 rounded-lg bg-foreground p-1">
            {(["all", ...classes] as const).map((v) => (
              <button key={v} type="button" onClick={() => setCls(v)} aria-pressed={cls === v} className={cx("tap relative whitespace-nowrap rounded-md px-3 py-[7px] text-[13px] font-bold", cls === v ? "bg-card text-foreground" : "text-white/75 hover:text-white")}>
                {v === "all" ? "All" : `Class ${v}`}
              </button>
            ))}
          </div>
          <div className="relative shrink-0">
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort chapters" className="h-10 cursor-pointer appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-[13px] font-bold text-foreground">
              <option value="default">Syllabus order</option>
              <option value="weight">Sort: JEE weightage</option>
              <option value="price">Sort: price, low to high</option>
            </select>
            <svg className="pointer-events-none absolute right-2.5 top-1/2 size-[13px] -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
          </div>
          {anyFree && (
            <button type="button" role="switch" aria-checked={freeOnly} onClick={() => setFreeOnly((f) => !f)} className="tap relative flex shrink-0 items-center gap-2.5 whitespace-nowrap text-[13px] font-bold text-foreground">
              <span className={cx("relative h-5 w-9 rounded-full transition-colors", freeOnly ? "bg-ok" : "bg-border")}>
                <span className={cx("absolute top-0.5 size-4 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-[left]", freeOnly ? "left-[18px]" : "left-0.5")} />
              </span>
              Part 1 free
            </button>
          )}
          <span className="ml-auto shrink-0 whitespace-nowrap text-[13px] font-semibold text-muted-foreground">
            {list.length} chapter{list.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <section className="pb-24 pt-8">
        <div className="mx-auto w-[min(1240px,calc(100%-48px))]">
          {groups.map((g) => (
            <div key={g.title || "all"} className="mb-10 last:mb-0">
              {g.title && (
                <div className="mb-5 flex items-baseline justify-between border-b-2 border-foreground pb-3">
                  <h2 className="text-[clamp(22px,2.4vw,28px)] font-extrabold tracking-[-0.03em]">{g.title}</h2>
                  <span className="text-[13px] font-semibold text-muted-foreground">{g.rows.length} chapters</span>
                </div>
              )}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4 tablet:gap-5">
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
        <section id="bundles" className="scroll-mt-16 py-16 tablet:py-20">
          <div className="mx-auto flex w-[min(1240px,calc(100%-48px))] flex-wrap items-center gap-x-16 gap-y-10">
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
                      {best?.id === b.id && <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-primary-foreground">Best value</span>}
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
  return (
    <div className="relative mx-auto mt-14 -mb-[150px] grid h-[420px] w-[min(980px,calc(100%-48px))] overflow-hidden rounded-xl border-[6px] border-foreground bg-card shadow-[0_40px_80px_-30px_rgb(80_20_0/0.45)] tablet:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="relative overflow-hidden text-white" style={{ background: `linear-gradient(125deg, ${peek.coverFrom}, ${peek.coverTo})` }}>
        <div className="absolute -right-5 top-1/2 -translate-y-1/2 whitespace-nowrap text-[300px] font-black leading-none text-white/14">{peek.symbol}</div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent to-70%" />
        <div className="absolute left-5.5 top-5 flex gap-2">
          <span className="rounded-md bg-black/35 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em]">Class {peek.classLevel}</span>
          {free && <span className="rounded-md bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-black">Part {free.order} · Free</span>}
        </div>
        {free && (
          <Link href={`/learn/${peek.slug}?part=${free.order}`} aria-label={`Watch Part ${free.order} of ${peek.title} free`} className="absolute left-1/2 top-[38%] grid size-18 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-primary shadow-[0_0_0_12px_rgb(255_255_255/0.16)] transition hover:scale-[1.06]">
            <PlayIcon className="size-6" />
          </Link>
        )}
        <div className="absolute inset-x-5.5 top-[200px] text-left">
          {free && <div className="text-[13px] font-semibold opacity-85">Part {free.order} · {free.title}</div>}
          <div className="mt-1 text-[30px] font-extrabold tracking-[-0.03em]">{peek.title}</div>
        </div>
      </div>
      <div className="hidden flex-col gap-2.5 p-5 text-left tablet:flex">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">{peek.parts.length} parts</span>
          {peek.jeeWeightage > 0 && <span className="rounded-md bg-brand-2/14 px-2 py-0.5 text-[11px] font-bold text-brand-2">{peek.jeeWeightage}% of JEE Main</span>}
        </div>
        {shown.map((p, i) => (
          <div key={p.id} className={cx("flex items-center gap-2.5 rounded-lg border p-2.5", p.isFreePreview ? "border-primary/35 bg-selected" : "border-border")}>
            <span className={cx("grid size-6.5 shrink-0 place-items-center rounded-full", p.isFreePreview ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
              {p.isFreePreview ? <PlayIcon className="size-2.5" /> : <LockIcon className="size-[11px]" />}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold">{p.title}</div>
              <div className="text-[11px] text-muted-foreground">
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
