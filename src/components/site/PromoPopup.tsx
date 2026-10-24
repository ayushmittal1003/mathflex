"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useFocusTrap } from "./web/useFocusTrap";

type Promo = { id: string; title: string; subtitle: string; ctaText: string; ctaHref: string; colorFrom: string; colorTo: string; imageUrl: string | null };

// Shows each active POPUP banner once per visitor (remembered in localStorage). It never opens
// over the hero on a first visit: it waits for the visitor's first scroll, or opens on their
// second page view (design.md §6a). Escape, the backdrop and the close button dismiss it.
export function PromoPopup({ promo }: { promo: Promo | null }) {
  const [show, setShow] = useState(false);
  const pathname = usePathname();
  // Never over checkout, payment, sign-in or the player: it would cover the pay button and form fields.
  const quiet = /^\/(checkout|cart|payment|login|signup|learn|invite)(\/|$)/.test(pathname);
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
    const open = () => { t = setTimeout(() => setShow(true), 600); };
    if (views >= 2) { open(); return () => clearTimeout(t); }
    const onScroll = () => { if (window.scrollY > 80) { window.removeEventListener("scroll", onScroll); open(); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); clearTimeout(t); };
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

function PromoDialog({ promo, close }: { promo: Promo; close: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/60 p-4 pb-[calc(16px+env(safe-area-inset-bottom))] backdrop-blur-sm sm:place-items-center" onClick={close}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={promo.title}
        tabIndex={-1}
        className="relative w-full max-w-md animate-mf-rise overflow-hidden rounded-xl p-6 text-white shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)] sm:p-7"
        style={{ background: `linear-gradient(135deg, ${promo.colorFrom}, ${promo.colorTo})` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={close} className="absolute right-2 top-2 grid size-11 place-items-center rounded-full bg-black/20" aria-label="Close">
          <X className="size-5" />
        </button>
        <div className="pointer-events-none absolute -right-6 -top-10 text-[10rem] font-black leading-none opacity-15">%</div>
        <p className="text-xs font-extrabold uppercase tracking-[0.12em] opacity-85">Limited offer</p>
        <h3 className="mt-2 text-[30px] font-extrabold leading-[1.08] tracking-[-0.035em]">{promo.title}</h3>
        {promo.subtitle && <p className="mt-2 opacity-90">{promo.subtitle}</p>}
        {promo.ctaText && (
          <Link href={promo.ctaHref || "/chapters"} onClick={close} className="mt-6 flex min-h-12 w-full items-center justify-center rounded-lg bg-white px-4.5 py-3 text-[15px] font-bold text-black transition hover:brightness-97">
            {promo.ctaText}
          </Link>
        )}
      </div>
    </div>
  );
}
