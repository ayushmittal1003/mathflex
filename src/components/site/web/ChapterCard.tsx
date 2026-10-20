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

// design.md §4 Chapter card (listing): 16:9 poster, "Free preview" chip, round add-to-cart
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
      <Link href={c.owned ? `/learn/${c.slug}` : `/chapter/${c.slug}`} className="flex flex-1 flex-row text-foreground sm:flex-col">
        <span className="relative block w-24 shrink-0 self-stretch overflow-hidden text-white sm:aspect-video sm:w-auto sm:self-auto" style={{ background: `linear-gradient(155deg, ${c.coverFrom}, ${c.coverTo})` }}>
          <span className={cx("absolute -right-1.5 top-1/2 -translate-y-1/2 whitespace-nowrap font-black leading-none tracking-[-0.05em] text-white/22", c.symbol.length > 2 ? "text-[44px] sm:text-[64px]" : "text-[72px] sm:text-[110px]")}>
            {c.symbol}
          </span>
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgb(255_255_255/0.22),transparent_50%)]" />
          {c.owned ? (
            <span className="absolute bottom-2 left-2 rounded-md bg-white px-1.5 py-0.5 text-xs font-extrabold text-black sm:bottom-2.5 sm:left-2.5 sm:px-2 sm:py-1">Owned</span>
          ) : (
            c.free && (
              <span className="absolute bottom-2.5 left-2.5 hidden items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-extrabold text-black sm:inline-flex">
                <PlayIcon className="size-2.5" /> Free preview
              </span>
            )
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col py-3 pl-3 pr-14 sm:px-4 sm:pb-4 sm:pr-4 sm:pt-3.5">
          <span className="text-xs font-semibold text-muted-foreground">Class {c.classLevel}</span>
          <span className="mt-1 line-clamp-2 text-base font-bold leading-[1.3] tracking-[-0.015em] sm:mt-1.5 sm:min-h-11 sm:text-[17px]">{c.title}</span>
          <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground sm:mt-2.5 sm:gap-y-1.5">
            <span>{c.partsCount} parts</span>
            {!c.owned && c.free && <span className="font-bold text-ok-strong sm:hidden">Free preview</span>}
            {c.jeeWeightage > 0 && <span>{c.jeeWeightage}% of JEE Main</span>}
            {c.isTrending && <span className="font-bold text-primary">Popular</span>}
          </span>
          {c.owned ? (
            <span className="mt-auto pt-2.5 sm:pt-3.5">
              <span className="block h-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(3, c.progress * 100)}%` }} /></span>
              <span className="mt-2 block text-sm font-bold text-primary">{c.progress > 0 ? "Continue →" : "Start watching →"}</span>
            </span>
          ) : (
            <span className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2.5 sm:pt-3.5">
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
            "tap absolute bottom-2 right-2 grid size-11 place-items-center rounded-full border border-border shadow-[0_4px_12px_rgb(0_0_0/0.2)] transition hover:scale-[1.08]",
            inCart ? "bg-ok text-white" : "bg-card text-foreground",
            "sm:bottom-auto sm:right-2.5 sm:top-2.5 sm:size-[34px] sm:border-0",
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
