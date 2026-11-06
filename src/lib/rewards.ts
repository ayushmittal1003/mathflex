import "server-only";
import { db } from "./db";
import type { Settings } from "./settings";

export type Tier = Settings["rewards"]["tiers"][number];
export type Progress = { parts: number; correct: number; streak: number };

// What counts toward a milestone: parts watched to the end, different questions ever answered
// correctly (each question counts once, however many tries), and the best daily streak so far.
export async function rewardProgress(userId: string): Promise<Progress> {
  const [parts, correct, user] = await Promise.all([
    db.partProgress.count({ where: { userId, videoDone: true } }),
    db.attempt.findMany({ where: { userId, isCorrect: true }, distinct: ["questionId"], select: { questionId: true } }),
    db.user.findUnique({ where: { id: userId }, select: { bestStreak: true } }),
  ]);
  return { parts, correct: correct.length, streak: user?.bestStreak ?? 0 };
}

export const reached = (t: Tier, p: Progress) => p.parts >= t.parts && p.correct >= t.correct && p.streak >= t.streak;
