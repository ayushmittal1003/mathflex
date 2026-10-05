import Link from "next/link";
import { inr } from "@/lib/format";
import { instructor, mockLabels } from "@/lib/site-content";
import { Caret, CheckIcon, Eyebrow, Mark, PlayIcon, posterBg } from "../primitives";
import { button, cx, tone } from "../ui";
import type { HomeChapter } from "./types";

// 01 Hero: framed wash, headline, proof points, CTAs and a dashboard peek that overlaps
// into the next section. Peek rows are real chapters; progress numbers are illustrative.
export function HomeHero({ chapters, chapterCount, minPrice, anyFree }: { chapters: HomeChapter[]; chapterCount: number; minPrice: number | null; anyFree: boolean }) {
  const peek = chapters.filter((c) => c.parts.length > 0).slice(0, 2);
  const peekProgress = [62, 24];

  return (
    <div className="px-4 pt-4">
      <section className="relative overflow-hidden rounded-xl bg-wash">
        <div className="px-6 pt-[calc(86px+52px)] text-center">
          <div className="animate-mf-rise">
            <Eyebrow dot="ok" onWash>For Class 11 &amp; 12 · JEE Main, Advanced &amp; Boards</Eyebrow>
          </div>
          <h1 className="mx-auto mt-6.5 max-w-[1000px] animate-mf-rise text-[clamp(48px,7.5vw,96px)] font-extrabold leading-none tracking-[-0.045em] text-balance [animation-delay:60ms]">
            Crack JEE maths,
            <br />
            one{" "}
            <Mark onWash pointer>
              chapter
              <Caret />
            </Mark>{" "}
            at a time.
          </h1>

          <div className="mt-7.5 flex flex-wrap justify-center gap-x-7 gap-y-3 text-base text-secondary-foreground">
            <Proof>
              Taught by an <b>IIT Delhi</b> alumnus
            </Proof>
            {anyFree && (
              <Proof>
                Part 1 <b>free</b> to watch
              </Proof>
            )}
            {minPrice !== null && (
              <Proof>
                Chapters from <b>{inr(minPrice)}</b>
              </Proof>
            )}
          </div>

          <div className="mt-8.5 flex flex-wrap justify-center gap-3">
            {anyFree && (
              <a href="#previews" className={cx(button.lg, tone.primary)}>
                <PlayIcon /> Watch Part 1 free
              </a>
            )}
            <Link href="/browse" className={cx(button.lg, anyFree ? tone.white : tone.primary)}>
              Browse {chapterCount} chapters →
            </Link>
          </div>

          <div className="mt-7 flex items-center justify-center gap-3">
            <div className="flex" aria-hidden>
              {["bg-xp", "bg-primary", "bg-ok", "bg-brand-2"].map((c, i) => (
                <span key={c} className={cx("grid size-[34px] place-items-center rounded-full border-2 border-white text-white", c, i > 0 && "-ml-2.5")}>
                  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0z" /></svg>
                </span>
              ))}
            </div>
            <div className="text-left text-[13px] leading-[1.35]">
              <b className="text-[15px]">{instructor.studentsGuided} students</b>
              <br />
              <span className="text-muted-foreground">guided by {instructor.shortName} so far</span>
            </div>
          </div>
        </div>

        {/* Dashboard peek (dark-framed product UI). */}
        <div className="relative mx-auto mt-18 -mb-40 grid h-[420px] w-[min(1000px,calc(100%-48px))] overflow-hidden rounded-xl border-[6px] border-foreground bg-card shadow-[0_40px_80px_-30px_rgb(80_20_0/0.45)] tablet:grid-cols-[190px_minmax(0,1fr)_250px]">
          <div className="hidden content-start gap-1 border-r border-border px-3 py-4 text-[13px] tablet:grid">
            <div className="px-2 py-1 text-[10px] font-bold tracking-[0.12em] text-muted-foreground">MENU</div>
            <div className="rounded-md bg-primary/10 p-2 font-bold text-primary">My Learning</div>
            {["Chapters", "Practice", "Leaderboard"].map((l) => <div key={l} className="p-2 text-secondary-foreground">{l}</div>)}
          </div>
          <div className="px-5 py-4.5 text-left">
            <div className="text-[17px] font-extrabold tracking-[-0.02em]">Continue learning</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {peek.map((c, i) => (
                <div key={c.id} className="rounded-xl border border-border p-3">
                  <div className="relative h-[70px] overflow-hidden rounded-lg" style={posterBg(c.coverFrom, c.coverTo)}>
                    <span className="absolute -top-1 right-1.5 text-[52px] font-black text-white/25">{c.symbol}</span>
                  </div>
                  <div className="mt-2.5 truncate text-sm font-bold">{c.title}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">Part {Math.min(i + 1, c.parts.length)} of {c.parts.length}</div>
                  <div className="mt-2 h-1 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${peekProgress[i]}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden border-l border-border px-4 py-4.5 text-left tablet:block">
            <div className="text-sm font-bold">{mockLabels.you} · Level 6</div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
              {[["7", "streak", "text-brand-2"], ["2.3k", "XP", "text-xp"], ["#3", "rank", "text-gold"]].map(([v, l, c]) => (
                <div key={l} className="rounded-lg bg-muted px-1 py-2">
                  <div className={cx("text-base font-extrabold", c)}>{v}</div>
                  <div className="text-[10px] text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Proof({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <CheckIcon className="size-4 text-foreground" />
      <span className="whitespace-nowrap">{children}</span>
    </span>
  );
}
