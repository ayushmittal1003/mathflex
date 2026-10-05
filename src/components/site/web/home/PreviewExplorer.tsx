"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { inr, pctOff } from "@/lib/format";
import { BuyButton } from "../BuyButton";
import { LockIcon, Mark, PlayIcon, SectionHead, posterBg } from "../primitives";
import { button, cx, tone } from "../ui";
import { clock, glyphSize, type HomeChapter } from "./types";

// 03 Free previews: class tabs, chapter search and a framed preview of the picked chapter.
// "Watch Part 1" opens the existing free-preview player at /learn/[slug] (no sign-up).
export function PreviewExplorer({ chapters, chapterCount, mentorShort }: { chapters: HomeChapter[]; chapterCount: number; mentorShort: string }) {
  const classes = [...new Set(chapters.map((c) => c.classLevel))].sort();
  const [cls, setCls] = useState(classes[0] ?? 11);
  const [q, setQ] = useState("");
  const list = useMemo(() => chapters.filter((c) => c.classLevel === cls), [chapters, cls]);
  const [selId, setSelId] = useState<string | null>(null);
  const cur = list.find((c) => c.id === selId) ?? list.find((c) => c.hasFreePart) ?? list[0];
  const rows = list.filter((c) => !q.trim() || c.title.toLowerCase().includes(q.trim().toLowerCase()));

  if (!cur) return null;
  const off = pctOff(cur.price, cur.mrp);
  const freePart = cur.parts.find((p) => p.isFreePreview);

  return (
    <section id="previews" className="scroll-mt-6 py-22">
      <SectionHead
        eyebrow="Free previews"
        dot="ok"
        title={<>Try it before you <Mark>buy</Mark> it.</>}
        lead={`Pick a chapter and watch Part 1 free. No card, no sign-up wall. If ${mentorShort}'s way of teaching clicks, unlock the rest of the chapter.`}
      />
      {classes.length > 1 && (
        <div className="mt-8 flex justify-center">
          <div className="inline-flex gap-0.5 rounded-lg bg-foreground p-1" role="tablist">
            {classes.map((n) => (
              <button
                key={n}
                type="button"
                role="tab"
                aria-selected={n === cls}
                onClick={() => { setCls(n); setSelId(null); setQ(""); }}
                className={cx("tap relative rounded-md px-4.5 py-2 text-sm font-bold transition-colors", n === cls ? "bg-card text-foreground" : "text-white/75 hover:text-white")}
              >
                Class {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto mt-10 flex w-[min(1120px,calc(100%-48px))] flex-wrap items-stretch gap-5">
        {/* Chapter list */}
        <div className="order-2 flex min-w-0 max-w-full flex-[1_1_300px] flex-col">
          <label className="flex h-12 items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 shadow-[0_1px_4px_0_rgb(0_0_0/0.06)]">
            <svg className="size-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="sr-only">Search chapters</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a chapter, e.g. integrals"
              className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto p-0.5 tablet:max-h-[560px] tablet:flex-col tablet:overflow-y-auto tablet:overflow-x-visible">
            {rows.map((c) => {
              const active = c.id === cur.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelId(c.id)}
                  aria-pressed={active}
                  className={cx(
                    "flex w-[260px] shrink-0 items-center gap-3 rounded-xl border bg-card p-2.5 text-left text-foreground transition duration-200 hover:bg-muted tablet:w-full",
                    active ? "border-foreground shadow-[0_10px_24px_-14px_rgb(0_0_0/0.35)]" : "border-border",
                  )}
                >
                  <span className="grid h-[58px] w-[46px] shrink-0 place-items-center overflow-hidden rounded-lg text-[15px] font-black tracking-[-0.03em] text-white/85" style={posterBg(c.coverFrom, c.coverTo)}>
                    {c.symbol}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold tracking-[-0.01em]">{c.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {c.parts.length} parts{c.jeeWeightage > 0 && ` · ${c.jeeWeightage}% JEE`}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[15px] font-extrabold">{inr(c.price)}</span>
                    {c.hasFreePart && <span className="mt-0.5 block text-[11px] font-bold text-ok">Part 1 free</span>}
                  </span>
                </button>
              );
            })}
            {rows.length === 0 && (
              <div className="px-3 py-6 text-sm text-muted-foreground">
                No chapter matches “{q}”.{" "}
                <button type="button" onClick={() => setQ("")} className="font-bold text-primary">Clear search</button>
              </div>
            )}
          </div>
        </div>

        {/* Preview frame */}
        <div className="flex min-w-0 max-w-full flex-[2_1_520px] flex-col overflow-hidden rounded-xl border-[6px] border-foreground bg-card shadow-frame">
          <div className="relative aspect-video overflow-hidden text-white" style={posterBg(cur.coverFrom, cur.coverTo)}>
            <div className={cx("absolute -right-6 top-1/2 -translate-y-1/2 whitespace-nowrap font-black leading-none tracking-[-0.05em] text-white/16", glyphSize(cur.symbol, "text-[150px] tablet:text-[220px]", "text-[220px] tablet:text-[380px]"))}>
              {cur.symbol}
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.55),rgb(0_0_0/0.05)_70%),linear-gradient(transparent_50%,rgb(0_0_0/0.6))]" />
            <div className="absolute left-5 top-4.5 flex gap-2">
              <span className="rounded-md bg-black/35 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] backdrop-blur-md">Class {cur.classLevel}</span>
              {cur.jeeWeightage > 0 && <span className="rounded-md bg-black/35 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] backdrop-blur-md">{cur.jeeWeightage}% of JEE Main</span>}
            </div>
            {freePart && (
              <Link
                href={`/learn/${cur.slug}?part=${freePart.order}`}
                aria-label={`Watch Part ${freePart.order} of ${cur.title} free`}
                className="absolute left-1/2 top-[46%] grid size-[76px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-primary shadow-[0_0_0_12px_rgb(255_255_255/0.16)] transition duration-300 hover:scale-[1.06]"
              >
                <PlayIcon className="size-6.5" />
              </Link>
            )}
            <div className="absolute inset-x-5 bottom-4">
              <div className="text-xs font-semibold opacity-85">{freePart ? `Now previewing · Part ${freePart.order}, free` : "Preview"}</div>
              <div className="mt-1 text-[clamp(22px,2.6vw,32px)] font-extrabold leading-[1.05] tracking-[-0.03em]">{cur.title}</div>
            </div>
          </div>

          <div className="no-scrollbar flex gap-2.5 overflow-x-auto border-b border-border p-4">
            {cur.parts.map((p, i) => {
              const free = p.isFreePreview;
              return (
                <div key={p.id} className={cx("flex flex-[1_0_190px] flex-col gap-2 rounded-lg border p-2.5", free ? "border-primary/35 bg-selected" : "border-border")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-muted-foreground">PART {p.order}{p.durationSec > 0 && ` · ${clock(p.durationSec)}`}</span>
                    <span className={cx("grid size-6 place-items-center rounded-full", free ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {free ? <PlayIcon className="size-2.5" /> : <LockIcon />}
                    </span>
                  </div>
                  <div className={cx("text-sm font-bold leading-[1.3]", free ? "text-foreground" : "text-secondary-foreground")}>{p.title}</div>
                  <div className="text-xs text-muted-foreground">{free ? "Free preview" : i > 0 ? `Unlocks after Part ${cur.parts[i - 1].order}` : "Unlocks after purchase"}</div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3.5 p-4">
            <div className="flex-[1_1_180px]">
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-extrabold tracking-[-0.03em]">{inr(cur.price)}</span>
                {cur.mrp > cur.price && <span className="text-sm text-muted-foreground line-through">{inr(cur.mrp)}</span>}
                {off > 0 && <span className="text-xs font-bold text-ok">{off}% off</span>}
              </div>
              <div className="text-xs text-muted-foreground">All parts, DPPs, PYQs and notes</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {freePart && (
                <Link href={`/learn/${cur.slug}?part=${freePart.order}`} className={cx(button.md, tone.primaryFlat)}>
                  <PlayIcon className="size-3.5" /> Watch Part {freePart.order}
                </Link>
              )}
              <BuyButton item={{ type: "CHAPTER", id: cur.id }} className={cx(button.md, tone.secondary)}>Unlock chapter</BuyButton>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-5 w-[min(1120px,calc(100%-48px))] text-center">
        <Link href="/browse" className="text-sm font-bold text-primary hover:brightness-90">Browse all {chapterCount} chapters →</Link>
      </div>
    </section>
  );
}
