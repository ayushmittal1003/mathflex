import { cache } from "react";
import { db } from "./db";
import { getAccessibleChapterIds } from "./access";

export type ChapterCardData = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  classLevel: number;
  price: number;
  mrp: number;
  coverFrom: string;
  coverTo: string;
  coverImage: string | null;
  symbol: string;
  jeeWeightage: number;
  difficulty: number;
  partsCount: number;
  durationSec: number;
  questionsCount: number;
  isTrending: boolean;
  isFeatured: boolean;
  isLowPriority: boolean;
  owned: boolean;
  progress: number; // 0..1 of parts completed
};

// All published chapters with per-user ownership + progress, for the home rows.
export const getCatalog = cache(async (userId?: string): Promise<ChapterCardData[]> => {
  const [chapters, owned, progress] = await Promise.all([
    db.chapter.findMany({
      where: { isPublished: true },
      orderBy: [{ classLevel: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      include: { parts: { select: { id: true, durationSec: true } }, _count: { select: { questions: true } } },
    }),
    getAccessibleChapterIds(userId),
    userId
      ? db.partProgress.findMany({ where: { userId, videoDone: true, practiceDone: true }, select: { partId: true } })
      : Promise.resolve([]),
  ]);
  const donePartIds = new Set(progress.map((p) => p.partId));
  return chapters.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    tagline: c.tagline,
    classLevel: c.classLevel,
    price: c.price,
    mrp: c.mrp,
    coverFrom: c.coverFrom,
    coverTo: c.coverTo,
    coverImage: c.coverImage,
    symbol: c.symbol,
    jeeWeightage: c.jeeWeightage,
    difficulty: c.difficulty,
    partsCount: c.parts.length,
    durationSec: c.parts.reduce((s, p) => s + p.durationSec, 0),
    questionsCount: c._count.questions,
    isTrending: c.isTrending,
    isFeatured: c.isFeatured,
    isLowPriority: c.isLowPriority,
    owned: owned.has(c.id),
    progress: c.parts.length ? c.parts.filter((p) => donePartIds.has(p.id)).length / c.parts.length : 0,
  }));
});
