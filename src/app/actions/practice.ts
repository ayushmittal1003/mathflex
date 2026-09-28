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
