"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PosterImage } from "@/components/site/web/PosterImage";
import { cart, type CartItem } from "@/components/site/cart-store";
import { inr, pctOff } from "@/lib/format";
import { metaTrack } from "@/lib/meta-pixel";
import { track } from "@/lib/track";
import { PlayIcon } from "../primitives";
import { cx } from "../ui";

export type StartChapter = {
  id: string; slug: string; title: string; classLevel: number; price: number; mrp: number; jeeWeightage: number;
  parts: number; pyqs: number; cover: string | null; coverFrom: string; coverTo: string; symbol: string; previewHref: string | null;
};
export type StartCourse = { id: string; title: string; price: number; mrp: number; chapters: number; highlights: string[] };

// One tap from the ad page to checkout: the item goes in the cart and the offer code rides along.
// The code is only sent when this item meets the coupon's minimum, so it never fails at checkout.
export type StartCoupon = { code: string; minAmount: number } | null;
export function useBuy(coupon: StartCoupon) {
  const router = useRouter();
  return (item: CartItem, label: string, price: number) => {
    cart.add(item);
    track("ad_buy", label);
    metaTrack("InitiateCheckout", { currency: "INR", value: price, content_ids: [item.id], content_type: "product", num_items: 1 });
    const code = coupon && price >= coupon.minAmount ? coupon.code : null;
    router.push(`/checkout${code ? `?coupon=${encodeURIComponent(code)}` : ""}`);
  };
}

// Chapters, highest JEE weightage first, with a class switch. Each card: free preview + Buy.
export function StartChapters({ chapters, coupon }: { chapters: StartChapter[]; coupon: StartCoupon }) {
  const classes = [...new Set(chapters.map((c) => c.classLevel))].sort();
  const [cls, setCls] = useState(classes[0] ?? 11);
  const [all, setAll] = useState(false);
  const buy = useBuy(coupon);
  const list = chapters.filter((c) => c.classLevel === cls);
  const shown = all ? list : list.slice(0, 6);

  return (
    <div>
      {classes.length > 1 && (
        <div className="flex rounded-xl bg-muted p-1" role="tablist" aria-label="Class">
          {classes.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={cls === c} onClick={() => { setCls(c); setAll(false); }} className={cx("h-11 flex-1 rounded-lg text-[15px] font-bold transition", cls === c ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
              Class {c}
            </button>
          ))}
        </div>
      )}
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {shown.map((c) => {
          const off = pctOff(c.price, c.mrp);
          return (
            <li key={c.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_10px_30px_-24px_rgb(80_20_0/0.6)]">
              <div className="flex gap-3 p-3">
                <Link href={`/chapter/${c.slug}`} className="relative grid aspect-video w-[132px] shrink-0 place-items-center overflow-hidden rounded-lg text-2xl font-black text-white" style={{ background: `linear-gradient(155deg, ${c.coverFrom}, ${c.coverTo})` }} aria-label={`${c.title} details`}>
                  {c.cover ? <PosterImage src={c.cover} sizes="132px" /> : c.symbol}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-extrabold leading-tight tracking-[-0.015em]">{c.title}</div>
                  <div className="mt-1 text-[12px] leading-snug text-muted-foreground">
                    {c.jeeWeightage > 0 && <span className="font-bold text-foreground">{c.jeeWeightage}% of JEE Main · </span>}
                    {c.parts} parts{c.pyqs > 0 && ` · ${c.pyqs} PYQs`}
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-[19px] font-extrabold tracking-[-0.02em]">{inr(c.price)}</span>
                    {c.mrp > c.price && <span className="text-xs text-muted-foreground line-through">{inr(c.mrp)}</span>}
                    {off > 0 && <span className="text-xs font-bold text-ok-strong">{off}% off</span>}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-border p-2.5">
                {c.previewHref ? (
                  <Link href={c.previewHref} onClick={() => track("ad_preview", c.title)} className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-border text-[14px] font-bold">
                    <PlayIcon className="size-3.5" /> Free preview
                  </Link>
                ) : (
                  <Link href={`/chapter/${c.slug}`} className="flex h-11 items-center justify-center rounded-lg border border-border text-[14px] font-bold">See parts</Link>
                )}
                <button type="button" onClick={() => buy({ type: "CHAPTER", id: c.id }, c.title, c.price)} className="h-11 rounded-lg bg-primary text-[14px] font-bold text-primary-foreground shadow-cta active:scale-[0.98]">
                  Buy {inr(c.price)}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {list.length > 6 && !all && (
        <button type="button" onClick={() => setAll(true)} className="mt-3 h-12 w-full rounded-xl border border-border bg-card text-[15px] font-bold">
          Show all {list.length} Class {cls} chapters
        </button>
      )}
    </div>
  );
}

export function StartCourseCard({ course, coupon }: { course: StartCourse; coupon: StartCoupon }) {
  const buy = useBuy(coupon);
  const off = pctOff(course.price, course.mrp);
  return (
    <div className="relative overflow-hidden rounded-2xl bg-foreground p-5 text-white">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/40 blur-3xl" />
      <div className="relative">
        <span className="rounded-md bg-primary px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]">Best value</span>
        <div className="mt-3 text-[20px] font-extrabold tracking-[-0.02em]">{course.title}</div>
        <div className="mt-1 text-[13px] text-white/70">All {course.chapters} chapters, every part, DPPs, PYQs and notes</div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-[30px] font-extrabold tracking-[-0.035em]">{inr(course.price)}</span>
          {course.mrp > course.price && <span className="text-sm text-white/50 line-through">{inr(course.mrp)}</span>}
          {off > 0 && <span className="text-sm font-bold text-[#7ee2a8]">save {off}%</span>}
        </div>
        <button type="button" onClick={() => buy({ type: "COURSE", id: course.id }, course.title, course.price)} className="mt-4 h-12 w-full rounded-lg bg-primary text-[15px] font-bold text-primary-foreground">
          Get the full syllabus
        </button>
      </div>
    </div>
  );
}

// Phones: a bottom bar that keeps the offer and the next step in reach while scrolling.
export function StartStickyBar({ minPrice, offer }: { minPrice: number | null; offer: string | null }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 420);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div className={cx("fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur transition-transform duration-300 sm:hidden", show ? "translate-y-0" : "translate-y-full")}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 leading-tight">
          {minPrice !== null && <div className="text-[15px] font-extrabold">Chapters from {inr(minPrice)}</div>}
          {offer && <div className="truncate text-[12px] font-semibold text-ok-strong">{offer}</div>}
        </div>
        <a href="#chapters" className="flex h-12 shrink-0 items-center rounded-lg bg-primary px-5 text-[15px] font-bold text-primary-foreground shadow-cta">Choose chapter</a>
      </div>
    </div>
  );
}
