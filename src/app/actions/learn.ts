"use server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasChapterAccess } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import { awardXp, grantBadge, type Reward } from "@/lib/gamification";

type PartOutcome = {
  reward: Reward | null;
  partCompleted: boolean;
  chapterCompleted: boolean;
  nextPartOrder: number | null;
};

async function requirePartAccess(partId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Please log in");
  const part = await db.part.findUniqueOrThrow({ where: { id: partId }, include: { chapter: true } });
  const allowed = (await hasChapterAccess(user.id, part.chapterId)) || part.isFreePreview;
  if (!allowed) throw new Error("You don't have access to this part");
  return { user, part };
}

function mergeRewards(a: Reward | null, b: Reward | null): Reward | null {
  if (!a) return b;
  if (!b) return a;
  return { xp: a.xp + b.xp, badges: [...a.badges, ...b.badges], streak: a.streak ?? b.streak };
}

// After a video or practice set finishes, check whether the part / chapter is now complete.
async function checkCompletion(userId: string, partId: string, chapterId: string): Promise<Omit<PartOutcome, "reward"> & { reward: Reward | null }> {
  const settings = await getSettings();
  const pp = await db.partProgress.findUnique({ where: { userId_partId: { userId, partId } } });
  if (!pp?.videoDone || !pp.practiceDone || pp.completedAt) {
    return { reward: null, partCompleted: false, chapterCompleted: false, nextPartOrder: null };
  }
  await db.partProgress.update({ where: { id: pp.id }, data: { completedAt: new Date() } });

  let reward: Reward | null = null;
  const first = await grantBadge(userId, "FIRST_PART");
  if (first) reward = { xp: 0, badges: [first] };

  const parts = await db.part.findMany({ where: { chapterId }, orderBy: { order: "asc" } });
  const done = await db.partProgress.count({ where: { userId, partId: { in: parts.map((p) => p.id) }, completedAt: { not: null } } });
  const current = parts.find((p) => p.id === partId)!;
  const next = parts.find((p) => p.order > current.order);

  let chapterCompleted = false;
  if (done === parts.length) {
    chapterCompleted = true;
    const chapterReward = await awardXp(userId, settings.xp.perChapter, "chapter complete");
    const badge = await grantBadge(userId, "CHAPTER_DONE", chapterId);
    if (badge) chapterReward.badges.push(badge);
    reward = mergeRewards(reward, chapterReward);
  }
  return { reward, partCompleted: true, chapterCompleted, nextPartOrder: next?.order ?? null };
}

export async function reportWatch(partId: string, watchedSec: number, durationSec: number): Promise<PartOutcome | null> {
  const { user, part } = await requirePartAccess(partId);
  const settings = await getSettings();
  const total = part.durationSec || durationSec;
  const existing = await db.partProgress.findUnique({ where: { userId_partId: { userId: user.id, partId } } });
  const best = Math.max(existing?.watchedSec ?? 0, Math.round(watchedSec));
  const reached = total > 0 && best >= total * part.watchThreshold;

  if (existing?.videoDone) {
    if (best > existing.watchedSec) await db.partProgress.update({ where: { id: existing.id }, data: { watchedSec: best } });
    return null;
  }

  const questionCount = await db.question.count({ where: { partId, isPublished: true } });
  const pp = await db.partProgress.upsert({
    where: { userId_partId: { userId: user.id, partId } },
    create: { userId: user.id, partId, watchedSec: best, videoDone: reached, practiceDone: questionCount === 0 },
    update: { watchedSec: best, videoDone: reached, ...(questionCount === 0 ? { practiceDone: true } : {}) },
  });
  if (!reached) return null;

  // Keep the part duration accurate for providers that only report it client-side.
  if (!part.durationSec && durationSec) await db.part.update({ where: { id: partId }, data: { durationSec: Math.round(durationSec) } });

  const watchReward = await awardXp(user.id, part.xpReward || settings.xp.perPartVideo, "video", settings.xp.dailyStreakBonus);
  const outcome = pp.practiceDone ? await checkCompletion(user.id, partId, part.chapterId) : null;
  return {
    reward: mergeRewards(watchReward, outcome?.reward ?? null),
    partCompleted: outcome?.partCompleted ?? false,
    chapterCompleted: outcome?.chapterCompleted ?? false,
    nextPartOrder: outcome?.nextPartOrder ?? null,
  };
}

export async function answerQuestion(questionId: string, selected: number | null, timeMs: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Please log in");
  const q = await db.question.findUniqueOrThrow({ where: { id: questionId }, include: { part: true } });
  const allowed = (await hasChapterAccess(user.id, q.chapterId)) || !!q.part?.isFreePreview;
  if (!allowed) throw new Error("No access");

  const isCorrect = selected === q.correctIndex;
  const firstTry = (await db.attempt.count({ where: { userId: user.id, questionId } })) === 0;
  await db.attempt.create({ data: { userId: user.id, questionId, selected, isCorrect, timeMs: Math.min(timeMs, 3_600_000) } });

  // XP only for the first correct attempt so the leaderboard can't be farmed.
  let xp = 0;
  if (isCorrect && firstTry) {
    const settings = await getSettings();
    xp = (await awardXp(user.id, q.xp || settings.xp.perCorrect, "correct answer", settings.xp.dailyStreakBonus)).xp;
  }
  return { isCorrect, correctIndex: q.correctIndex, solution: q.solution, xp };
}

export async function finishPractice(partId: string): Promise<(PartOutcome & { score: number; total: number }) | null> {
  const { user, part } = await requirePartAccess(partId);
  const settings = await getSettings();
  const questions = await db.question.findMany({ where: { partId, isPublished: true }, select: { id: true } });
  const ids = questions.map((q) => q.id);
  // Latest attempt per question decides the score for this run.
  const attempts = await db.attempt.findMany({ where: { userId: user.id, questionId: { in: ids } }, orderBy: { createdAt: "desc" } });
  const latest = new Map<string, boolean>();
  for (const a of attempts) if (!latest.has(a.questionId)) latest.set(a.questionId, a.isCorrect);
  if (latest.size < ids.length) return null; // not every question answered yet

  const score = [...latest.values()].filter(Boolean).length;
  const existing = await db.partProgress.findUnique({ where: { userId_partId: { userId: user.id, partId } } });
  let reward: Reward | null = null;

  if (!existing?.practiceDone) {
    await db.partProgress.upsert({
      where: { userId_partId: { userId: user.id, partId } },
      create: { userId: user.id, partId, practiceDone: true },
      update: { practiceDone: true },
    });
    reward = await awardXp(user.id, settings.xp.perPracticeSet, "practice set");
  }
  const pct = ids.length ? score / ids.length : 0;
  const badges = [];
  if (pct >= 0.8) badges.push(await grantBadge(user.id, "PRACTICE_PRO"));
  if (pct === 1) badges.push(await grantBadge(user.id, "PERFECT_SET"));
  const newBadges = badges.filter((b) => b !== null);
  if (newBadges.length) reward = mergeRewards(reward, { xp: 0, badges: newBadges });

  const outcome = await checkCompletion(user.id, partId, part.chapterId);
  return {
    score,
    total: ids.length,
    reward: mergeRewards(reward, outcome.reward),
    partCompleted: outcome.partCompleted,
    chapterCompleted: outcome.chapterCompleted,
    nextPartOrder: outcome.nextPartOrder,
  };
}

export async function toggleBookmark(questionId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Please log in");
  const key = { userId_questionId: { userId: user.id, questionId } };
  if (await db.bookmark.findUnique({ where: key })) {
    await db.bookmark.delete({ where: key });
    return false;
  }
  await db.bookmark.create({ data: { userId: user.id, questionId } });
  return true;
}

export async function markIntroSeen(chapterId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.entitlement.updateMany({ where: { userId: user.id, chapterId }, data: { introSeen: true } });
}
