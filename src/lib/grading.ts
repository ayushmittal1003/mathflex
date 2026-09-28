import type { Settings } from "./settings";
import type { AnswerFormat } from "@/generated/prisma/enums";

// JEE-style grading plus small formatting helpers. Pure, so it's safe in client components.

export type Marking = Settings["marking"];
export type Answer = { selected?: number | null; selectedMany?: number[]; numericValue?: number | null };
export type AnswerKey = { format: AnswerFormat; correctIndex: number; correctIndices: number[]; numericAnswer: number | null; tolerance: number };
export type Graded = { isCorrect: boolean; skipped: boolean; partial: boolean; marks: number };

export const FORMAT_LABEL: Record<AnswerFormat, string> = { SINGLE: "Single correct", MULTIPLE: "Multi-correct", NUMERICAL: "Numerical" };
export const DIFFICULTY_LABEL = ["", "Easy", "Medium", "Hard"];

// Marks follow the JEE papers: single/numerical +4/−1, multi-correct +4 / partial +1 each / −2.
export function grade(q: AnswerKey, a: Answer, m: Marking): Graded {
  if (q.format === "NUMERICAL") {
    const v = a.numericValue;
    if (v === null || v === undefined || !Number.isFinite(v) || q.numericAnswer === null) return { isCorrect: false, skipped: true, partial: false, marks: 0 };
    const ok = Math.abs(v - q.numericAnswer) <= q.tolerance + 1e-9;
    return { isCorrect: ok, skipped: false, partial: false, marks: ok ? m.correct : m.wrong };
  }
  if (q.format === "MULTIPLE") {
    const picks = [...new Set(a.selectedMany ?? [])];
    if (!picks.length) return { isCorrect: false, skipped: true, partial: false, marks: 0 };
    const key = new Set(q.correctIndices);
    if (picks.some((p) => !key.has(p))) return { isCorrect: false, skipped: false, partial: false, marks: m.multiWrong };
    if (picks.length === key.size) return { isCorrect: true, skipped: false, partial: false, marks: m.correct };
    return { isCorrect: false, skipped: false, partial: true, marks: m.multiPartial * picks.length };
  }
  if (a.selected === null || a.selected === undefined) return { isCorrect: false, skipped: true, partial: false, marks: 0 };
  const ok = a.selected === q.correctIndex;
  return { isCorrect: ok, skipped: false, partial: false, marks: ok ? m.correct : m.wrong };
}

// Keep only answers that make sense for the question, so stored attempts are clean.
export function sanitizeAnswer(q: { format: AnswerFormat; options: string[] }, a: Answer): Answer {
  const inRange = (i: unknown): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < q.options.length;
  if (q.format === "NUMERICAL") {
    const v = typeof a.numericValue === "number" && Number.isFinite(a.numericValue) ? a.numericValue : null;
    return { numericValue: v };
  }
  if (q.format === "MULTIPLE") return { selectedMany: [...new Set((a.selectedMany ?? []).filter(inRange))].sort((a, b) => a - b) };
  return { selected: inRange(a.selected) ? a.selected : null };
}

export const accuracyOf = (t: { attempted: number; correct: number }) => (t.attempted ? Math.round((t.correct / t.attempted) * 100) : 0);

export type Strength = "strong" | "weak" | "building" | "new";
export function strengthOf(t: { attempted: number; correct: number }): Strength {
  if (!t.attempted) return "new";
  if (t.attempted < 5) return "building";
  const acc = accuracyOf(t);
  return acc >= 75 ? "strong" : acc < 50 ? "weak" : "building";
}

export const fmtTime = (ms: number) => {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
};
