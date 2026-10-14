"use client";
// Exam mode: a timed test in the NTA (JEE Main) computer-based-test layout. Answers are only
// graded when the test ends (submitExam), so keys never reach the page during the test.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock, LayoutGrid, X } from "lucide-react";
import { submitExam, type ExamResult } from "@/app/actions/practice";
import { FORMAT_LABEL, type Answer } from "@/lib/grading";
import { cx } from "../ui";

export type ExamQuestion = {
  id: string;
  type: "DPP" | "PYQ";
  format: "SINGLE" | "MULTIPLE" | "NUMERICAL";
  exam: string | null;
  year: number | null;
  prompt: string;
  options: string[];
};

type Status = "notVisited" | "notAnswered" | "answered" | "marked" | "answeredMarked";
type Slot = { visited: boolean; marked: boolean; saved: Answer | null; ms: number };

const LETTERS = "ABCDEFGH";
// Milliseconds since `t` (only ever called from event handlers).
const since = (t: number) => Date.now() - t;
const empty = (a: Answer | null | undefined) => !a || ((a.selected ?? null) === null && !(a.selectedMany?.length) && (a.numericValue ?? null) === null);

function statusOf(s: Slot): Status {
  if (!s.visited) return "notVisited";
  const answered = !empty(s.saved);
  if (s.marked) return answered ? "answeredMarked" : "marked";
  return answered ? "answered" : "notAnswered";
}

// Palette tile shapes, as in the NTA exam: house = answered, shield = not answered, circle = marked.
const SHAPE: Record<Status, string> = {
  notVisited: "rounded-md bg-muted text-foreground",
  notAnswered: "bg-[oklch(0.6_0.2_30)] text-white [clip-path:polygon(0_0,100%_0,100%_72%,50%_100%,0_72%)]",
  answered: "bg-[oklch(0.62_0.17_150)] text-white [clip-path:polygon(50%_0,100%_28%,100%_100%,0_100%,0_28%)]",
  marked: "rounded-full bg-[oklch(0.5_0.2_290)] text-white",
  answeredMarked: "rounded-full bg-[oklch(0.5_0.2_290)] text-white",
};
const LEGEND: [Status, string][] = [
  ["answered", "Answered"],
  ["notAnswered", "Not Answered"],
  ["notVisited", "Not Visited"],
  ["marked", "Marked for Review"],
  ["answeredMarked", "Answered & Marked for Review"],
];

function Tile({ status, children, current, onClick, small }: { status: Status; children?: React.ReactNode; current?: boolean; onClick?: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cx("relative grid place-items-center font-bold tabular-nums", small ? "size-5 text-[10px]" : "h-11 w-full text-sm", SHAPE[status], current && "outline outline-2 outline-offset-2 outline-foreground")}
    >
      {children}
      {status === "answeredMarked" && <span className={cx("absolute rounded-full border-2 border-card bg-[oklch(0.62_0.17_150)]", small ? "-bottom-0.5 -right-0.5 size-2.5" : "bottom-0 right-0 size-3.5")} />}
    </button>
  );
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function ExamMode({ chapterId, chapterTitle, section, candidate, questions, marking }: {
  chapterId: string;
  chapterTitle: string;
  section: string;
  candidate: string;
  questions: ExamQuestion[];
  marking: { correct: number; wrong: number };
}) {
  const [phase, setPhase] = useState<"setup" | "running" | "result">("setup");
  const [count, setCount] = useState(Math.min(questions.length, 20));
  const [perQ, setPerQ] = useState(2); // minutes per question; 0 = untimed
  const [mix, setMix] = useState(true);
  const [paper, setPaper] = useState<ExamQuestion[]>([]);
  const [result, setResult] = useState<ExamResult | null>(null);

  function start() {
    const picked = (mix ? shuffle(questions) : questions).slice(0, Math.max(1, count));
    setPaper(picked);
    setResult(null);
    setPhase("running");
  }

  if (!questions.length) {
    return <div className="rounded-xl border border-dashed border-border bg-muted/50 px-6 py-14 text-center text-muted-foreground">No questions match these filters.</div>;
  }

  if (phase === "running") {
    return (
      <ExamRunner
        chapterId={chapterId}
        title={`${chapterTitle} · ${section}`}
        candidate={candidate}
        paper={paper}
        seconds={perQ ? paper.length * perQ * 60 : 0}
        onDone={(r) => { setResult(r); setPhase("result"); }}
        onQuit={() => setPhase("setup")}
      />
    );
  }

  if (phase === "result" && result) {
    return <ExamReview paper={paper} result={result} onRetake={() => setPhase("setup")} />;
  }

  const counts = [10, 20, 30, 50].filter((n) => n < questions.length);
  return (
    <div className="rounded-xl border border-border bg-card p-6 tablet:p-8">
      <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Exam mode</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A timed test in the JEE Main computer-based layout. Answers and solutions appear when you end the test. Marking: +{marking.correct} correct, {marking.wrong} wrong, 0 unattempted.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <label className="text-sm font-bold">Questions
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="mt-1.5 block w-full rounded-lg border border-border bg-card px-3 py-2.5 font-semibold">
            {counts.map((n) => <option key={n} value={n}>{n} questions</option>)}
            <option value={questions.length}>All {questions.length}</option>
          </select>
        </label>
        <label className="text-sm font-bold">Time
          <select value={perQ} onChange={(e) => setPerQ(Number(e.target.value))} className="mt-1.5 block w-full rounded-lg border border-border bg-card px-3 py-2.5 font-semibold">
            <option value={2}>2 min per question ({count * 2} min)</option>
            <option value={3}>3 min per question ({count * 3} min)</option>
            <option value={0}>No time limit</option>
          </select>
        </label>
        <label className="flex items-end gap-2 pb-3 text-sm font-bold">
          <input type="checkbox" checked={mix} onChange={(e) => setMix(e.target.checked)} className="size-4" /> Shuffle questions
        </label>
      </div>
      <button type="button" onClick={start} className="mt-7 rounded-lg bg-[oklch(0.45_0.13_150)] px-6 py-3 text-sm font-bold text-white hover:brightness-110">Start test</button>
    </div>
  );
}

function ExamRunner({ chapterId, title, candidate, paper, seconds, onDone, onQuit }: {
  chapterId: string;
  title: string;
  candidate: string;
  paper: ExamQuestion[];
  seconds: number;
  onDone: (r: ExamResult) => void;
  onQuit: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [slots, setSlots] = useState<Slot[]>(() => paper.map((_, i) => ({ visited: i === 0, marked: false, saved: null, ms: 0 })));
  const [picks, setPicks] = useState<number[]>([]);
  const [numeric, setNumeric] = useState("");
  const [left, setLeft] = useState(seconds);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const shownAt = useRef(0);
  const submitted = useRef(false);

  const q = paper[idx];
  const statuses = useMemo(() => slots.map(statusOf), [slots]);
  const tally = useMemo(() => Object.fromEntries(LEGEND.map(([k]) => [k, statuses.filter((s) => s === k).length])) as Record<Status, number>, [statuses]);

  // Time on the current question; added to its slot when the student moves on.
  useEffect(() => {
    shownAt.current = Date.now();
  }, [idx]);

  const response = (): Answer | null => {
    if (q.format === "NUMERICAL") return numeric.trim() === "" || Number.isNaN(Number(numeric)) ? null : { numericValue: Number(numeric) };
    if (q.format === "MULTIPLE") return picks.length ? { selectedMany: [...picks].sort((a, b) => a - b) } : null;
    return picks.length ? { selected: picks[0] } : null;
  };

  const load = useCallback((i: number, from: Slot[]) => {
    const s = from[i].saved;
    setPicks(s?.selectedMany?.length ? s.selectedMany : s?.selected !== undefined && s?.selected !== null ? [s.selected] : []);
    setNumeric(s?.numericValue !== undefined && s?.numericValue !== null ? String(s.numericValue) : "");
  }, []);

  function go(i: number, patch?: Partial<Slot>) {
    const target = Math.max(0, Math.min(paper.length - 1, i));
    const next = slots.map((s, k) => (k === idx ? { ...s, ...patch, ms: s.ms + since(shownAt.current) } : k === target ? { ...s, visited: true } : s));
    setSlots(next);
    setIdx(target);
    load(target, next);
    setPaletteOpen(false);
  }

  const saveNext = () => go(idx + 1, { saved: response(), marked: false });
  const saveMark = () => go(idx + 1, { saved: response(), marked: true });
  const markNext = () => go(idx + 1, { marked: true });
  const clear = () => {
    setPicks([]);
    setNumeric("");
    setSlots((cur) => cur.map((s, k) => (k === idx ? { ...s, saved: null } : s)));
  };

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    setSending(true);
    setError("");
    const final = slots.map((s, k) => (k === idx ? { ...s, ms: s.ms + (Date.now() - shownAt.current) } : s));
    try {
      const r = await submitExam(chapterId, paper.map((p, k) => ({ questionId: p.id, answer: final[k].saved, timeMs: final[k].ms })));
      onDone(r);
    } catch {
      submitted.current = false;
      setSending(false);
      setError("Couldn't submit the test. Check your connection and try again.");
    }
  }, [chapterId, paper, slots, idx, onDone]);

  // Countdown against a fixed deadline (so a background tab can't slow it); the test submits
  // itself when time runs out.
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);
  useEffect(() => {
    if (!seconds) return;
    const deadline = Date.now() + seconds * 1000;
    const t = setInterval(() => {
      const rest = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setLeft(rest);
      if (rest === 0) {
        clearInterval(t);
        void submitRef.current();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [seconds]);

  // Leaving the page mid-test loses the answers, so ask first.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (!submitted.current) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const clock = `${String(Math.floor(left / 3600)).padStart(2, "0")}:${String(Math.floor((left % 3600) / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const toggle = (i: number) => setPicks((cur) => (q.format === "MULTIPLE" ? (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]) : [i]));

  const palette = (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-border p-3">
        <span className="grid size-10 place-items-center rounded-full bg-foreground text-sm font-bold text-card">{candidate.trim()[0]?.toUpperCase() ?? "S"}</span>
        <span className="truncate font-semibold">{candidate}</span>
      </div>
      <ul className="space-y-2 text-sm">
        {LEGEND.map(([k, label]) => (
          <li key={k} className="flex items-center gap-2.5"><Tile status={k} small /> <span>{tally[k]} {label}</span></li>
        ))}
      </ul>
      <div className="grid grid-cols-6 gap-2">
        {paper.map((p, i) => <Tile key={p.id} status={statuses[i]} current={i === idx} onClick={() => go(i)}>{i + 1}</Tile>)}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-card text-foreground">
      <header className="flex items-center gap-3 border-b border-border bg-muted/60 px-4 py-2.5 text-sm">
        <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
        {seconds > 0 && (
          <span className={cx("flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono font-bold tabular-nums", left < 300 ? "bg-destructive/15 text-destructive" : "bg-card")} aria-label="Time left">
            <Clock className="size-4" /> {clock}
          </span>
        )}
        <span className="hidden sm:inline">Candidate: <b>{candidate}</b></span>
        <button type="button" onClick={() => setPaletteOpen(true)} className="grid size-9 place-items-center rounded-md border border-border lg:hidden" aria-label="Question palette"><LayoutGrid className="size-4" /></button>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto p-5 tablet:p-8">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-md bg-primary/10 px-2.5 py-1 font-bold text-primary">Question {idx + 1}</span>
            <span className="text-muted-foreground">of {paper.length}</span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">{FORMAT_LABEL[q.format]}</span>
            {(q.exam || q.year) && <span className="rounded-full bg-gold/20 px-2.5 py-1 text-xs font-bold">{[q.exam, q.year].filter(Boolean).join(" ")}</span>}
          </div>
          <p className="mt-5 whitespace-pre-wrap text-[clamp(18px,1.6vw,22px)] font-bold leading-relaxed">{q.prompt}</p>

          {q.format === "NUMERICAL" ? (
            <div className="mt-8 max-w-xs">
              <p className="mb-2 text-sm text-muted-foreground">Type your answer</p>
              <input value={numeric} onChange={(e) => setNumeric(e.target.value.replace(/[^\d.\-]/g, ""))} inputMode="decimal" className="w-full rounded-lg border-2 border-border bg-card px-4 py-3 text-lg font-bold tabular-nums outline-none focus:border-primary" placeholder="e.g. 12.5" />
            </div>
          ) : (
            <div className="mt-8">
              <p className="mb-3 text-sm text-muted-foreground">{q.format === "MULTIPLE" ? "Select one or more options" : "Select one option"}</p>
              <div className="space-y-3">
                {q.options.map((o, i) => {
                  const on = picks.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggle(i)}
                      className={cx("flex w-full items-center gap-4 rounded-xl border-2 px-4 py-4 text-left transition", on ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30")}
                    >
                      <span className={cx("grid size-9 shrink-0 place-items-center rounded-md text-sm font-bold", on ? "bg-primary text-primary-foreground" : "bg-muted")}>{LETTERS[i]}</span>
                      <span className="min-w-0 flex-1 whitespace-pre-wrap text-base">{o}</span>
                      <span className={cx("grid size-6 shrink-0 place-items-center border-2", q.format === "MULTIPLE" ? "rounded-md" : "rounded-full", on ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                        {on && <Check className="size-3.5" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {error && <p role="alert" className="mt-5 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>}
        </main>

        <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-border p-5 lg:block">{palette}</aside>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <button type="button" onClick={markNext} className="rounded-md bg-[oklch(0.7_0.15_60)] px-4 py-2.5 text-sm font-bold text-white hover:brightness-105">Mark for Review &amp; Next</button>
        <button type="button" onClick={clear} className="rounded-md border border-foreground/30 px-4 py-2.5 text-sm font-bold hover:bg-muted">Clear Response</button>
        <button type="button" onClick={saveMark} className="rounded-md bg-[oklch(0.5_0.2_290)] px-4 py-2.5 text-sm font-bold text-white hover:brightness-110">Save &amp; Mark for Review</button>
        <button type="button" onClick={() => setConfirming(true)} className="rounded-md bg-[oklch(0.45_0.13_150)] px-4 py-2.5 text-sm font-bold text-white hover:brightness-110">End Test</button>
        <button type="button" onClick={saveNext} className="ml-auto rounded-md bg-[oklch(0.62_0.17_150)] px-5 py-2.5 text-sm font-bold text-white hover:brightness-105">Save &amp; Next</button>
      </footer>

      {paletteOpen && (
        <div className="fixed inset-0 z-[85] flex justify-end bg-black/40 lg:hidden" onClick={() => setPaletteOpen(false)}>
          <div className="h-full w-[min(360px,90vw)] overflow-y-auto bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex justify-end"><button type="button" onClick={() => setPaletteOpen(false)} aria-label="Close"><X className="size-5" /></button></div>
            {palette}
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label="End test">
            <h3 className="text-xl font-extrabold">End the test?</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {LEGEND.map(([k, label]) => <li key={k} className="flex items-center gap-2.5"><Tile status={k} small /> {tally[k]} {label}</li>)}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">Answered and “answered &amp; marked” questions are graded. Unsaved selections are not.</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} disabled={sending} className="rounded-md border border-border px-4 py-2.5 text-sm font-bold">Back to test</button>
              <button type="button" onClick={() => { if (confirm("Quit without submitting? Your answers will be lost.")) onQuit(); }} disabled={sending} className="rounded-md px-4 py-2.5 text-sm font-bold text-muted-foreground">Quit</button>
              <button type="button" onClick={() => void submit()} disabled={sending} className="rounded-md bg-[oklch(0.45_0.13_150)] px-5 py-2.5 text-sm font-bold text-white">{sending ? "Submitting…" : "Submit test"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function answerText(q: ExamQuestion, a: Answer | null) {
  if (empty(a)) return "Not answered";
  if (q.format === "NUMERICAL") return String(a!.numericValue);
  if (q.format === "MULTIPLE") return (a!.selectedMany ?? []).map((i) => LETTERS[i]).join(", ");
  return LETTERS[a!.selected ?? 0];
}

function keyText(q: ExamQuestion, k: ExamResult["results"][number]["key"]) {
  if (q.format === "NUMERICAL") return `${k.numericAnswer}${k.tolerance ? ` (±${k.tolerance})` : ""}`;
  if (q.format === "MULTIPLE") return k.correctIndices.map((i) => LETTERS[i]).join(", ");
  return LETTERS[k.correctIndex];
}

function ExamReview({ paper, result, onRetake }: { paper: ExamQuestion[]; result: ExamResult; onRetake: () => void }) {
  const [show, setShow] = useState<"all" | "wrong" | "skipped">("all");
  const byId = new Map(result.results.map((r) => [r.id, r]));
  const rows = paper.map((q, i) => ({ q, i, r: byId.get(q.id) })).filter((x) => x.r);
  const correct = rows.filter((x) => x.r!.isCorrect).length;
  const skipped = rows.filter((x) => x.r!.skipped).length;
  const wrong = rows.length - correct - skipped;
  const attempted = rows.length - skipped;
  const list = rows.filter((x) => show === "all" || (show === "skipped" ? x.r!.skipped : !x.r!.skipped && !x.r!.isCorrect));

  const stats = [
    { label: "Score", value: `${result.marks} / ${result.maxMarks}` },
    { label: "Correct", value: String(correct) },
    { label: "Wrong", value: String(wrong) },
    { label: "Unattempted", value: String(skipped) },
    { label: "Accuracy", value: attempted ? `${Math.round((correct / attempted) * 100)}%` : "–" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 tablet:p-8">
        <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Test result</h2>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg bg-muted px-4 py-3">
              <dt className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">{s.label}</dt>
              <dd className="mt-1 text-xl font-extrabold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
        {result.xp > 0 && <p className="mt-4 text-sm font-semibold text-xp">+{result.xp} XP for first-time correct answers</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={onRetake} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Take another test</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {([["all", `All (${rows.length})`], ["wrong", `Wrong (${wrong})`], ["skipped", `Unattempted (${skipped})`]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setShow(k)} className={cx("rounded-full border px-4 py-2 text-sm font-bold", show === k ? "border-foreground bg-foreground text-card" : "border-border bg-card")}>{label}</button>
        ))}
      </div>

      <ol className="space-y-4">
        {list.map(({ q, i, r }) => (
          <li key={q.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="font-mono text-muted-foreground">Q{i + 1}</span>
              <span className={cx("rounded-full px-2.5 py-1", r!.isCorrect ? "bg-ok/15 text-ok" : r!.skipped ? "bg-muted text-muted-foreground" : r!.partial ? "bg-gold/25" : "bg-destructive/12 text-destructive")}>
                {r!.isCorrect ? "Correct" : r!.skipped ? "Not answered" : r!.partial ? "Partly correct" : "Wrong"} · {r!.marks > 0 ? `+${r!.marks}` : r!.marks}
              </span>
              {(q.exam || q.year) && <span className="rounded-full bg-gold/20 px-2.5 py-1">{[q.exam, q.year].filter(Boolean).join(" ")}</span>}
            </div>
            <p className="mt-3 whitespace-pre-wrap font-semibold">{q.prompt}</p>
            {q.options.length > 0 && (
              <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
                {q.options.map((o, k) => {
                  const isKey = q.format === "MULTIPLE" ? r!.key.correctIndices.includes(k) : q.format === "SINGLE" && r!.key.correctIndex === k;
                  return <li key={k} className={cx("rounded-md px-2.5 py-1.5", isKey ? "bg-ok/12 font-semibold" : "bg-muted/60")}><b>{LETTERS[k]}.</b> {o}</li>;
                })}
              </ul>
            )}
            <p className="mt-3 text-sm">Your answer: <b>{answerText(q, r!.answer)}</b> · Correct answer: <b className="text-ok">{keyText(q, r!.key)}</b></p>
            {r!.solution && (
              <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">Explanation</p>
                <p className="whitespace-pre-wrap">{r!.solution}</p>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
