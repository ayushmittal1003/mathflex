"use client";
// Practice player in the website design. Same logic as components/practice/PracticePlayer
// (answers graded on the server by submitPracticeAnswer; keys only arrive with a result).
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Check, ChevronLeft, ChevronRight, CircleAlert, Clock, RotateCcw, X, Zap } from "lucide-react";
import { submitPracticeAnswer, type PracticeResult } from "@/app/actions/practice";
import { toggleBookmark } from "@/app/actions/learn";
import { tone } from "@/components/learn/tone";
import { button, cx, tone as btnTone } from "../ui";
import { DIFFICULTY_LABEL, FORMAT_LABEL, fmtTime, type Answer } from "@/lib/grading";

export type PracticeQuestion = {
  id: string;
  type: "DPP" | "PYQ";
  format: "SINGLE" | "MULTIPLE" | "NUMERICAL";
  exam: string | null;
  year: number | null;
  difficulty: number;
  topic: string | null;
  prompt: string;
  options: string[];
  bookmarked: boolean;
  // Only sent for questions the student already answered, so keys never reach the page early.
  prior: { answer: Answer; result: Omit<PracticeResult, "xp"> } | null;
};

type Done = { answer: Answer; result: PracticeResult; fresh: boolean };

const LETTERS = "ABCDEFGH";
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

export function PracticePlayer({ questions, sound }: { questions: PracticeQuestion[]; sound: boolean }) {
  const [done, setDone] = useState<Record<string, Done>>(() =>
    Object.fromEntries(questions.filter((q) => q.prior).map((q) => [q.id, { answer: q.prior!.answer, result: { ...q.prior!.result, xp: 0 }, fresh: false }])),
  );
  const [marks, setMarks] = useState<Record<string, boolean>>(() => Object.fromEntries(questions.map((q) => [q.id, q.bookmarked])));
  const [idx, setIdx] = useState(() => Math.max(0, questions.findIndex((q) => !q.prior)));
  const [picks, setPicks] = useState<number[]>([]);
  const [numeric, setNumeric] = useState("");
  const [error, setError] = useState("");
  const [xpPop, setXpPop] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const shownAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  const q = questions[idx];
  const res = q ? done[q.id] : undefined;

  // Per-question stopwatch; pauses once the question is answered.
  useEffect(() => {
    shownAt.current = Date.now();
    if (res) return;
    const t = setInterval(() => setElapsed(Date.now() - shownAt.current), 1000);
    return () => clearInterval(t);
  }, [idx, res]);

  const go = useCallback((i: number) => {
    setIdx(Math.max(0, Math.min(questions.length - 1, i)));
    setElapsed(0);
    setPicks([]);
    setNumeric("");
    setError("");
  }, [questions.length]);

  const submit = useCallback((answer: Answer) => {
    if (!q || res || pending) return;
    setError("");
    start(async () => {
      try {
        const r = await submitPracticeAnswer(q.id, answer, Date.now() - shownAt.current);
        if (sound && !r.skipped) tone(r.isCorrect || r.partial);
        if (r.xp) {
          setXpPop(r.xp);
          setTimeout(() => setXpPop(null), 1200);
        }
        setDone((d) => ({ ...d, [q.id]: { answer, result: r, fresh: true } }));
      } catch {
        setError("Couldn't save your answer. Check your connection and try again.");
      }
    });
  }, [q, res, pending, sound]);

  const submitCurrent = useCallback(() => {
    if (!q) return;
    if (q.format === "SINGLE") return submit({ selected: picks[0] ?? null });
    if (q.format === "MULTIPLE") return submit({ selectedMany: picks });
    const v = Number(numeric.trim());
    if (numeric.trim() === "" || !Number.isFinite(v)) return setError("Enter a number, e.g. 12 or -0.5");
    submit({ numericValue: v });
  }, [q, picks, numeric, submit]);

  function toggle(i: number) {
    if (!q || res) return;
    if (q.format === "SINGLE") setPicks([i]);
    else setPicks((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i].sort()));
  }

  function retry() {
    if (!q) return;
    setDone((d) => {
      const next = { ...d };
      delete next[q.id];
      return next;
    });
    setPicks([]);
    setNumeric("");
    setElapsed(0);
  }

  // Keyboard: A-D / 1-4 pick, Enter submits, ←/→ move.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!q || (e.target as HTMLElement)?.tagName === "INPUT") {
        if (e.key === "Enter" && q?.format === "NUMERICAL" && !res) submitCurrent();
        return;
      }
      if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (e.key === "Enter" && !res && (picks.length || q.format === "NUMERICAL")) submitCurrent();
      else if (!res && q.format !== "NUMERICAL") {
        const k = e.key.toUpperCase();
        const i = /^[1-8]$/.test(k) ? Number(k) - 1 : LETTERS.indexOf(k);
        if (i >= 0 && i < q.options.length && k.length === 1) toggle(i);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!questions.length) {
    return <div className="rounded-xl border border-dashed border-border bg-muted/50 px-6 py-14 text-center text-muted-foreground">No questions match these filters.</div>;
  }

  const session = Object.values(done).filter((d) => d.fresh && !d.result.skipped);
  const sessionMarks = session.reduce((s, d) => s + d.result.marks, 0);
  const answered = Object.keys(done).length;
  const r = res?.result;
  const picked = !res ? picks : q.format === "MULTIPLE" ? res.answer.selectedMany ?? [] : res.answer.selected != null ? [res.answer.selected] : [];

  return (
    <div>
      {/* Session bar */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="font-semibold text-muted-foreground">{answered}/{questions.length} answered</span>
        {session.length > 0 && (
          <>
            <span><b>{session.filter((d) => d.result.isCorrect).length}</b>/{session.length} correct this session</span>
            <span className={cx("font-bold", sessionMarks >= 0 ? "text-ok" : "text-bad")}>{signed(sessionMarks)} marks</span>
          </>
        )}
      </div>

      {/* Question map */}
      <div className="no-scrollbar mb-5 flex gap-1.5 overflow-x-auto p-1.5">
        {questions.map((v, i) => {
          const d = done[v.id]?.result;
          const color = !d ? "bg-muted text-secondary-foreground hover:bg-border" : d.skipped ? "bg-gold/25 text-foreground" : d.isCorrect ? "bg-ok text-white" : d.partial ? "bg-gold text-white" : "bg-bad text-white";
          return (
            <button
              key={v.id}
              onClick={() => go(i)}
              className={cx("grid size-9 shrink-0 place-items-center rounded-md font-mono text-xs font-bold transition", i === idx && "ring-2 ring-foreground ring-offset-2 ring-offset-card", color)}
              aria-label={`Question ${i + 1}${d ? (d.isCorrect ? ", correct" : d.skipped ? ", skipped" : ", incorrect") : ""}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="relative rounded-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-36px_rgb(80_20_0/0.4)] tablet:p-8">
        {xpPop && <span className="absolute right-6 top-6 flex animate-mf-pop items-center gap-1 rounded-full bg-xp px-3 py-1 text-sm font-bold text-white"><Zap className="size-4" /> +{xpPop} XP</span>}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="font-mono text-muted-foreground">Q{idx + 1} / {questions.length}</span>
          <span className={cx("rounded-full px-2.5 py-1", q.type === "PYQ" ? "bg-gold/20 text-[color-mix(in_oklab,var(--gold)_55%,black)]" : "bg-primary/10 text-primary")}>{q.type}</span>
          <span className="rounded-full bg-xp/10 px-2.5 py-1 text-xp">{FORMAT_LABEL[q.format]}</span>
          {q.exam && <span className="rounded-full bg-muted px-2.5 py-1 text-secondary-foreground">{q.exam}{q.year ? ` ${q.year}` : ""}</span>}
          <span className="rounded-full bg-muted px-2.5 py-1 text-secondary-foreground">{DIFFICULTY_LABEL[q.difficulty]}</span>
          {q.topic && <span className="text-muted-foreground">· {q.topic}</span>}
          <span className="ml-auto flex items-center gap-1 font-mono tabular-nums text-muted-foreground" aria-label="Time on this question">
            {!res && <><Clock className="size-3.5" /> {fmtTime(elapsed)}</>}
          </span>
          <button
            onClick={async () => setMarks({ ...marks, [q.id]: await toggleBookmark(q.id) })}
            className="grid size-9 place-items-center rounded-full transition hover:bg-muted"
            aria-label={marks[q.id] ? "Remove bookmark" : "Bookmark question"}
          >
            {marks[q.id] ? <BookmarkCheck className="size-5 fill-primary text-primary" /> : <Bookmark className="size-5 text-muted-foreground" />}
          </button>
        </div>

        <p className="mt-5 whitespace-pre-line text-[clamp(19px,2vw,22px)] font-bold leading-[1.5] tracking-[-0.01em]">{q.prompt}</p>
        {q.format === "MULTIPLE" && !res && <p className="mt-1.5 text-sm text-muted-foreground">One or more options are correct. Partial marks if you pick only correct ones.</p>}

        {q.format !== "NUMERICAL" ? (
          <div className="mt-6 grid gap-2.5 min-[700px]:grid-cols-2">
            {q.options.map((opt, i) => {
              const isKey = r && (q.format === "SINGLE" ? i === r.key.correctIndex : r.key.correctIndices.includes(i));
              const isPicked = picked.includes(i);
              const wrongPick = r && isPicked && !isKey;
              const missed = r && isKey && !isPicked && q.format === "MULTIPLE";
              const cls = r
                ? isKey ? (missed ? "border-ok border-dashed" : "border-ok bg-ok/10") : wrongPick ? "border-bad bg-bad/8" : "border-border opacity-60"
                : isPicked ? "border-primary bg-selected" : "border-border hover:border-foreground/40 hover:bg-muted/50";
              return (
                <button
                  key={i}
                  disabled={!!res || pending}
                  onClick={() => toggle(i)}
                  aria-pressed={isPicked}
                  className={cx("flex items-center gap-3.5 rounded-lg border-2 px-4 py-3.5 text-left text-[16px] font-semibold transition duration-200 ease-mf active:scale-[0.99]", cls)}
                >
                  <span className={cx(
                    "grid size-8 shrink-0 place-items-center font-mono text-sm font-extrabold",
                    q.format === "MULTIPLE" ? "rounded-md" : "rounded-full",
                    r && isKey && !missed ? "bg-ok text-white" : wrongPick ? "bg-bad text-white" : isPicked && !r ? "bg-primary text-white" : "bg-muted text-secondary-foreground",
                  )}>
                    {r && isKey && !missed ? <Check className="size-4" strokeWidth={3} /> : wrongPick ? <X className="size-4" strokeWidth={3} /> : LETTERS[i]}
                  </span>
                  <span className="min-w-0 flex-1">{opt}</span>
                  {missed && <span className="text-xs font-bold text-ok">missed</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-6">
            {!res ? (
              <label className="block max-w-xs">
                <span className="text-sm font-bold">Your answer</span>
                <input
                  value={numeric}
                  onChange={(e) => setNumeric(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g. 12 or 0.25"
                  className="mt-1.5 w-full rounded-lg border-2 border-border bg-card px-4 py-3 text-lg font-bold tabular-nums outline-none transition focus:border-foreground"
                  autoComplete="off"
                />
              </label>
            ) : (
              <div className="flex flex-wrap gap-3 text-sm">
                <span className={cx("rounded-lg px-3 py-2 font-bold", r!.isCorrect ? "bg-ok/10 text-ok" : r!.skipped ? "bg-muted" : "bg-bad/10 text-bad")}>
                  You: {res.answer.numericValue ?? "—"}
                </span>
                <span className="rounded-lg bg-ok/10 px-3 py-2 font-bold text-ok">
                  Answer: {r!.key.numericAnswer}{r!.key.tolerance ? ` (±${r!.key.tolerance})` : ""}
                </span>
              </div>
            )}
          </div>
        )}

        {error && <p role="alert" className="mt-3 flex items-start gap-2 text-sm font-semibold text-bad"><CircleAlert className="mt-0.5 size-4 shrink-0" />{error}</p>}

        {r && (
          <div className={cx("mt-6 animate-mf-rise rounded-lg p-5", r.isCorrect ? "bg-ok/8" : r.partial ? "bg-gold/15" : r.skipped ? "bg-muted" : "bg-[color-mix(in_oklab,var(--brand-2)_10%,transparent)]")}>
            <p className={cx("flex flex-wrap items-center gap-2 font-extrabold", r.isCorrect ? "text-ok" : r.partial ? "text-[color-mix(in_oklab,var(--gold)_55%,black)]" : r.skipped ? "text-muted-foreground" : "text-foreground")}>
              <span className="rounded-md bg-card px-2 py-0.5 font-mono text-sm tabular-nums">{signed(r.marks)}</span>
              {r.isCorrect ? "Correct! Nicely done." : r.partial ? "Partially correct: you missed an option" : r.skipped ? "Skipped" : "Not quite. Here's how"}
            </p>
            {r.solution && <p className="mt-2.5 whitespace-pre-line text-[16px] leading-[1.65] text-secondary-foreground">{r.solution}</p>}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-2">
          <button onClick={() => go(idx - 1)} disabled={idx === 0} className={cx(button.sm, btnTone.secondary)}><ChevronLeft className="size-4" /> Prev</button>
          {!res ? (
            <div className="flex items-center gap-3">
              <button onClick={() => submit(q.format === "SINGLE" ? { selected: null } : q.format === "MULTIPLE" ? { selectedMany: [] } : { numericValue: null })} disabled={pending} className="text-sm font-bold text-muted-foreground underline-offset-2 hover:underline">Skip</button>
              <button onClick={submitCurrent} disabled={pending || (q.format !== "NUMERICAL" && !picks.length)} className={cx(button.sm, btnTone.primary)}>{pending ? "Checking…" : "Submit"}</button>
            </div>
          ) : (
            <button onClick={retry} className={cx(button.sm, btnTone.secondary)}><RotateCcw className="size-4" /> Try again</button>
          )}
          <button onClick={() => go(idx + 1)} disabled={idx === questions.length - 1} className={cx(button.sm, btnTone.secondary)}>Next <ChevronRight className="size-4" /></button>
        </div>
      </div>
      <p className="mt-3 hidden text-center text-xs text-muted-foreground tablet:block">Keys: A–D or 1–4 to pick · Enter to submit · ← → to move</p>
    </div>
  );
}
