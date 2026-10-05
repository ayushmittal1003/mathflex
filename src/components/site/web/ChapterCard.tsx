"use client";
import Link from "next/link";
import { inr, pctOff } from "@/lib/format";
import { CheckIcon, PlayIcon } from "./primitives";
import { useAddToCart } from "./useAddToCart";
import { cx } from "./ui";

export type CardChapter = {
  id: string;
  slug: string;
  title: string;
  classLevel: number;
  price: number;
  mrp: number;
  coverFrom: string;
  coverTo: string;
  symbol: string;
  jeeWeightage: number;
  partsCount: number;
  isTrending: boolean;
  owned: boolean;
  progress: number;
  free: boolean;
};

// design.md §4 Chapter card (listing): 16:9 poster, "Part 1 free" chip, round add-to-cart
// that turns into a green check. Owned chapters show progress and link to the player.
export function ChapterCard({ c, index = 0 }: { c: CardChapter; index?: number }) {
  const { has, toggle } = useAddToCart();
  const inCart = has(c.id);
  const off = pctOff(c.price, c.mrp);

  return (
    <div
      className="relative flex animate-mf-rise flex-col overflow-hidden rounded-xl border border-border bg-card transition duration-300 ease-mf hover:-translate-y-1 hover:shadow-[0_22px_40px_-22px_rgb(80_20_0/0.4)]"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      <Link href={c.owned ? `/learn/${c.slug}` : `/chapter/${c.slug}`} className="flex flex-1 flex-col text-foreground">
        <span className="relative block aspect-video overflow-hidden text-white" style={{ background: `linear-gradient(155deg, ${c.coverFrom}, ${c.coverTo})` }}>
          <span className={cx("absolute -right-1.5 top-1/2 -translate-y-1/2 whitespace-nowrap font-black leading-none tracking-[-0.05em] text-white/22", c.symbol.length > 2 ? "text-[64px]" : "text-[110px]")}>
            {c.symbol}
          </span>
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgb(255_255_255/0.22),transparent_50%)]" />
          {c.owned ? (
            <span className="absolute bottom-2.5 left-2.5 rounded-md bg-white px-2 py-1 text-[11px] font-extrabold text-black">Owned</span>
          ) : (
            c.free && (
              <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-extrabold text-black">
                <PlayIcon className="size-2.5" /> Part 1 free
              </span>
            )
          )}
        </span>
        <span className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
          <span className="text-xs font-semibold text-muted-foreground">Class {c.classLevel}</span>
          <span className="mt-1.5 line-clamp-2 min-h-11 text-[17px] font-bold leading-[1.3] tracking-[-0.015em]">{c.title}</span>
          <span className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span>{c.partsCount} parts</span>
            {c.jeeWeightage > 0 && <span>{c.jeeWeightage}% of JEE Main</span>}
            {c.isTrending && <span className="font-bold text-primary">Popular</span>}
          </span>
          {c.owned ? (
            <span className="mt-auto pt-3.5">
              <span className="block h-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(3, c.progress * 100)}%` }} /></span>
              <span className="mt-2 block text-sm font-bold text-primary">{c.progress > 0 ? "Continue →" : "Start watching →"}</span>
            </span>
          ) : (
            <span className="mt-auto flex items-baseline gap-2 pt-3.5">
              <span className="text-[19px] font-extrabold tracking-[-0.02em]">{inr(c.price)}</span>
              {c.mrp > c.price && <span className="text-[13px] text-muted-foreground line-through">{inr(c.mrp)}</span>}
              {off > 0 && <span className="text-xs font-bold text-ok">{off}% off</span>}
            </span>
          )}
        </span>
      </Link>
      {!c.owned && (
        <button
          type="button"
          onClick={() => toggle({ type: "CHAPTER", id: c.id }, c.title)}
          aria-label={inCart ? `Remove ${c.title} from cart` : `Add ${c.title} to cart`}
          aria-pressed={inCart}
          className={cx(
            "absolute right-2.5 top-2.5 grid size-[34px] place-items-center rounded-full shadow-[0_4px_12px_rgb(0_0_0/0.2)] transition hover:scale-[1.08]",
            inCart ? "bg-ok text-white" : "bg-card text-foreground",
          )}
        >
          {inCart ? (
            <CheckIcon className="size-3.5" strokeWidth={3.5} />
          ) : (
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
          )}
        </button>
      )}
    </div>
  );
}
