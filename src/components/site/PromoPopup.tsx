"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Copy, X } from "lucide-react";
import { useFocusTrap } from "./web/useFocusTrap";

type Promo = { id: string; title: string; subtitle: string; ctaText: string; ctaHref: string; colorFrom: string; colorTo: string; imageUrl: string | null };

// Shows each active POPUP banner once per visitor (remembered in localStorage). It never opens
// over the hero on a first visit: it waits for the visitor's first scroll, or opens on their
// second page view (design.md §6a). Escape, the backdrop and the close button dismiss it.
export function PromoPopup({ promo }: { promo: Promo | null }) {
  const [show, setShow] = useState(false);
  const pathname = usePathname();
  // Never over checkout, payment, sign-in or the player: it would cover the pay button and form fields.
  const quiet = /^\/(checkout|cart|payment|login|signup|learn|invite|enquiry)(\/|$)/.test(pathname);
  useEffect(() => {
    if (!promo || quiet) return;
    let seen = false;
    let views = 1;
    try {
      seen = localStorage.getItem(`mf-promo-${promo.id}`) === "1";
      // A page view is a change of path within the visit (the layout stays mounted on client
      // navigations), so re-running this effect on the same path does not count twice.
      views = Number(sessionStorage.getItem("mf-pageviews") ?? "0");
      if (sessionStorage.getItem("mf-pv-last") !== pathname) {
        views += 1;
        sessionStorage.setItem("mf-pageviews", String(views));
        sessionStorage.setItem("mf-pv-last", pathname);
      }
    } catch {}
    if (seen) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    // Never over the home page walkthrough (HomeTour): while it runs, or before a first-time visitor
    // has seen it, wait until it's finished or skipped.
    const tourPending = () => {
      if (document.documentElement.dataset.tour === "on") return true;
      try { return pathname === "/" && localStorage.getItem("mf-tour-done") !== "1"; } catch { return false; }
    };
    const open = () => {
      if (tourPending()) window.addEventListener("mf-tour-end", open, { once: true });
      else t = setTimeout(() => setShow(true), 900);
    };
    if (views >= 2) { open(); return () => { window.removeEventListener("mf-tour-end", open); clearTimeout(t); }; }
    const onScroll = () => { if (window.scrollY > 80) { window.removeEventListener("scroll", onScroll); open(); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("mf-tour-end", open); clearTimeout(t); };
  }, [promo, pathname, quiet]);

  const close = () => {
    setShow(false);
    try {
      if (promo) localStorage.setItem(`mf-promo-${promo.id}`, "1");
    } catch {}
  };
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!promo || !show || quiet) return null;
  return <PromoDialog promo={promo} close={close} />;
}

// A coupon code written in capitals in the admin text (e.g. "Use code WELCOME10 at checkout").
const codeIn = (text: string) => text.match(/\b(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]{4,20}\b/)?.[0] ?? null;

// The offer in the site's own look: a dark card with the brand red-orange glow, the coupon as a ticket
// you can copy, and a red button. Wording comes from the POPUP banner in admin.
function PromoDialog({ promo, close }: { promo: Promo; close: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  useFocusTrap(ref);
  const code = codeIn(`${promo.title} ${promo.subtitle}`);
  const copy = async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/70 p-4 pb-[calc(16px+env(safe-area-inset-bottom))] backdrop-blur-sm sm:place-items-center" onClick={close}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={promo.title}
        tabIndex={-1}
        className="relative w-full max-w-md animate-mf-rise overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0d] p-6 text-white shadow-[0_40px_90px_-30px_color-mix(in_oklab,var(--primary)_55%,transparent)] sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[130%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_55%,transparent),transparent)]" />
        <div aria-hidden className="pointer-events-none absolute -right-4 -top-8 bg-gradient-to-b from-primary to-brand-2 bg-clip-text text-[9rem] font-black leading-none text-transparent opacity-25">%</div>
        <button onClick={close} className="absolute right-2 top-2 grid size-11 place-items-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white" aria-label="Close">
          <X className="size-5" />
        </button>
        <p className="relative inline-flex items-center gap-2 rounded-full bg-primary px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em]">Limited offer</p>
        <h3 className="relative mt-3 text-[28px] font-extrabold leading-[1.08] tracking-[-0.035em] sm:text-[30px]">{promo.title}</h3>
        {promo.subtitle && <p className="relative mt-2 text-[15px] leading-[1.5] text-white/75">{promo.subtitle}</p>}
        {code && (
          <button type="button" onClick={copy} className="relative mt-5 flex w-full items-center justify-between gap-3 rounded-xl border-2 border-dashed border-brand-2/70 bg-white/5 px-4 py-3 text-left hover:bg-white/10" aria-label={`Copy coupon code ${code}`}>
            <span>
              <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-white/60">Coupon code</span>
              <span className="block font-mono text-xl font-extrabold tracking-[0.08em] text-brand-2">{code}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold">{copied ? <><Check className="size-4" /> Copied</> : <><Copy className="size-4" /> Copy</>}</span>
          </button>
        )}
        {promo.ctaText && (
          <Link href={promo.ctaHref || "/chapters"} onClick={close} className="relative mt-4 flex min-h-12 w-full items-center justify-center rounded-lg bg-primary px-4.5 py-3 text-[15px] font-bold text-primary-foreground shadow-cta transition hover:brightness-108">
            {promo.ctaText}
          </Link>
        )}
      </div>
    </div>
  );
}
