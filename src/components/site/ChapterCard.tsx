import Link from "next/link";
import { Play, Clock, Flame, Lock } from "lucide-react";
import type { ChapterCardData } from "@/lib/catalog";
import { duration, inr, pctOff } from "@/lib/format";
import { AddToCart } from "./AddToCart";

// A poster in the Netflix style: gradient art + giant maths glyph, grows on hover (desktop).
export function ChapterPoster({ c, size = "md" }: { c: ChapterCardData; size?: "md" | "lg" }) {
  const off = pctOff(c.price, c.mrp);
  return (
    <Link
      href={`/chapter/${c.slug}`}
      className={`group relative block shrink-0 snap-start ${size === "lg" ? "w-[220px] sm:w-[260px]" : "w-[160px] sm:w-[200px] lg:w-[220px]"}`}
    >
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:ring-2 group-hover:ring-white/40"
        style={{ background: `linear-gradient(155deg, ${c.coverFrom}, ${c.coverTo})` }}
      >
        {c.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.coverImage} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
        ) : (
          <>
            <div className="absolute -right-4 top-2 select-none font-display text-[9rem] font-extrabold leading-none text-white/20 transition duration-500 group-hover:scale-110 sm:text-[11rem]">
              {c.symbol}
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.25),transparent_45%)]" />
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">Class {c.classLevel}</span>
          {c.isTrending && (
            <span className="flex items-center gap-0.5 rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
              <Flame className="size-3" /> Hot
            </span>
          )}
        </div>
        <div className="absolute right-2.5 top-2.5 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
          {!c.owned && <AddToCart item={{ type: "CHAPTER", id: c.id }} />}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
          <h3 className="font-display text-base font-extrabold leading-tight sm:text-lg">{c.title}</h3>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] font-medium text-white/80">
            <span>{c.partsCount} parts</span>
            {c.durationSec > 0 && (
              <span className="flex items-center gap-0.5"><Clock className="size-3" />{duration(c.durationSec)}</span>
            )}
            {c.jeeWeightage > 0 && <span>{c.jeeWeightage}% JEE</span>}
          </div>
          {c.owned ? (
            <div className="mt-2.5">
              <div className="h-1 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(3, c.progress * 100)}%` }} />
              </div>
              <p className="mt-1.5 flex items-center gap-1 text-xs font-bold"><Play className="size-3 fill-current" /> {c.progress > 0 ? "Continue" : "Start watching"}</p>
            </div>
          ) : (
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-sm font-extrabold">{inr(c.price)}</span>
              {off > 0 && <span className="text-[11px] text-white/60 line-through">{inr(c.mrp)}</span>}
              {off > 0 && <span className="text-[11px] font-bold text-green-400">{off}% off</span>}
            </div>
          )}
        </div>
        {!c.owned && c.partsCount === 0 && (
          <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-bold text-white"><span className="flex items-center gap-1"><Lock className="size-4" /> Coming soon</span></div>
        )}
      </div>
    </Link>
  );
}

// "Top 10" style card with a huge rank numeral behind the poster.
export function RankedPoster({ c, rank }: { c: ChapterCardData; rank: number }) {
  return (
    <div className="relative flex shrink-0 snap-start items-end">
      <span
        className="-mr-6 select-none font-display text-[7.5rem] font-extrabold leading-[0.8] text-transparent sm:-mr-8 sm:text-[10rem]"
        style={{ WebkitTextStroke: "3px var(--muted)" }}
        aria-hidden
      >
        {rank}
      </span>
      <ChapterPoster c={c} />
    </div>
  );
}
