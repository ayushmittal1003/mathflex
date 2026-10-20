import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getPosts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/seo/config";

// Rendered on each request so it always matches what is published (a build-time copy would go
// stale, or fail if the database is unreachable during the build). Only indexable, published,
// canonical URLs belong here: no private pages, no filtered listings, no sample content.
// `lastModified` is only given where a real updatedAt exists (Chapter); Course has none yet.
export const dynamic = "force-dynamic";

const STATIC_PATHS = ["/", "/chapters", "/courses", "/pricing", "/about", "/contact", "/faq", "/book-a-call", "/privacy", "/terms", "/refund-policy"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [chapters, courses, posts] = await Promise.all([
    db.chapter.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true }, orderBy: { sortOrder: "asc" } }),
    db.course.findMany({ where: { isPublished: true }, select: { slug: true }, orderBy: { sortOrder: "asc" } }),
    getPosts(),
  ]);

  return [
    ...STATIC_PATHS.map((path) => ({ url: absoluteUrl(path) })),
    ...chapters.map((c) => ({ url: absoluteUrl(`/chapter/${c.slug}`), lastModified: c.updatedAt })),
    ...courses.map((c) => ({ url: absoluteUrl(`/courses/${c.slug}`) })),
    // Sample posts (placeholder: true) are noindexed, so they are left out. /blog and
    // /free-practice join once real content exists.
    ...posts.filter((p) => !p.placeholder).map((p) => ({ url: absoluteUrl(`/blog/${p.slug}`), lastModified: p.publishedAt })),
    ...(posts.some((p) => !p.placeholder) ? [{ url: absoluteUrl("/blog") }] : []),
  ];
}
