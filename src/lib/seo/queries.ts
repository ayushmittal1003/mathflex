import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

// Small, cached lookups for metadata and social images. cache() dedupes within one request,
// so generateMetadata and opengraph-image share a single query. Only published items are
// returned: an unpublished chapter or course gets no metadata (the page itself 404s for the public).

export const getChapterSeo = cache(async (slug: string) =>
  db.chapter.findFirst({
    where: { slug, isPublished: true },
    select: { title: true, tagline: true, description: true, classLevel: true, coverFrom: true, coverTo: true, symbol: true, updatedAt: true, _count: { select: { parts: true } } },
  }),
);

export const getCourseSeo = cache(async (slug: string) =>
  db.course.findFirst({
    where: { slug, isPublished: true },
    select: { title: true, subtitle: true, description: true, coverFrom: true, coverTo: true, _count: { select: { chapters: true } } },
  }),
);
