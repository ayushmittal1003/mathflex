import { conicSlugs } from "@/lib/site-content";
import type { CartItem } from "../cart-store";
import type { CartMeta, CartMetaChapter } from "./cart-meta";

// Chapter ids already in the cart or covered by a course in it.
export function coveredIds(meta: CartMeta, items: CartItem[]) {
  const ids = new Set(items.map((i) => i.id));
  for (const c of meta.courses) if (ids.has(c.id)) c.chapterIds.forEach((id) => ids.add(id));
  return ids;
}

// "Students also take": for each chapter in the cart (latest added first) the conic sections
// recommend each other; any other chapter recommends its neighbours in syllabus order (same class,
// the next chapter before the previous one). Chapters already in the cart or covered are skipped.
export function recommendChapters(meta: CartMeta, items: CartItem[], max: number): CartMetaChapter[] {
  const taken = coveredIds(meta, items);
  const all = Object.values(meta.chapters).sort((a, b) => a.order - b.order);
  const out: CartMetaChapter[] = [];
  const push = (c: CartMetaChapter | undefined) => {
    if (c && !taken.has(c.id) && !out.some((o) => o.id === c.id)) out.push(c);
  };
  const cartChapters = items.filter((i) => i.type === "CHAPTER").map((i) => meta.chapters[i.id]).filter(Boolean).reverse();
  for (const ch of cartChapters) {
    if ((conicSlugs as readonly string[]).includes(ch.slug)) {
      conicSlugs.filter((s) => s !== ch.slug).forEach((s) => push(all.find((c) => c.slug === s)));
    }
    const same = all.filter((c) => c.classLevel === ch.classLevel);
    const at = same.findIndex((c) => c.id === ch.id);
    same
      .map((c, i) => ({ c, d: Math.abs(i - at) + (i < at ? 0.5 : 0) }))
      .filter(({ c }) => c.id !== ch.id)
      .sort((x, y) => x.d - y.d)
      .slice(0, 3)
      .forEach(({ c }) => push(c));
  }
  return out.slice(0, max);
}
