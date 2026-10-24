"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import { cart, useCart } from "../cart-store";
import { getQuote } from "@/app/actions/checkout";
import type { Quote } from "@/lib/pricing";
import { inr, validity } from "@/lib/format";
import { CloseX, useSwipeDown } from "./BottomSheet";
import type { CartMeta } from "./cart-meta";
import { button, cx, tone } from "./ui";
import { useFocusTrap } from "./useFocusTrap";

// Cart drawer (right panel from the tablet breakpoint, bottom sheet on phones). Opens when
// something is added or the nav cart icon is tapped. Prices come from the existing getQuote
// server action; the cart itself still only holds ids (cart-store.ts).
const Ctx = createContext<{ open: () => void } | null>(null);
export const useCartDrawer = () => useContext(Ctx);

export function CartDrawerProvider({ meta, children }: { meta: CartMeta; children: React.ReactNode }) {
  const pathname = usePathname();
  // Open for the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = useCallback(() => setOpenOn(pathname), [pathname]);
  const isOpen = openOn === pathname;
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {isOpen && <CartDrawer meta={meta} onClose={() => setOpenOn(null)} />}
    </Ctx.Provider>
  );
}

function CartDrawer({ meta, onClose }: { meta: CartMeta; onClose: () => void }) {
  const items = useCart();
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel);
  const { dy, handleProps } = useSwipeDown(onClose);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, startLoad] = useTransition();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  useEffect(() => {
    if (!items.length) return;
    startLoad(async () => {
      try { setQuote(await getQuote(items, null, false)); setFailed(false); } catch { setFailed(true); }
    });
  }, [items, tries]);

  const empty = items.length === 0;
  const lines = empty ? [] : quote?.lines ?? [];
  const access = (l: Quote["lines"][number]) => {
    const days = l.type === "CHAPTER" ? meta.chapters[l.id ?? ""]?.validityDays : meta.courses.find((c) => c.id === l.id)?.validityDays;
    return days ? `${validity(days)} access` : "";
  };

  return (
    <div ref={panel} tabIndex={-1} className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Your cart">
      <button type="button" tabIndex={-1} aria-label="Close cart" onClick={onClose} className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] animate-mf-rise flex-col rounded-t-2xl bg-card text-foreground shadow-[0_-30px_60px_-20px_rgb(0_0_0/0.4)] tablet:inset-y-0 tablet:left-auto tablet:right-0 tablet:max-h-none tablet:w-[440px] tablet:rounded-none tablet:shadow-[-30px_0_60px_-20px_rgb(0_0_0/0.35)]"
        style={dy ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined}
      >
        <div {...handleProps} className="touch-none px-4 pt-2.5 tablet:pt-4">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-border tablet:hidden" aria-hidden />
          <div className="flex items-center justify-between gap-3 pb-1 pt-1.5">
            <div className="text-lg font-extrabold tracking-[-0.02em]">Your cart{!empty && <span className="ml-2 text-sm font-semibold text-muted-foreground">{items.length} item{items.length === 1 ? "" : "s"}</span>}</div>
            <CloseX onClick={onClose} label="Close cart" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {empty ? (
            <div className="py-10 text-center">
              <div className="text-lg font-extrabold">Your cart is empty</div>
              <p className="mt-1.5 text-sm text-muted-foreground">Pick a chapter or a full course to get started.</p>
              <Link href="/chapters" onClick={onClose} className={cx(button.md, tone.primaryFlat, "mt-5 w-full")}>Browse chapters</Link>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border">
                {lines.map((l) => {
                  const ch = l.type === "CHAPTER" && l.id ? meta.chapters[l.id] : null;
                  return (
                    <li key={`${l.type}-${l.id}`} className="flex items-center gap-3 py-3.5">
                      <span
                        className={cx("grid aspect-[16/10] w-16 shrink-0 place-items-center overflow-hidden rounded-lg font-black tracking-[-0.04em] text-white", ch && ch.symbol.length > 2 ? "text-xs" : "text-xl")}
                        style={{ background: ch ? `linear-gradient(155deg, ${ch.coverFrom}, ${ch.coverTo})` : "linear-gradient(135deg, var(--primary), var(--brand-2))" }}
                        aria-hidden
                      >
                        {ch ? ch.symbol : "Σ"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-bold leading-[1.3] tracking-[-0.01em]">{l.title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{l.type === "COURSE" ? "Course" : ch ? `Class ${ch.classLevel}` : "Chapter"}{access(l) && ` · ${access(l)}`}</div>
                        <button type="button" onClick={() => cart.remove(l.id!)} aria-label={`Remove ${l.title} from cart`} className="-mb-2 mt-0.5 inline-flex min-h-11 items-center text-xs font-bold text-muted-foreground underline underline-offset-[3px]">Remove</button>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-base font-extrabold tracking-[-0.02em]">{inr(l.price)}</div>
                        {l.mrp > l.price && <div className="text-xs text-muted-foreground line-through">{inr(l.mrp)}</div>}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {loading && !quote && <p className="py-6 text-center text-sm text-muted-foreground">Loading prices…</p>}
              {!!quote?.skipped.length && <p className="my-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">Not charged because you already own them: {quote.skipped.join(", ")}</p>}
              {failed && (
                <div role="alert" className="my-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-bad/8 p-3 text-sm">
                  <span className="font-semibold">We couldn&apos;t load the latest prices.</span>
                  <button type="button" onClick={() => setTries((n) => n + 1)} className="rounded-lg bg-foreground px-3.5 py-2 text-sm font-bold text-white">Try again</button>
                </div>
              )}
            </>
          )}
        </div>

        {!empty && (
          <div className="border-t border-border bg-card px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-secondary-foreground">Subtotal</span>
              <span className="text-[22px] font-extrabold tracking-[-0.03em]">{quote ? inr(quote.subtotal) : "…"}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Coupons and any taxes are applied at checkout.</p>
            <div className="mt-3 grid gap-2">
              <Link href="/checkout" onClick={onClose} className={cx(button.md, tone.primary, "w-full")}>Checkout</Link>
              <button type="button" onClick={onClose} className={cx(button.md, tone.secondary, "w-full")}>Keep browsing</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
