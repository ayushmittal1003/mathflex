import { duration } from "@/lib/format";
import type { CourseView } from "./CourseParts";

// Prisma include for a course with the chapter data the course views need.
export const COURSE_INCLUDE = {
  chapters: {
    where: { chapter: { isPublished: true } },
    include: {
      chapter: {
        select: {
          id: true, slug: true, title: true, classLevel: true, price: true, symbol: true, coverFrom: true, coverTo: true, jeeWeightage: true, sortOrder: true,
          parts: { select: { durationSec: true } },
          _count: { select: { questions: true, resources: { where: { isPublished: true } } } },
        },
      },
    },
  },
} as const;

type CourseRow = {
  id: string; slug: string; title: string; subtitle: string; price: number; mrp: number; highlights: string[]; validityDays: number;
  chapters: { chapter: { id: string; slug: string; title: string; classLevel: number; price: number; symbol: string; coverFrom: string; coverTo: string; jeeWeightage: number; sortOrder: number; parts: { durationSec: number }[]; _count: { questions: number; resources: number } } }[];
};

// Hours are summed from part lengths; the "one by one" sum uses each chapter's own price.
export function toCourseView(c: CourseRow, owned: boolean): CourseView {
  const chs = c.chapters.map((x) => x.chapter).sort((a, b) => a.classLevel - b.classLevel || a.sortOrder - b.sortOrder);
  const sec = chs.reduce((s, ch) => s + ch.parts.reduce((t, p) => t + p.durationSec, 0), 0);
  const sum = chs.reduce((s, ch) => s + ch.price, 0);
  return {
    id: c.id, slug: c.slug, title: c.title, subtitle: c.subtitle, price: c.price, mrp: c.mrp, highlights: c.highlights, validityDays: c.validityDays,
    owned,
    hours: sec ? duration(sec) : null,
    chapterSum: sum,
    avgChapter: chs.length ? sum / chs.length : 0,
    hasPractice: chs.some((ch) => ch._count.questions > 0),
    hasNotes: chs.some((ch) => ch._count.resources > 0),
    chapters: chs.map((ch) => ({ id: ch.id, slug: ch.slug, title: ch.title, classLevel: ch.classLevel, price: ch.price, symbol: ch.symbol, coverFrom: ch.coverFrom, coverTo: ch.coverTo, parts: ch.parts.length, weight: ch.jeeWeightage })),
  };
}
