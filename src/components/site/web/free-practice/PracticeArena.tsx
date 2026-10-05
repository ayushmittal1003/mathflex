"use client";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { LEVELS, SUBJECTS, type Level, type PracticeQ } from "@/lib/free-practice";
import { button, container, cx, tone } from "../ui";

// Answers live on this device only (localStorage), read through a tiny external store so
// the server render and first client render match.
const KEY = "mf-free-practice-v1";
type Answers = Record<string, number>;
const EMPTY: Answers = {};
let cache: Answers | null = null;
const subs = new Set<() => void>();
const read = (): Answers => {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Answers; } catch { cache = {}; }
  return cache;
};
const write = (next: Answers) => {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  subs.forEach((f) => f());
};
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };

const LETTERS = ["A", "B", "C", "D", "E"];
const LEVEL_TONE: Record<Level, string> = { easy: "bg-ok/12 text-ok", medium: "bg-gold/18 text-[color-mix(in_oklab,var(--gold)_55%,black)]", hard: "bg-primary/10 text-primary" };

export function PracticeArena({ questions }: { questions: PracticeQ[] }) {
  const answers = useSyncExternalStore(subscribe, read, () => EMPTY);
  const [level, setLevel] = useState<Level | "all">("all");
  const [idx, setIdx] = useState(0);

  const list = useMemo(() => (level === "all" ? questions : questions.filter((q) => q.level === level)), [questions, level]);
  const q = list[Math.min(idx, list.length - 1)];
  const picked = q ? answers[q.id] : undefined;
  const done = picked !== undefined;

  const stat = (qs: PracticeQ[]) => {
    const tried = qs.filter((x) => answers[x.id] !== undefined);
    return { total: qs.length, tried: tried.length, right: tried.filter((x) => answers[x.id] === x.answer).length };
  };
  const cur = stat(list);
  const accuracy = cur.tried ? Math.round((cur.right / cur.tried) * 100) : 0;

  const choose = (i: number) => { if (q && !done) write({ ...read(), [q.id]: i }); };
  const go = (n: number) => { setIdx(Math.max(0, Math.min(list.length - 1, n))); };
  const pickLevel = (l: Level | "all") => { setLevel(l); setIdx(0); };
  const reset = () => {
    const next = { ...read() };
    list.forEach((x) => delete next[x.id]);
    write(next);
    setIdx(0);
  };

  return (
    <div className={cx(container.listing, "pb-24")}>
      {/* Subjects */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {SUBJECTS.map((s) => (
          <span
            key={s.key}
            aria-disabled={!s.live}
            className={cx(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold",
              s.live ? "border-foreground bg-foreground text-card" : "border-border bg-card text-muted-foreground",
            )}
          >
            {s.title}
            {!s.live && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">Soon</span>}
          </span>
        ))}
      </div>

      {/* Levels */}
      <div className="mt-6 grid grid-cols-2 gap-3 min-[1000px]:grid-cols-4">
        {[{ key: "all" as const, label: "All levels", hint: "Mixed, easy to hard" }, ...LEVELS].map((l) => {
          const s = stat(l.key === "all" ? questions : questions.filter((x) => x.level === l.key));
          const on = level === l.key;
          return (
            <button
              key={l.key}
              type="button"
              onClick={() => pickLevel(l.key)}
              aria-pressed={on}
              className={cx(
                "rounded-xl border bg-card p-4 text-left transition tablet:p-5 duration-200 ease-mf hover:-translate-y-0.5",
                on ? "border-primary bg-selected shadow-[0_18px_36px_-26px_rgb(80_20_0/0.5)]" : "border-border hover:border-foreground/30",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-lg font-extrabold tracking-[-0.02em]">{l.label}</span>
                <span className="font-mono text-xs font-bold text-muted-foreground">{s.tried}/{s.total}</span>
              </span>
              <span className="mt-1 hidden text-sm text-muted-foreground tablet:block">{l.hint}</span>
              <span className="mt-3 block h-1.5 tablet:mt-4 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-gradient-to-r from-primary to-brand-2 transition-[width] duration-500" style={{ width: `${s.total ? (s.tried / s.total) * 100 : 0}%` }} />
              </span>
            </button>
          );
        })}
      </div>

      {q ? (
        <div className="mt-8 flex flex-col gap-8 min-[1000px]:mt-10 min-[1000px]:flex-row min-[1000px]:items-start">
          {/* Sticky side panel: score + question map */}
          <aside className="order-2 w-full min-[1000px]:order-none min-[1000px]:sticky min-[1000px]:top-24 min-[1000px]:w-[280px] min-[1000px]:flex-none">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Attempted" value={`${cur.tried}`} />
                <Stat label="Correct" value={`${cur.right}`} good />
                <Stat label="Accuracy" value={cur.tried ? `${accuracy}%` : "–"} />
              </div>
              <div className="mt-5 text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Questions</div>
              <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(36px,1fr))] gap-1.5">
                {list.map((x, i) => {
                  const a = answers[x.id];
                  const state = a === undefined ? "new" : a === x.answer ? "right" : "wrong";
                  return (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => go(i)}
                      aria-label={`Question ${i + 1}${state === "new" ? "" : state === "right" ? ", correct" : ", wrong"}`}
                      aria-current={x.id === q.id}
                      className={cx(
                        "grid aspect-square place-items-center rounded-md font-mono text-xs font-bold transition",
                        state === "right" ? "bg-ok text-white" : state === "wrong" ? "bg-bad text-white" : "bg-muted text-secondary-foreground hover:bg-border",
                        x.id === q.id && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                      )}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              {cur.tried > 0 && (
                <button type="button" onClick={reset} className="mt-5 text-sm font-bold text-muted-foreground hover:text-foreground">
                  ↺ Reset {level === "all" ? "all" : LEVELS.find((l) => l.key === level)?.label.toLowerCase()} answers
                </button>
              )}
            </div>
          </aside>

          {/* Question */}
          <section key={q.id} className="min-w-0 flex-1 animate-mf-rise" aria-live="polite">
            <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-36px_rgb(80_20_0/0.4)] tablet:p-8">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="font-mono text-muted-foreground">Q{list.indexOf(q) + 1} / {list.length}</span>
                <span className={cx("rounded-full px-2.5 py-1", LEVEL_TONE[q.level])}>{LEVELS.find((l) => l.key === q.level)?.label}</span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-secondary-foreground">{q.chapter}</span>
              </div>
              <p className="mt-5 text-[clamp(19px,2vw,22px)] font-bold leading-[1.5] tracking-[-0.01em]">{q.prompt}</p>

              <div className="mt-6 grid gap-2.5">
                {q.options.map((o, i) => {
                  const isAns = i === q.answer;
                  const isPick = i === picked;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={done}
                      onClick={() => choose(i)}
                      className={cx(
                        "flex items-center gap-3.5 rounded-lg border-2 px-4 py-3.5 text-left text-[17px] font-semibold transition duration-200 ease-mf",
                        !done && "border-border hover:border-foreground/40 hover:bg-muted/50",
                        done && isAns && "border-ok bg-ok/10",
                        done && isPick && !isAns && "border-bad bg-bad/8",
                        done && !isAns && !isPick && "border-border opacity-60",
                      )}
                    >
                      <span
                        className={cx(
                          "grid size-8 flex-none place-items-center rounded-md font-mono text-sm font-extrabold",
                          done && isAns ? "bg-ok text-white" : done && isPick ? "bg-bad text-white" : "bg-muted text-secondary-foreground",
                        )}
                      >
                        {done && isAns ? "✓" : done && isPick ? "✕" : LETTERS[i]}
                      </span>
                      {o}
                    </button>
                  );
                })}
              </div>

              {done && (
                <div className={cx("mt-6 animate-mf-rise rounded-lg p-5", picked === q.answer ? "bg-ok/8" : "bg-[color-mix(in_oklab,var(--brand-2)_10%,transparent)]")}>
                  <div className={cx("text-sm font-extrabold", picked === q.answer ? "text-ok" : "text-foreground")}>
                    {picked === q.answer ? "Correct! Nicely done." : `Not quite. The answer is ${LETTERS[q.answer]}.`}
                  </div>
                  <p className="mt-2 text-[16px] leading-[1.65] text-secondary-foreground">{q.solution}</p>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0} className={cx(button.md, tone.secondary)}>← Previous</button>
              {idx < list.length - 1 ? (
                <button type="button" onClick={() => go(idx + 1)} className={cx(button.md, done ? tone.primary : tone.secondary)}>{done ? "Next question →" : "Skip →"}</button>
              ) : (
                <Link href="/chapters" className={cx(button.md, tone.primary)}>Practise by chapter →</Link>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-muted/50 px-6 py-14 text-center">
          <div className="text-xl font-extrabold tracking-[-0.02em]">Questions coming soon</div>
          <p className="mt-2 text-sm text-muted-foreground">We&apos;re adding this set now.</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, good = false }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-lg bg-muted px-2 py-3">
      <div className={cx("text-xl font-extrabold tracking-[-0.03em]", good && "text-ok")}>{value}</div>
      <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
    </div>
  );
}
