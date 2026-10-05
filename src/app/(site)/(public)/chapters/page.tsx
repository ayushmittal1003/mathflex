import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { ChaptersView } from "@/components/site/web/chapters/ChaptersView";

export const metadata = { title: "All chapters" };

// Chapters (dipankar-design/designs/Chapters.dc.html). Catalog, ownership and progress come
// from the existing getCatalog; free-preview flags and the hero peek's parts from the DB.
// There's no topic field yet, so chapters are grouped by class instead of topic tabs.
export default async function ChaptersPage({ searchParams }: { searchParams: Promise<{ q?: string; class?: string; sort?: string }> }) {
  const { q = "", class: cls, sort } = await searchParams;
  const user = await getCurrentUser();
  const [catalog, settings, freeParts, courses] = await Promise.all([
    getCatalog(user?.id),
    getSettings(),
    db.part.findMany({ where: { isFreePreview: true, chapter: { isPublished: true } }, select: { chapterId: true } }),
    db.course.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, title: true, subtitle: true, price: true, mrp: true, chapters: { select: { chapter: { select: { price: true, isPublished: true } } } } },
    }),
  ]);

  const freeIds = settings.features.freePreviews ? new Set(freeParts.map((p) => p.chapterId)) : new Set<string>();
  const chapters = catalog.map((c) => ({ ...c, free: freeIds.has(c.id) }));

  // Hero peek: a featured chapter (or the highest-weightage one), preferring one with a free part.
  const pool = [...chapters].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || Number(b.free) - Number(a.free) || b.jeeWeightage - a.jeeWeightage);
  const peekId = pool.find((c) => c.partsCount > 0)?.id;
  const peek = peekId
    ? await db.chapter.findUnique({
        where: { id: peekId },
        select: { id: true, slug: true, title: true, classLevel: true, price: true, mrp: true, coverFrom: true, coverTo: true, symbol: true, jeeWeightage: true, parts: { orderBy: { order: "asc" }, select: { id: true, order: true, title: true, durationSec: true, isFreePreview: true } } },
      })
    : null;

  // How many single chapters cost more than the course (rounded up), from real prices.
  const bundles = courses.map((c) => {
    const prices = c.chapters.filter((x) => x.chapter.isPublished).map((x) => x.chapter.price);
    const avg = prices.length ? prices.reduce((s, p) => s + p, 0) / prices.length : 0;
    return { id: c.id, slug: c.slug, title: c.title, subtitle: c.subtitle, price: c.price, mrp: c.mrp, chapterCount: prices.length, breakeven: avg ? Math.ceil(c.price / avg) : null };
  });

  return (
    <ChaptersView
      chapters={chapters}
      peek={peek ? { ...peek, parts: peek.parts.map((p) => ({ ...p, isFreePreview: p.isFreePreview && settings.features.freePreviews })) } : null}
      bundles={bundles}
      initial={{ q, cls: cls === "11" || cls === "12" ? Number(cls) : "all", sort: sort === "weight" || sort === "price" ? sort : "default" }}
    />
  );
}
