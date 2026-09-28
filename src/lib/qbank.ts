import { db } from "./db";
import { grade, accuracyOf, type Marking, type AnswerKey } from "./grading";
import type { AnswerFormat, QuestionType } from "@/generated/prisma/enums";

// Question bank analytics: the numbers behind the practice dashboard and admin reports.
// Grading itself lives in ./grading so the browser can use it too.

export type QuestionStatus = "new" | "correct" | "incorrect" | "partial" | "skipped";

type AttemptRow = { questionId: string; selected: number | null; selectedMany: number[]; numericValue: number | null; isCorrect: boolean; timeMs: number; createdAt: Date };
export type QuestionRow = AnswerKey & { id: string; chapterId: string; difficulty: number; type: QuestionType; topic: string | null };

type Tally = { total: number; attempted: number; correct: number; marks: number; maxMarks: number; timeMs: number };
const emptyTally = (): Tally => ({ total: 0, attempted: 0, correct: 0, marks: 0, maxMarks: 0, timeMs: 0 });

// Per-question outcome. Accuracy and marks use the FIRST real attempt (honest, can't be
// inflated by retrying); the status used for "retry mistakes" uses the LATEST attempt.
function summarise<Q extends QuestionRow>(questions: Q[], attempts: AttemptRow[], m: Marking) {
  const byQ = new Map<string, AttemptRow[]>();
  for (const a of attempts) byQ.set(a.questionId, [...(byQ.get(a.questionId) ?? []), a]);
  return questions.map((q) => {
    const list = (byQ.get(q.id) ?? []).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const graded = list.map((a) => ({ a, g: grade(q, a, m) }));
    const first = graded.find((x) => !x.g.skipped) ?? null;
    const last = graded.at(-1) ?? null;
    const status: QuestionStatus = !last ? "new" : last.g.skipped ? "skipped" : last.g.isCorrect ? "correct" : last.g.partial ? "partial" : "incorrect";
    return { q, first, latest: last, status, attempts: list.length };
  });
}

export async function questionStatuses<Q extends QuestionRow>(userId: string, questions: Q[], m: Marking) {
  const attempts = await db.attempt.findMany({
    where: { userId, questionId: { in: questions.map((q) => q.id) } },
    select: { questionId: true, selected: true, selectedMany: true, numericValue: true, isCorrect: true, timeMs: true, createdAt: true },
  });
  return summarise(questions, attempts, m);
}

const IST = 330 * 60_000;
const dayKey = (d: Date) => new Date(d.getTime() + IST).toISOString().slice(0, 10);

export const QUESTION_SELECT = {
  id: true, chapterId: true, difficulty: true, type: true, topic: true, format: true, correctIndex: true, correctIndices: true, numericAnswer: true, tolerance: true,
} as const;

// Everything the practice dashboard shows, for one student across the chapters they can open.
export async function practiceAnalytics(userId: string, chapterIds: Set<string>, m: Marking) {
  const attempts = await db.attempt.findMany({
    where: { userId },
    select: { questionId: true, selected: true, selectedMany: true, numericValue: true, isCorrect: true, timeMs: true, createdAt: true },
  });
  const attemptedIds = [...new Set(attempts.map((a) => a.questionId))];
  const questions = await db.question.findMany({
    where: { isPublished: true, OR: [{ chapterId: { in: [...chapterIds] } }, { id: { in: attemptedIds } }] },
    select: QUESTION_SELECT,
  });
  const rows = summarise(questions, attempts, m);

  const overall = emptyTally();
  const byChapter = new Map<string, Tally & { mistakes: number }>();
  const byDifficulty = new Map<number, Tally>([[1, emptyTally()], [2, emptyTally()], [3, emptyTally()]]);
  const byType = new Map<string, Tally>([["DPP", emptyTally()], ["PYQ", emptyTally()]]);
  const byFormat = new Map<string, Tally>([["SINGLE", emptyTally()], ["MULTIPLE", emptyTally()], ["NUMERICAL", emptyTally()]]);
  const byTopic = new Map<string, Tally & { chapterId: string; topic: string }>();

  for (const { q, first, status } of rows) {
    const inBank = chapterIds.has(q.chapterId);
    const chapter = byChapter.get(q.chapterId) ?? { ...emptyTally(), mistakes: 0 };
    byChapter.set(q.chapterId, chapter);
    const topicKey = q.topic ? `${q.chapterId}::${q.topic.toLowerCase()}` : null;
    const topic = topicKey ? byTopic.get(topicKey) ?? { ...emptyTally(), chapterId: q.chapterId, topic: q.topic! } : null;
    if (topicKey && topic) byTopic.set(topicKey, topic);
    const buckets = [overall, chapter, byDifficulty.get(q.difficulty), byType.get(q.type), byFormat.get(q.format), topic].filter((t): t is Tally => !!t);
    for (const t of buckets) {
      if (inBank) t.total++;
      if (!first) continue;
      t.attempted++;
      if (first.g.isCorrect) t.correct++;
      t.marks += first.g.marks;
      t.maxMarks += m.correct;
      t.timeMs += Math.min(first.a.timeMs, 600_000);
    }
    if (status === "incorrect" || status === "partial") chapter.mistakes++;
  }

  // Questions and correct answers per day (every real attempt counts here).
  const perDay = new Map<string, { attempted: number; correct: number }>();
  for (const a of attempts) {
    const skipped = a.selected === null && !a.selectedMany.length && a.numericValue === null;
    if (skipped) continue;
    const k = dayKey(a.createdAt);
    const d = perDay.get(k) ?? { attempted: 0, correct: 0 };
    d.attempted++;
    if (a.isCorrect) d.correct++;
    perDay.set(k, d);
  }
  const trend = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86_400_000);
    const v = perDay.get(dayKey(d)) ?? { attempted: 0, correct: 0 };
    return { label: d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }), ...v };
  });
  const today = perDay.get(dayKey(new Date()))?.attempted ?? 0;

  const topics = [...byTopic.values()].filter((t) => t.attempted >= 3);
  return {
    overall,
    today,
    trend,
    byChapter,
    byDifficulty: [...byDifficulty.entries()].map(([level, t]) => ({ level, ...t })),
    byType: [...byType.entries()].map(([type, t]) => ({ type, ...t })),
    byFormat: [...byFormat.entries()].map(([format, t]) => ({ format: format as AnswerFormat, ...t })),
    weakTopics: topics.filter((t) => accuracyOf(t) < 60).sort((a, b) => accuracyOf(a) - accuracyOf(b)).slice(0, 6),
    strongTopics: topics.filter((t) => accuracyOf(t) >= 80).sort((a, b) => accuracyOf(b) - accuracyOf(a)).slice(0, 6),
  };
}

