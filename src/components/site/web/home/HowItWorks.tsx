"use client";
import { useEffect, useState } from "react";
import { howSteps } from "@/lib/site-content";
import { CheckIcon, LockIcon, Mark, PlayIcon, SectionHead, posterBg } from "../primitives";
import { cx } from "../ui";
import { clock, type HomeChapter } from "./types";

// 05 How a chapter works: steps on the left, a sticky framed demo on the right that follows
// the step in view. The demo uses a real chapter's parts and question counts; progress,
// XP and streak numbers are illustrative.
export function HowItWorks({ chapter, practice }: { chapter: HomeChapter | null; practice: { dpp: number; pyq: number } | null }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const mid = window.innerHeight * 0.5;
      let a = 0;
      document.querySelectorAll<HTMLElement>("[data-how-step]").forEach((n, i) => { if (n.getBoundingClientRect().top < mid) a = i; });
      setStep(a);
    };
    onScroll();
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => document.removeEventListener("scroll", onScroll, true);
  }, []);

  if (!chapter || chapter.parts.length === 0) return null;
  const [p1, p2, p3] = chapter.parts;
  const threshold = Math.round((p1.watchThreshold || 0.9) * 100);
  const bg = posterBg(chapter.coverFrom, chapter.coverTo);

  return (
    <section id="how" className="py-22">
      <SectionHead
        eyebrow="How a chapter works"
        dot="xp"
        title={<>Every chapter plays like a <Mark>series</Mark>.</>}
        lead="Each chapter is split into short parts. Finish a part, clear its practice, and the next one unlocks. You always know what to do next."
      />
      <div className="mx-auto mt-14 flex w-[min(1120px,calc(100%-48px))] flex-wrap-reverse items-end gap-x-10 gap-y-8">
        <div className="min-w-0 flex-[1_1_300px]">
          {howSteps.map((s, i) => (
            <div
              key={s.kicker}
              data-how-step={i}
              onClick={() => setStep(i)}
              className={cx("min-h-[58vh] cursor-pointer pb-10 pt-2 transition-opacity duration-400", i === step ? "opacity-100" : "opacity-35")}
            >
              <div className="flex items-center gap-3">
                <span className={cx("rounded-md px-2 py-1 font-mono text-[13px] font-bold transition-colors duration-300", i === step ? "bg-foreground text-card" : "bg-muted text-muted-foreground")}>
                  0{i + 1}
                </span>
                <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{s.kicker}</span>
              </div>
              <h3 className="mt-4.5 text-[clamp(28px,3vw,38px)] font-extrabold leading-[1.08] tracking-[-0.035em]">{s.title}</h3>
              <p className="mt-3 max-w-[440px] text-[17px] leading-[1.6] text-muted-foreground text-pretty">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="sticky top-6 z-[2] min-w-0 flex-[1.15_1_380px]">
          <div className="h-[480px] overflow-hidden rounded-xl border-[6px] border-foreground bg-card shadow-frame tablet:h-[520px]">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <span className="truncate text-[13px] font-bold">My Learning · {chapter.title}</span>
              <div className="flex gap-1" aria-hidden>
                {howSteps.map((_, i) => <span key={i} className={cx("h-1 w-5.5 rounded-full transition-colors duration-300", i <= step ? "bg-primary" : "bg-border")} />)}
              </div>
            </div>

            {step === 0 && (
              <div key="s0" className="animate-mf-rise p-5">
                <div className="relative">
                  <div className="relative h-[270px] overflow-hidden rounded-lg text-white" style={bg}>
                    <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 text-[160px] font-black leading-none tracking-[-0.05em] text-white/16 tablet:text-[216px]">{chapter.symbol}</div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent from-45% to-black/60" />
                    <div className="absolute inset-x-4 bottom-3.5">
                      <div className="relative h-[5px] rounded-full bg-white/30">
                        <div className="h-full w-[62%] rounded-full bg-primary" />
                        <span className="absolute -top-[5px] h-[15px] w-0.5 rounded-sm bg-white" style={{ left: `${threshold}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="absolute left-1/2 top-[42%] grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/50 bg-white/22 backdrop-blur-md">
                    <svg className="size-5" viewBox="0 0 24 24" fill="#fff" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                  </div>
                  <div className="absolute bottom-7.5 whitespace-nowrap rounded-md bg-white px-2 py-1 text-[11px] font-bold text-foreground" style={{ left: `calc(${threshold}% - 60px)` }}>Practice unlocks here</div>
                </div>
                <div className="mt-4.5 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Part {p1.order} · {p1.title}</div>
                    <div className="mt-1 truncate text-xl font-extrabold tracking-[-0.02em]">{chapter.title}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[26px] font-extrabold tracking-[-0.03em] text-primary">62%</div>
                    <div className="text-xs text-muted-foreground">watched</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    [p1.durationSec ? clock(p1.durationSec * 0.62) : "—", "actually watched"],
                    [p1.durationSec ? clock(p1.durationSec) : "—", "part length"],
                    [`${chapter.parts.length - 1} more`, "parts in chapter"],
                  ].map(([v, l]) => (
                    <div key={l} className="rounded-lg bg-muted p-3">
                      <div className="text-base font-extrabold">{v}</div>
                      <div className="text-[11px] text-muted-foreground">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div key="s1" className="relative animate-mf-rise p-5">
                <div className="opacity-45">
                  <div className="relative h-[270px] overflow-hidden rounded-lg text-white" style={bg}>
                    <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 text-[160px] font-black leading-none tracking-[-0.05em] text-white/16 tablet:text-[216px]">{chapter.symbol}</div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent from-45% to-black/60" />
                    <div className="absolute inset-x-4 bottom-3.5">
                      <div className="relative h-[5px] rounded-full bg-white/30">
                        <div className="h-full rounded-full bg-ok" style={{ width: `${threshold}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-x-6 top-[150px] animate-mf-pop rounded-xl bg-card p-5.5 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.35)] [animation-delay:150ms] tablet:inset-x-11">
                  <div className="flex items-center gap-3.5">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ok/15 text-ok"><CheckIcon className="size-5.5" /></span>
                    <div>
                      <div className="text-xl font-extrabold tracking-[-0.02em]">Practice set unlocked</div>
                      <div className="mt-0.5 text-sm text-muted-foreground">You watched {threshold}% of Part {p1.order}</div>
                    </div>
                  </div>
                  {practice && (practice.dpp > 0 || practice.pyq > 0) && (
                    <div className="mt-4.5 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border p-3"><div className="text-[22px] font-extrabold">{practice.dpp}</div><div className="text-xs text-muted-foreground">DPPs on this part</div></div>
                      <div className="rounded-lg border border-border p-3"><div className="text-[22px] font-extrabold">{practice.pyq}</div><div className="text-xs text-muted-foreground">PYQs on this part</div></div>
                    </div>
                  )}
                  <div className="mt-4 flex justify-center rounded-lg bg-primary p-3 text-[15px] font-bold text-primary-foreground">Start practice</div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div key="s2" className="animate-mf-rise p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-muted-foreground">Question 3 of 14</span>
                  <span className="rounded-md bg-brand-2/14 px-2 py-0.5 text-[11px] font-bold text-brand-2">Practice question</span>
                </div>
                <div className="mt-3 flex gap-1" aria-hidden>
                  <span className="h-1 flex-1 rounded-full bg-ok" /><span className="h-1 flex-1 rounded-full bg-ok" /><span className="h-1 flex-1 rounded-full bg-primary" /><span className="h-1 flex-[11] rounded-full bg-muted" />
                </div>
                <div className="mt-5.5 text-[21px] font-bold leading-[1.4] tracking-[-0.015em]">
                  Evaluate <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[19px]">lim x→0 sin(3x) / x</span>
                </div>
                <div className="mt-5 grid gap-2">
                  {["0", "1", "3", "1/3"].map((v, i) => {
                    const right = i === 2;
                    return (
                      <div key={v} className={cx("flex items-center gap-3 rounded-lg px-3.5 py-3 text-[15px]", right ? "border-2 border-ok bg-ok/8 font-bold" : "border border-border")}>
                        <b className={cx("w-5.5", right ? "text-ok" : "text-muted-foreground")}>{"ABCD"[i]}</b>
                        {v}
                        {right && <span className="ml-auto flex items-center gap-1.5 text-[13px] text-ok"><CheckIcon className="size-3.5" strokeWidth={3.5} />Correct</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="animate-mf-pop text-sm font-extrabold text-xp [animation-delay:200ms]">+10 XP</span>
                  <span className="text-sm font-bold text-primary">View solution →</span>
                </div>
              </div>
            )}

            {step === 3 && (
              <div key="s3" className="animate-mf-rise p-5">
                {p2 && (
                  <div className="flex animate-mf-pop items-center gap-3 rounded-xl bg-gradient-to-br from-primary to-brand-2 p-4 text-white [animation-delay:100ms]">
                    <span className="grid size-[42px] shrink-0 place-items-center rounded-full bg-white/22"><PlayIcon className="size-4.5" /></span>
                    <div className="min-w-0">
                      <div className="text-[19px] font-extrabold tracking-[-0.02em]">Part {p2.order} unlocked</div>
                      <div className="truncate text-[13px] opacity-90">{p2.title}{p2.durationSec > 0 && ` · ${clock(p2.durationSec)}`}</div>
                    </div>
                  </div>
                )}
                <div className="mt-3.5 grid gap-2">
                  <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                    <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-ok text-white"><CheckIcon className="size-3" strokeWidth={3.5} /></span>
                    <b className="truncate">Part {p1.order} · {p1.title}</b>
                    <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">12 / 14 correct</span>
                  </div>
                  {p2 && (
                    <div className="flex items-center gap-3 rounded-lg border border-primary/35 bg-selected px-3 py-2.5 text-sm">
                      <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-primary text-white"><PlayIcon className="size-2.5" /></span>
                      <b className="truncate">Part {p2.order} · {p2.title}</b>
                      <span className="ml-auto whitespace-nowrap text-xs font-bold text-primary">Up next</span>
                    </div>
                  )}
                  {p3 && (
                    <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm text-muted-foreground">
                      <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-muted"><LockIcon className="size-3.5" /></span>
                      <span className="truncate">Part {p3.order} · {p3.title}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3.5 grid grid-cols-3 gap-2">
                  {[["+120", "XP earned", "text-xp"], ["7 days", "streak", "text-brand-2"], ["#3", "this week", "text-gold"]].map(([v, l, c]) => (
                    <div key={l} className="rounded-lg bg-muted p-3">
                      <div className={cx("text-xl font-extrabold", c)}>{v}</div>
                      <div className="text-[11px] text-muted-foreground">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
