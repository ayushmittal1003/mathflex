"use client";
import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Horizontal, swipeable row with desktop arrow buttons — the core Netflix pattern.
export function Row({ title, subtitle, href, children }: { title: string; subtitle?: string; href?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });
  return (
    <section className="group/row relative mt-8 sm:mt-10">
      <div className="mx-auto flex max-w-[1500px] items-end justify-between px-4 md:px-8">
        <div>
          <h2 className="font-display text-xl font-extrabold sm:text-2xl">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {href && <Link href={href} className="text-sm font-bold text-brand">See all</Link>}
      </div>
      <div className="relative mx-auto max-w-[1500px]">
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-0 z-10 hidden h-full w-12 place-items-center bg-gradient-to-r from-bg to-transparent opacity-0 transition group-hover/row:opacity-100 md:grid"
          aria-label="Scroll left"
        >
          <ChevronLeft className="size-8" />
        </button>
        <div ref={ref} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-4 pt-3 sm:gap-4 md:scroll-px-8 md:px-8">
          {children}
        </div>
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-0 z-10 hidden h-full w-12 place-items-center bg-gradient-to-l from-bg to-transparent opacity-0 transition group-hover/row:opacity-100 md:grid"
          aria-label="Scroll right"
        >
          <ChevronRight className="size-8" />
        </button>
      </div>
    </section>
  );
}
