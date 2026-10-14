"use server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasChapterAccess } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import { awardXp } from "@/lib/gamification";
import { grade, sanitizeAnswer, type Answer } from "@/lib/grading";

export type PracticeResult = {
  isCorrect: boolean;
  partial: boolean;
  skipped: boolean;
  marks: number;
  xp: number;
  solution: string;
  key: { correctIndex: number; correctIndices: number[]; numericAnswer: number | null; tolerance: number };
};

export async function submitPracticeAnswer(questionId: string, answer: Answer, timeMs: number): Promise<PracticeResult> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Please log in");
  const settings = await getSettings();
  if (!settings.features.practice) throw new Error("Practice is turned off");
  const q = await db.question.findUniqueOrThrow({ where: { id: questionId }, include: { part: { select: { isFreePreview: true } } } });
  const allowed = q.isPublished && ((await hasChapterAccess(user.id, q.chapterId)) || (settings.features.freePreviews && !!q.part?.isFreePreview));
  if (!allowed) throw new Error("No access");

  const clean = sanitizeAnswer(q, answer);
  const g = grade(q, clean, settings.marking);
  // XP only for the first real attempt that's fully correct, so it can't be farmed by retrying.
  const priorReal = await db.attempt.count({
    where: { userId: user.id, questionId, OR: [{ selected: { not: null } }, { numericValue: { not: null } }, { NOT: { selectedMany: { isEmpty: true } } }] },
  });
  await db.attempt.create({
    data: {
      userId: user.id,
      questionId,
      selected: clean.selected ?? null,
      selectedMany: clean.selectedMany ?? [],
      numericValue: clean.numericValue ?? null,
      isCorrect: g.isCorrect,
      timeMs: Math.max(0, Math.min(Math.round(timeMs) || 0, 3_600_000)),
    },
  });

  let xp = 0;
  if (g.isCorrect && priorReal === 0) {
    xp = (await awardXp(user.id, q.xp || settings.xp.perCorrect, "correct answer", settings.xp.dailyStreakBonus)).xp;
  }
  return {
    ...g,
    xp,
    solution: q.solution,
    key: { correctIndex: q.correctIndex, correctIndices: q.correctIndices, numericAnswer: q.numericAnswer, tolerance: q.tolerance },
  };
}

export type ExamAnswer = { questionId: string; answer: Answer | null; timeMs: number };
export type ExamQuestionResult = Omit<PracticeResult, "xp"> & { id: string; answer: Answer | null };
export type ExamResult = { results: ExamQuestionResult[]; marks: number; maxMarks: number; xp: number };

// Exam mode: grade a whole test at the end. Answered questions are recorded exactly like instant
// practice (analytics, first-attempt XP); unanswered ones are reported as skipped and not recorded.
export async function submitExam(chapterId: string, answers: ExamAnswer[]): Promise<ExamResult> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Please log in");
  const settings = await getSettings();
  if (!settings.features.practice) throw new Error("Practice is turned off");
  if (!(await hasChapterAccess(user.id, chapterId))) throw new Error("No access");
  const list = answers.slice(0, 300);
  const qs = await db.question.findMany({ where: { id: { in: list.map((a) => a.questionId) }, chapterId, isPublished: true } });
  const byId = new Map(qs.map((q) => [q.id, q]));

  const results: ExamQuestionResult[] = [];
  let marks = 0;
  let xp = 0;
  for (const a of list) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    const clean = a.answer ? sanitizeAnswer(q, a.answer) : {};
    const g = grade(q, clean, settings.marking);
    const key = { correctIndex: q.correctIndex, correctIndices: q.correctIndices, numericAnswer: q.numericAnswer, tolerance: q.tolerance };
    if (!g.skipped) {
      const priorReal = await db.attempt.count({
        where: { userId: user.id, questionId: q.id, OR: [{ selected: { not: null } }, { numericValue: { not: null } }, { NOT: { selectedMany: { isEmpty: true } } }] },
      });
      await db.attempt.create({
        data: {
          userId: user.id,
          questionId: q.id,
          selected: clean.selected ?? null,
          selectedMany: clean.selectedMany ?? [],
          numericValue: clean.numericValue ?? null,
          isCorrect: g.isCorrect,
          timeMs: Math.max(0, Math.min(Math.round(a.timeMs) || 0, 3_600_000)),
        },
      });
      if (g.isCorrect && priorReal === 0) xp += q.xp || settings.xp.perCorrect;
    }
    marks += g.marks;
    results.push({ ...g, id: q.id, answer: g.skipped ? null : clean, solution: q.solution, key });
  }
  if (xp) xp = (await awardXp(user.id, xp, "exam practice", settings.xp.dailyStreakBonus)).xp;
  return { results, marks, maxMarks: results.length * settings.marking.correct, xp };
}
