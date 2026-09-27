"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Info } from "lucide-react";

export type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  symbol: string;
  colorFrom: string;
  colorTo: string;
  imageUrl: string | null;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  meta?: string[];
};

// Full-bleed billboard that auto-rotates, like the Netflix home hero.
export function Hero({ slides }: { slides: HeroSlide[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [slides.length]);
  if (!slides.length) return <div className="h-24" />;

  return (
    <section className="relative h-[82svh] min-h-[520px] w-full overflow-hidden text-white sm:h-[88svh] lg:max-h-[860px]">
      {slides.map((s, idx) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${idx === i ? "opacity-100" : "pointer-events-none opacity-0"}`}
          aria-hidden={idx !== i}
        >
          <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${s.colorFrom}, ${s.colorTo})` }} />
          {s.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <>
              <div className="absolute -right-[10%] top-1/2 -translate-y-1/2 select-none font-display text-[28rem] font-extrabold leading-none text-white/15 sm:text-[40rem] lg:right-[2%]">
                {s.symbol}
              </div>
              <svg className="absolute inset-0 size-full opacity-[0.12]" aria-hidden>
                <defs>
                  <pattern id={`grid-${s.id}`} width="48" height="48" patternUnits="userSpaceOnUse">
                    <path d="M48 0H0V48" fill="none" stroke="white" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#grid-${s.id})`} />
              </svg>
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />

          <div className="relative mx-auto flex h-full max-w-[1500px] flex-col justify-end px-4 pb-24 sm:pb-32 md:px-8">
            <div className={`max-w-xl ${idx === i ? "animate-rise" : ""}`}>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/80">{s.eyebrow}</p>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">{s.title}</h1>
              {!!s.meta?.length && (
                <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold text-white/85">
                  {s.meta.map((m) => <span key={m}>{m}</span>)}
                </div>
              )}
              <p className="mt-4 text-base text-white/85 sm:text-lg">{s.subtitle}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={s.primary.href} className="btn bg-white !px-6 text-black hover:bg-white/90">
                  <Play className="size-5 fill-current" /> {s.primary.label}
                </Link>
                {s.secondary && (
                  <Link href={s.secondary.href} className="btn bg-white/20 !px-6 text-white backdrop-blur hover:bg-white/30">
                    <Info className="size-5" /> {s.secondary.label}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      {slides.length > 1 && (
        <div className="absolute bottom-10 right-4 flex gap-1.5 md:right-8">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-white" : "w-3 bg-white/40"}`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
