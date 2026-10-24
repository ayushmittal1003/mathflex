"use client";
import { useEffect, useMemo, useState } from "react";
import { cart, useCart } from "../cart-store";
import { getQuote } from "@/app/actions/checkout";
import { inr } from "@/lib/format";
import type { CartMeta } from "./cart-meta";
import { recommendChapters } from "./cart-logic";
import { cx } from "./ui";

// "Students also take": up to `max` related chapters not in the cart, each with a one-tap Add.
// Prices come from the server quote (getQuote), which also drops chapters the student already owns.
export function Recommendations({ meta, max = 3, className }: { meta: CartMeta; max?: number; className?: string }) {
  const items = useCart();
  const candidates = useMemo(() => recommendChapters(meta, items, max + 3), [meta, items, max]);
  const key = candidates.map((c) => c.id).join(",");
  const [prices, setPrices] = useState<{ key: string; byId: Record<string, number> } | null>(null);

  useEffect(() => {
    if (!key) return;
    let live = true;
    getQuote(key.split(",").map((id) => ({ type: "CHAPTER" as const, id })), null, false)
      .then((q) => { if (live) setPrices({ key, byId: Object.fromEntries(q.lines.map((l) => [l.id, l.price])) }); })
      .catch(() => {});
    return () => { live = false; };
  }, [key]);

  if (!prices || prices.key !== key) return null;
  const shown = candidates.filter((c) => c.id in prices.byId).slice(0, max);
  if (!shown.length) return null;

  return (
    <section className={className} aria-labelledby="also-take">
      <h3 id="also-take" className="text-[15px] font-extrabold tracking-[-0.01em]">Students also take</h3>
      <ul className="mt-2.5 grid gap-2">
        {shown.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-[10px] border border-border p-2.5">
            <span
              className={cx("grid size-11 shrink-0 place-items-center rounded-lg font-black text-white", c.symbol.length > 2 ? "text-xs" : "text-lg")}
              style={{ background: `linear-gradient(155deg, ${c.coverFrom}, ${c.coverTo})` }}
              aria-hidden
            >
              {c.symbol}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{c.title}</span>
              <span className="block text-xs text-muted-foreground">Class {c.classLevel} · {inr(prices.byId[c.id])}</span>
            </span>
            <button
              type="button"
              onClick={() => cart.add({ type: "CHAPTER", id: c.id })}
              aria-label={`Add ${c.title} to cart`}
              className="h-11 shrink-0 rounded-lg border border-foreground bg-card px-3.5 text-[13px] font-bold text-foreground hover:bg-muted"
            >
              Add
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
