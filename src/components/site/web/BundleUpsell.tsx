"use client";
import { useEffect, useMemo, useState } from "react";
import { cart, useCart } from "../cart-store";
import { getQuote } from "@/app/actions/checkout";
import { inr, validity } from "@/lib/format";
import type { CartMeta } from "./cart-meta";
import { BUNDLE_MAX_RATIO, bundleCandidates } from "./cart-logic";
import { button, cx, tone } from "./ui";

type Priced = { courseId: string; covered: string[]; classLabel: string; chaptersTotal: number; coursePrice: number; n: number };

// "Get all N chapters for ₹B": both prices come from the server quote, never from the browser.
export function BundleUpsell({ meta, compact = false, className }: { meta: CartMeta; compact?: boolean; className?: string }) {
  const items = useCart();
  const candidates = useMemo(() => bundleCandidates(meta, items).slice(0, 3), [meta, items]);
  const key = candidates.map((c) => `${c.courseId}:${c.covered.join("+")}`).join("|");
  const [priced, setPriced] = useState<{ key: string; list: Priced[] } | null>(null);

  useEffect(() => {
    if (!key) return;
    let live = true;
    Promise.all(
      candidates.map(async (c) => {
        const [chapters, course] = await Promise.all([
          getQuote(c.covered.map((id) => ({ type: "CHAPTER" as const, id })), null, false),
          getQuote([{ type: "COURSE", id: c.courseId }], null, false),
        ]);
        const courseLine = course.lines.find((l) => l.id === c.courseId);
        if (!courseLine || !chapters.lines.length) return null;
        return { courseId: c.courseId, covered: chapters.lines.map((l) => l.id!), classLabel: c.classLabel, chaptersTotal: chapters.subtotal, coursePrice: courseLine.price, n: chapters.lines.length, eligibleByCount: c.eligibleByCount };
      }),
    )
      .then((rows) => {
        if (!live) return;
        const ok = rows
          .filter((r): r is NonNullable<typeof r> => !!r)
          // strictly cheaper at any count, or 8+ chapters and the course is within 125% of them
          .filter((r) => r.coursePrice < r.chaptersTotal || (r.eligibleByCount && r.coursePrice <= r.chaptersTotal * BUNDLE_MAX_RATIO))
          .sort((a, b) => a.coursePrice - a.chaptersTotal - (b.coursePrice - b.chaptersTotal));
        setPriced({ key, list: ok });
      })
      .catch(() => {});
    return () => { live = false; };
  }, [key, candidates]);

  if (!priced || priced.key !== key || !priced.list.length) return null;
  const o = priced.list[0];
  const course = meta.courses.find((c) => c.id === o.courseId)!;
  const total = course.chapterIds.length;
  const oldDays = Math.max(...o.covered.map((id) => meta.chapters[id]?.validityDays ?? 0));
  const longer = course.validityDays > oldDays ? `${validity(course.validityDays)} access instead of ${validity(oldDays)}` : `${validity(course.validityDays)} access`;
  const diff = o.coursePrice - o.chaptersTotal;
  const scope = o.classLabel === "Class 11 + 12" ? "" : `${o.classLabel} `;

  const headline = `You've picked ${o.n} ${scope}chapter${o.n === 1 ? "" : "s"} for ${inr(o.chaptersTotal)}.`;
  const offer = diff < 0
    ? `Get all ${total} ${scope}chapters for ${inr(o.coursePrice)} and save ${inr(-diff)}, with ${longer}.`
    : diff === 0
      ? `Get all ${total} ${scope}chapters for the same ${inr(o.coursePrice)}, with ${longer}.`
      : `Get all ${total} ${scope}chapters for ${inr(o.coursePrice)}. That is only ${inr(diff)} more, with ${longer}.`;

  const swap = () => {
    o.covered.forEach((id) => cart.remove(id));
    cart.add({ type: "COURSE", id: o.courseId });
  };

  return (
    <section aria-label="Bundle offer" className={cx("rounded-xl border-[1.5px] border-dashed border-primary/45 bg-[color-mix(in_oklab,var(--brand-2)_7%,var(--card))]", compact ? "p-3.5" : "p-4.5", className)}>
      <div className={cx("font-extrabold tracking-[-0.01em]", compact ? "text-sm" : "text-[15px]")}>{headline}</div>
      <p className={cx("mt-1 leading-[1.5] text-secondary-foreground", compact ? "text-[13px]" : "text-sm")}>{offer}</p>
      <button type="button" onClick={swap} className={cx(button.md, tone.dark, "mt-3 w-full tablet:w-auto")}>Switch to {course.title}</button>
    </section>
  );
}
