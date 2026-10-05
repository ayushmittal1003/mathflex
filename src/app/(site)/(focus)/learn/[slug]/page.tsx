import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { computePartStates, hasChapterAccess } from "@/lib/access";
import { playbackFor } from "@/lib/video";
import { LearnClient } from "@/components/learn/LearnClient";
import type { QuizQuestion } from "@/components/learn/Quiz";

export default async function LearnPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ part?: string }> }) {
  const [{ slug }, { part: partParam }] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  const settings = await getSettings();
  const chapter = await db.chapter.findUnique({
    where: { slug },
    include: { parts: { orderBy: { order: "asc" } }, resources: { where: { isPublished: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!chapter) notFound();

  const owned = await hasChapterAccess(user?.id, chapter.id);
  const part = chapter.parts.find((p) => p.order === Number(partParam ?? 1)) ?? chapter.parts[0];
  if (!part) redirect(`/chapter/${slug}`);
  const isPreview = part.isFreePreview && settings.features.freePreviews;
  if (!owned && !isPreview) redirect(`/chapter/${slug}`);
  if (!user && !isPreview) redirect(`/login?next=/learn/${slug}`);

  const progress = user ? await db.partProgress.findMany({ where: { userId: user.id, partId: { in: chapter.parts.map((p) => p.id) } } }) : [];
  const progMap = new Map(progress.map((p) => [p.partId, p]));
  const states = computePartStates(chapter.parts, progMap, {
    hasAccess: owned,
    sequential: settings.features.sequentialUnlock,
    freePreviewIds: new Set(settings.features.freePreviews ? chapter.parts.filter((p) => p.isFreePreview).map((p) => p.id) : []),
  });
  if (states.get(part.id) === "locked") redirect(`/chapter/${slug}`);

  const questions = await db.question.findMany({ where: { partId: part.id, isPublished: true, format: "SINGLE" }, orderBy: [{ type: "asc" }, { createdAt: "asc" }] });
  const [attempts, bookmarks] = user
    ? await Promise.all([
        db.attempt.findMany({ where: { userId: user.id, questionId: { in: questions.map((q) => q.id) } }, orderBy: { createdAt: "desc" } }),
        db.bookmark.findMany({ where: { userId: user.id, questionId: { in: questions.map((q) => q.id) } } }),
      ])
    : [[], []];
  const latest = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) if (!latest.has(a.questionId)) latest.set(a.questionId, a);
  const marked = new Set(bookmarks.map((b) => b.questionId));

  // Answers are only sent for questions already attempted, so they can't be read from the page.
  const quiz: QuizQuestion[] = questions.map((q) => {
    const a = latest.get(q.id);
    return {
      id: q.id, type: q.type, exam: q.exam, year: q.year, difficulty: q.difficulty, prompt: q.prompt, options: q.options,
      bookmarked: marked.has(q.id),
      prior: a ? { selected: a.selected, isCorrect: a.isCorrect, correctIndex: q.correctIndex, solution: q.solution } : null,
    };
  });

  // 30-sec intro from the mentor, shown once after purchase.
  let intro = null;
  if (owned && user && settings.features.introPopupVideo && chapter.introVideoRef) {
    const ent = await db.entitlement.findFirst({ where: { userId: user.id, chapterId: chapter.id } });
    const firstVisit = ent ? !ent.introSeen : progress.length === 0;
    if (firstVisit) intro = playbackFor(chapter.introVideoProvider, chapter.introVideoRef);
  }

  const related = await db.chapter.findMany({
    where: { classLevel: chapter.classLevel, isPublished: true, id: { not: chapter.id }, sortOrder: { gt: chapter.sortOrder } },
    orderBy: { sortOrder: "asc" },
    take: 1,
    select: { slug: true, title: true },
  });

  const pp = progMap.get(part.id);
  return (
    <LearnClient
      chapter={{ id: chapter.id, slug, title: chapter.title, coverFrom: chapter.coverFrom, coverTo: chapter.coverTo }}
      part={{ id: part.id, order: part.order, title: part.title, summary: part.summary, topics: part.topics }}
      playback={playbackFor(part.videoProvider, part.videoRef)}
      intro={intro}
      initialWatched={pp?.watchedSec ?? 0}
      videoDone={!!pp?.videoDone}
      practiceDone={!!pp?.practiceDone}
      parts={chapter.parts.map((p) => ({
        id: p.id, order: p.order, title: p.title, durationMin: Math.round(p.durationSec / 60), state: states.get(p.id)!,
        watchedPct: p.durationSec ? (progMap.get(p.id)?.watchedSec ?? 0) / p.durationSec : 0,
      }))}
      questions={quiz}
      resources={owned ? chapter.resources.map((r) => ({ id: r.id, title: r.title, type: r.type, url: r.fileUrl })) : []}
      isPreviewOnly={!owned || !user}
      sound={settings.features.celebrationSound}
      related={related}
      user={user ? { name: user.name, avatarColor: user.avatarColor, streak: user.streak, xp: user.xp } : null}
      leaderboard={settings.features.leaderboard}
    />
  );
}
