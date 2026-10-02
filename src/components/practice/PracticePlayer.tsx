"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Check, ChevronLeft, ChevronRight, CircleAlert, Clock, RotateCcw, X, Zap } from "lucide-react";
import { submitPracticeAnswer, type PracticeResult } from "@/app/actions/practice";
import { toggleBookmark } from "@/app/actions/learn";
import { tone } from "@/components/learn/tone";
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
    return <div className="card p-10 text-center text-muted-foreground">No questions match these filters.</div>;
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
            <span className={`font-bold ${sessionMarks >= 0 ? "text-ok" : "text-bad"}`}>{signed(sessionMarks)} marks</span>
          </>
        )}
      </div>

      {/* Question map */}
      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {questions.map((v, i) => {
          const d = done[v.id]?.result;
          const color = !d ? "bg-surface-2 text-muted-foreground" : d.skipped ? "bg-gold/25 text-foreground" : d.isCorrect ? "bg-ok text-white" : d.partial ? "bg-gold text-white" : "bg-bad text-white";
          return (
            <button
              key={v.id}
              onClick={() => go(i)}
              className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold transition ${i === idx ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""} ${color}`}
              aria-label={`Question ${i + 1}${d ? (d.isCorrect ? ", correct" : d.skipped ? ", skipped" : ", incorrect") : ""}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="card relative p-5 sm:p-6">
        {xpPop && <span className="animate-pop absolute right-5 top-5 flex items-center gap-1 rounded-full bg-xp px-3 py-1 text-sm font-bold text-white"><Zap className="size-4" /> +{xpPop} XP</span>}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="text-muted-foreground">Q{idx + 1}</span>
          <span className={`rounded-md px-2 py-0.5 ${q.type === "PYQ" ? "bg-gold/20 text-gold" : "bg-primary/10 text-primary"}`}>{q.type}</span>
          <span className="rounded-md bg-xp/10 px-2 py-0.5 text-xp">{FORMAT_LABEL[q.format]}</span>
          {q.exam && <span className="rounded-md bg-surface-2 px-2 py-0.5 text-muted-foreground">{q.exam}{q.year ? ` ${q.year}` : ""}</span>}
          <span className="text-muted-foreground">{DIFFICULTY_LABEL[q.difficulty]}</span>
          {q.topic && <span className="text-muted-foreground">· {q.topic}</span>}
          <span className="ml-auto flex items-center gap-1 tabular-nums text-muted-foreground" aria-label="Time on this question">
            {!res && <><Clock className="size-3.5" /> {fmtTime(elapsed)}</>}
          </span>
          <button
            onClick={async () => setMarks({ ...marks, [q.id]: await toggleBookmark(q.id) })}
            className="grid size-9 place-items-center rounded-full hover:bg-surface-2"
            aria-label={marks[q.id] ? "Remove bookmark" : "Bookmark question"}
          >
            {marks[q.id] ? <BookmarkCheck className="size-5 fill-primary text-primary" /> : <Bookmark className="size-5 text-muted-foreground" />}
          </button>
        </div>

        <p className="mt-3 whitespace-pre-line text-lg font-semibold leading-relaxed">{q.prompt}</p>
        {q.format === "MULTIPLE" && !res && <p className="mt-1 text-sm text-muted-foreground">One or more options are correct. Partial marks if you pick only correct ones.</p>}

        {q.format !== "NUMERICAL" ? (
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {q.options.map((opt, i) => {
              const isKey = r && (q.format === "SINGLE" ? i === r.key.correctIndex : r.key.correctIndices.includes(i));
              const isPicked = picked.includes(i);
              const wrongPick = r && isPicked && !isKey;
              const missed = r && isKey && !isPicked && q.format === "MULTIPLE";
              const cls = r
                ? isKey ? (missed ? "border-ok border-dashed" : "border-ok bg-ok/10") : wrongPick ? "border-bad bg-bad/10" : "border-border opacity-60"
                : isPicked ? "border-primary bg-primary/5" : "border-border hover:border-primary";
              return (
                <button
                  key={i}
                  disabled={!!res || pending}
                  onClick={() => toggle(i)}
                  aria-pressed={isPicked}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left font-medium transition active:scale-[0.99] ${cls}`}
                >
                  <span className={`grid size-8 shrink-0 place-items-center text-sm font-bold ${q.format === "MULTIPLE" ? "rounded-lg" : "rounded-full"} ${
                    r && isKey && !missed ? "bg-ok text-white" : wrongPick ? "bg-bad text-white" : isPicked && !r ? "bg-primary text-white" : "bg-surface-2"
                  }`}>
                    {r && isKey && !missed ? <Check className="size-4" strokeWidth={3} /> : wrongPick ? <X className="size-4" strokeWidth={3} /> : LETTERS[i]}
                  </span>
                  <span className="min-w-0 flex-1">{opt}</span>
                  {missed && <span className="text-xs font-bold text-ok">missed</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-5">
            {!res ? (
              <label className="block max-w-xs">
                <span className="text-sm font-semibold">Your answer</span>
                <input
                  value={numeric}
                  onChange={(e) => setNumeric(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g. 12 or 0.25"
                  className="input mt-1 text-lg font-bold tabular-nums"
                  autoComplete="off"
                />
              </label>
            ) : (
              <div className="flex flex-wrap gap-3 text-sm">
                <span className={`rounded-xl px-3 py-2 font-bold ${r!.isCorrect ? "bg-ok/10 text-ok" : r!.skipped ? "bg-surface-2" : "bg-bad/10 text-bad"}`}>
                  You: {res.answer.numericValue ?? "—"}
                </span>
                <span className="rounded-xl bg-ok/10 px-3 py-2 font-bold text-ok">
                  Answer: {r!.key.numericAnswer}{r!.key.tolerance ? ` (±${r!.key.tolerance})` : ""}
                </span>
              </div>
            )}
          </div>
        )}

        {error && <p role="alert" className="mt-3 flex items-start gap-2 text-sm font-semibold text-bad"><CircleAlert className="mt-0.5 size-4 shrink-0" />{error}</p>}

        {r && (
          <div className={`animate-rise mt-5 rounded-2xl p-4 ${r.isCorrect ? "bg-ok/10" : r.partial ? "bg-gold/15" : r.skipped ? "bg-surface-2" : "bg-bad/10"}`}>
            <p className={`flex flex-wrap items-center gap-2 font-bold ${r.isCorrect ? "text-ok" : r.partial ? "text-gold" : r.skipped ? "text-muted-foreground" : "text-bad"}`}>
              <span className="rounded-md bg-card px-2 py-0.5 text-sm tabular-nums">{signed(r.marks)}</span>
              {r.isCorrect ? "Correct! 🎯" : r.partial ? "Partially correct: you missed an option" : r.skipped ? "Skipped" : "Not quite. Here's how"}
            </p>
            {r.solution && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{r.solution}</p>}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <button onClick={() => go(idx - 1)} disabled={idx === 0} className="btn btn-ghost"><ChevronLeft className="size-4" /> Prev</button>
          {!res ? (
            <div className="flex items-center gap-3">
              <button onClick={() => submit(q.format === "SINGLE" ? { selected: null } : q.format === "MULTIPLE" ? { selectedMany: [] } : { numericValue: null })} disabled={pending} className="text-sm font-semibold text-muted-foreground underline-offset-2 hover:underline">Skip</button>
              <button onClick={submitCurrent} disabled={pending || (q.format !== "NUMERICAL" && !picks.length)} className="btn btn-primary">{pending ? "Checking…" : "Submit"}</button>
            </div>
          ) : (
            <button onClick={retry} className="btn btn-ghost text-sm"><RotateCcw className="size-4" /> Try again</button>
          )}
          <button onClick={() => go(idx + 1)} disabled={idx === questions.length - 1} className="btn btn-ghost">Next <ChevronRight className="size-4" /></button>
        </div>
      </div>
      <p className="mt-3 hidden text-center text-xs text-muted-foreground sm:block">Keys: A–D or 1–4 to pick · Enter to submit · ← → to move</p>
    </div>
  );
}
