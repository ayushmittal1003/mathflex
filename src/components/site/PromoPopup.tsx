"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

type Promo = { id: string; title: string; subtitle: string; ctaText: string; ctaHref: string; colorFrom: string; colorTo: string; imageUrl: string | null };

// Shows each active POPUP banner once per visitor (remembered in localStorage).
export function PromoPopup({ promo }: { promo: Promo | null }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!promo) return;
    let seen = false;
    try {
      seen = localStorage.getItem(`mf-promo-${promo.id}`) === "1";
    } catch {}
    if (seen) return;
    const t = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(t);
  }, [promo]);

  if (!promo || !show) return null;
  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(`mf-promo-${promo.id}`, "1");
    } catch {}
  };
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/60 p-4 backdrop-blur-sm sm:place-items-center" onClick={close}>
      <div
        className="animate-rise relative w-full max-w-md overflow-hidden rounded-3xl p-7 text-white shadow-2xl"
        style={{ background: `linear-gradient(135deg, ${promo.colorFrom}, ${promo.colorTo})` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={close} className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/20" aria-label="Close">
          <X className="size-5" />
        </button>
        <div className="pointer-events-none absolute -right-6 -top-10 font-display text-[10rem] font-extrabold leading-none opacity-15">%</div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Limited offer</p>
        <h3 className="mt-2 font-display text-3xl font-extrabold leading-tight">{promo.title}</h3>
        {promo.subtitle && <p className="mt-2 opacity-90">{promo.subtitle}</p>}
        {promo.ctaText && (
          <Link href={promo.ctaHref || "/browse"} onClick={close} className="btn mt-6 w-full bg-white text-black">
            {promo.ctaText}
          </Link>
        )}
      </div>
    </div>
  );
}
