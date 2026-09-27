"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Check, X, ChevronRight, Lock, RotateCcw, Zap } from "lucide-react";
import { answerQuestion, toggleBookmark } from "@/app/actions/learn";

export type QuizQuestion = {
  id: string;
  type: "DPP" | "PYQ";
  exam: string | null;
  year: number | null;
  difficulty: number;
  prompt: string;
  options: string[];
  bookmarked: boolean;
  // present only once the student has attempted it
  prior: { selected: number | null; isCorrect: boolean; correctIndex: number; solution: string } | null;
};

type Result = { selected: number | null; isCorrect: boolean; correctIndex: number; solution: string; xp: number };

// Short "ding" / "bonk" feedback tones.
function tone(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = ok ? "sine" : "square";
    o.frequency.setValueAtTime(ok ? 880 : 180, ctx.currentTime);
    if (ok) o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.3);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

export function Quiz({
  questions,
  locked,
  sound,
  onAllAnswered,
}: {
  questions: QuizQuestion[];
  locked: boolean;
  sound: boolean;
  onAllAnswered: () => void;
}) {
  const [filter, setFilter] = useState<"ALL" | "DPP" | "PYQ">("ALL");
  const [results, setResults] = useState<Record<string, Result>>(() =>
    Object.fromEntries(questions.filter((q) => q.prior).map((q) => [q.id, { ...q.prior!, xp: 0 }])),
  );
  const [marks, setMarks] = useState<Record<string, boolean>>(() => Object.fromEntries(questions.map((q) => [q.id, q.bookmarked])));
  const visible = useMemo(() => questions.filter((q) => filter === "ALL" || q.type === filter), [questions, filter]);
  const [idx, setIdx] = useState(() => Math.max(0, questions.findIndex((q) => !q.prior)));
  const [pending, start] = useTransition();
  const [xpPop, setXpPop] = useState<number | null>(null);
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  if (locked) {
    return (
      <div className="card grid place-items-center p-10 text-center">
        <Lock className="size-10 text-muted" />
        <p className="mt-3 font-bold">Practice unlocks after the video</p>
        <p className="mt-1 max-w-xs text-sm text-muted">Watch this part to the end to unlock its DPPs and PYQs. They cover only the topics in this part.</p>
      </div>
    );
  }
  if (!questions.length) return <div className="card p-8 text-center text-muted">No practice questions for this part yet.</div>;

  const q = visible[Math.min(idx, visible.length - 1)];
  const res = q ? results[q.id] : undefined;
  const answered = Object.keys(results).length;

  function choose(i: number | null) {
    if (!q || res || pending) return;
    start(async () => {
      const r = await answerQuestion(q.id, i, Date.now() - shownAt.current);
      if (sound) tone(r.isCorrect);
      if (r.xp) {
        setXpPop(r.xp);
        setTimeout(() => setXpPop(null), 1200);
      }
      const next = { ...results, [q.id]: { selected: i, ...r } };
      setResults(next);
      if (Object.keys(next).length === questions.length) onAllAnswered();
    });
  }

  function go(delta: number) {
    setIdx((i) => Math.max(0, Math.min(visible.length - 1, i + delta)));
    shownAt.current = Date.now();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full bg-surface-2 p-1 text-sm font-semibold">
          {(["ALL", "DPP", "PYQ"] as const).map((f) => (
            <button key={f} onClick={() => { setFilter(f); setIdx(0); }} className={`rounded-full px-3.5 py-1.5 ${filter === f ? "bg-surface shadow" : "text-muted"}`}>
              {f === "ALL" ? "All" : f === "DPP" ? "DPPs" : "PYQs"}
            </button>
          ))}
        </div>
        <span className="text-sm font-semibold text-muted">{answered}/{questions.length} done</span>
      </div>

      {/* progress dots */}
      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {visible.map((v, i) => {
          const r = results[v.id];
          return (
            <button
              key={v.id}
              onClick={() => { setIdx(i); shownAt.current = Date.now(); }}
              className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold transition ${
                i === idx ? "ring-2 ring-brand ring-offset-2 ring-offset-bg" : ""
              } ${r ? (r.isCorrect ? "bg-ok text-white" : "bg-bad text-white") : "bg-surface-2 text-muted"}`}
              aria-label={`Question ${i + 1}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {q && (
        <div className="card relative p-5 sm:p-6">
          {xpPop && <span className="animate-pop absolute right-5 top-5 flex items-center gap-1 rounded-full bg-xp px-3 py-1 text-sm font-bold text-white"><Zap className="size-4" /> +{xpPop} XP</span>}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className={`rounded-md px-2 py-0.5 ${q.type === "PYQ" ? "bg-gold/20 text-gold" : "bg-brand/10 text-brand"}`}>{q.type}</span>
            {q.exam && <span className="rounded-md bg-surface-2 px-2 py-0.5 text-muted">{q.exam}{q.year ? ` ${q.year}` : ""}</span>}
            <span className="text-muted">{["", "Easy", "Medium", "Hard"][q.difficulty]}</span>
            <button
              onClick={async () => setMarks({ ...marks, [q.id]: await toggleBookmark(q.id) })}
              className="ml-auto grid size-9 place-items-center rounded-full hover:bg-surface-2"
              aria-label="Bookmark question"
            >
              {marks[q.id] ? <BookmarkCheck className="size-5 fill-brand text-brand" /> : <Bookmark className="size-5 text-muted" />}
            </button>
          </div>
          <p className="mt-3 whitespace-pre-line text-lg font-semibold leading-relaxed">{q.prompt}</p>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {q.options.map((opt, i) => {
              const isAns = res && i === res.correctIndex;
              const isWrongPick = res && i === res.selected && !res.isCorrect;
              return (
                <button
                  key={i}
                  disabled={!!res || pending}
                  onClick={() => choose(i)}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left font-medium transition ${
                    isAns ? "border-ok bg-ok/10" : isWrongPick ? "border-bad bg-bad/10" : res ? "border-border opacity-60" : "border-border hover:border-brand active:scale-[0.99]"
                  }`}
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${isAns ? "bg-ok text-white" : isWrongPick ? "bg-bad text-white" : "bg-surface-2"}`}>
                    {isAns ? <Check className="size-4" strokeWidth={3} /> : isWrongPick ? <X className="size-4" strokeWidth={3} /> : "ABCD"[i]}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {res && (
            <div className={`animate-rise mt-5 rounded-2xl p-4 ${res.isCorrect ? "bg-ok/10" : "bg-bad/10"}`}>
              <p className={`font-bold ${res.isCorrect ? "text-ok" : "text-bad"}`}>
                {res.isCorrect ? ["Nailed it! 🎯", "Correct! 🔥", "Too easy 😎"][idx % 3] : res.selected === null ? "Skipped" : "Not quite — here's how"}
              </p>
              {res.solution && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{res.solution}</p>}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-2">
            <button onClick={() => go(-1)} disabled={idx === 0} className="btn btn-ghost">Back</button>
            {!res ? (
              <button onClick={() => choose(null)} disabled={pending} className="text-sm font-semibold text-muted underline-offset-2 hover:underline">Skip</button>
            ) : (
              <span />
            )}
            {idx < visible.length - 1 ? (
              <button onClick={() => go(1)} className="btn btn-primary">Next <ChevronRight className="size-4" /></button>
            ) : answered === questions.length ? (
              <button onClick={onAllAnswered} className="btn btn-primary"><RotateCcw className="size-4" /> See result</button>
            ) : (
              <span />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
