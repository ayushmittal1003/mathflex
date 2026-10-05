"use client";
import { useEffect, useRef, useState } from "react";
import { chapterIncludes, mockLabels } from "@/lib/site-content";
import { Mark, SectionHead, posterBg } from "../primitives";
import { cx } from "../ui";
import type { HomeChapter, Leader } from "./types";

type ResourceRow = { title: string; type: "NOTES" | "MINDMAP" | "FORMULA_SHEET" | "OTHER" };
type FeatKey = (typeof chapterIncludes)[number]["key"];

// 06 Inside Mathflex: a framed My Learning dashboard with five feature captions that take
// turns highlighting their panel. Chapters, notes and the weekly leaderboard are real
// data; the streak, XP, level and chart values are illustrative.
export function InsideMathflex({ chapters, leaders, resources, eyebrow = "Inside Mathflex" }: { chapters: HomeChapter[]; leaders: Leader[]; resources: ResourceRow[]; eyebrow?: string }) {
  const [feat, setFeat] = useState(0);
  const hold = useRef(false);

  useEffect(() => {
    const t = setInterval(() => { if (!hold.current) setFeat((f) => (f + 1) % chapterIncludes.length); }, 3200);
    return () => clearInterval(t);
  }, []);

  const on = (k: FeatKey) => chapterIncludes[feat].key === k;
  const ring = (k: FeatKey) => cx("rounded-xl border border-border p-3.5 transition-shadow duration-[350ms]", on(k) && "shadow-[0_0_0_3px_var(--primary),0_12px_30px_-10px_color-mix(in_oklab,var(--primary)_35%,transparent)]");
  const bars = [40, 65, 30, 80, 55, 95, 70];
  const dots = ["ok", "ok", "ok", "bad", "ok", "ok", "ok", "ok", "bad", "ok", "ok", "", "", ""];
  const notes = resources.length
    ? resources.map((r) => ({ tag: r.type === "MINDMAP" ? "MAP" : "PDF", title: r.title, map: r.type === "MINDMAP" }))
    : [{ tag: "PDF", title: "Short notes", map: false }, { tag: "PDF", title: "Formula sheet", map: false }];

  return (
    <section id="inside" className="py-22">
      <SectionHead
        eyebrow={eyebrow}
        dot="gold"
        title={<>Everything for a chapter, in <Mark>one</Mark> place.</>}
        lead="Your My Learning dashboard keeps every part, every practice set and every note together, and shows you exactly how far you have come."
      />
      <div className="no-scrollbar mx-auto mt-12 w-[min(1120px,calc(100%-48px))] overflow-x-auto rounded-xl border-[6px] border-foreground bg-card shadow-frame">
        <div className="grid h-[560px] min-w-[980px] grid-cols-[190px_minmax(0,1fr)_290px]">
          <div className="flex flex-col gap-1 border-r border-border px-3 py-4 text-[13px]">
            <div className="flex items-center gap-2 px-2 pb-3.5 pt-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny static brand mark */}
              <img src="/brand/mathflex-mark.svg" alt="" className="block w-[22px]" />
              <b className="text-[15px] tracking-[-0.02em]">mathflex</b>
            </div>
            <div className="rounded-md bg-primary/10 p-2 font-bold text-primary">My Learning</div>
            {["Chapters", "Practice", "Leaderboard", "Notes"].map((l) => <div key={l} className="p-2 text-secondary-foreground">{l}</div>)}
            <div className="mt-auto rounded-lg bg-muted p-3">
              <div className="text-xs font-bold">Level 6</div>
              <div className="mt-2 h-1 rounded-full bg-border"><div className="h-full w-[68%] rounded-full bg-xp" /></div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">660 XP to Level 7</div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3 p-4.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-extrabold tracking-[-0.02em]">{mockLabels.greeting}</div>
                {chapters[0] && <div className="text-xs text-muted-foreground">You&apos;re 2 parts away from finishing {chapters[0].title}</div>}
              </div>
              <div className={cx(ring("xp"), "px-3.5 py-2.5")}>
                <div className="flex gap-4 text-xs">
                  <div><b className="text-base text-brand-2">7</b> day streak</div>
                  <div><b className="text-base text-xp">2,340</b> XP</div>
                  <div><b className="text-base text-gold">4</b> badges</div>
                </div>
              </div>
            </div>

            <div className={ring("parts")}>
              <div className="text-[13px] font-bold">Continue learning</div>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                {chapters.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2.5">
                    <div className="grid h-[72px] w-[54px] shrink-0 place-items-center rounded-md text-base font-black text-white/70" style={posterBg(c.coverFrom, c.coverTo)}>{c.symbol}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold">{c.title}</div>
                      <div className="text-[11px] text-muted-foreground">Part {Math.min(i + 1, c.parts.length)} of {c.parts.length} · {[62, 24][i]}%</div>
                      <div className="mt-1.5 h-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${[62, 24][i]}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[1.2fr_1fr] gap-3">
              <div className="rounded-xl border border-border p-3.5">
                <div className="flex justify-between text-[13px] font-bold"><span>This week</span><span className="text-[11px] font-semibold text-muted-foreground">XP per day</span></div>
                <div className="mt-3 flex h-[120px] items-end gap-2">
                  {bars.map((h, i) => (
                    <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                      <div className={cx("w-full rounded", i === 5 ? "bg-primary" : "bg-primary/25")} style={{ height: `${h}%` }} />
                      <span className="text-[10px] text-muted-foreground">{"MTWTFSS"[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={ring("notes")}>
                <div className="text-[13px] font-bold">Notes</div>
                <div className="mt-2.5 grid gap-2 text-xs">
                  {notes.map((n) => (
                    <div key={n.title} className="flex items-center gap-2">
                      <span className={cx("rounded px-1.5 py-0.5 font-mono text-[10px] font-bold", n.map ? "bg-xp/12 text-xp" : "bg-primary/10 text-primary")}>{n.tag}</span>
                      <span className="truncate">{n.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={cx(ring("pyq"), "px-3.5 py-3")}>
              <div className="flex items-center justify-between gap-2.5 text-[13px]">
                <b>Practice · Part 1</b>
                <div className="flex gap-1" aria-hidden>
                  {dots.map((d, i) => <span key={i} className={cx("size-3.5 rounded-[3px]", d === "ok" ? "bg-ok" : d === "bad" ? "bg-destructive" : "bg-muted")} />)}
                </div>
                <span className="text-xs text-muted-foreground">DPPs + PYQs</span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3 border-l border-border px-3.5 py-4.5">
            <div className={cx(ring("board"), "flex-1")}>
              <div className="flex justify-between text-[13px] font-bold"><span>Leaderboard</span><span className="text-[11px] font-semibold text-muted-foreground">This week</span></div>
              <div className="mt-2 grid gap-1">
                {leaders.length ? leaders.map((l, i) => (
                  <div key={l.id} className="flex items-center gap-2 rounded-md px-1.5 py-2 text-xs">
                    <b className={cx("w-3.5", i < 3 ? "text-gold" : "text-muted-foreground")}>{i + 1}</b>
                    <span className="grid size-5.5 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: l.avatarColor }}>{l.name[0]}</span>
                    <span className="truncate font-semibold">{l.name}</span>
                    <b className="ml-auto text-xp">{l.xp.toLocaleString("en-IN")}</b>
                  </div>
                )) : <p className="mt-6 text-center text-xs text-muted-foreground">Rankings appear here as students earn XP this week.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        onMouseEnter={() => { hold.current = true; }}
        onMouseLeave={() => { hold.current = false; }}
        className="mx-auto mt-9 grid w-[min(1120px,calc(100%-48px))] grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-x-6 gap-y-2"
      >
        {chapterIncludes.map((f, i) => (
          <button
            key={f.key}
            type="button"
            onMouseEnter={() => setFeat(i)}
            onClick={() => setFeat(i)}
            className={cx("border-t-2 pt-4 text-left text-foreground transition duration-300", i === feat ? "border-primary opacity-100" : "border-border opacity-55")}
          >
            <div className="text-[15px] font-extrabold tracking-[-0.01em]">{f.title}</div>
            <div className="mt-1 text-[13px] leading-[1.45] text-muted-foreground">{f.body}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
