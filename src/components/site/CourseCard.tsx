import Link from "next/link";
import { Check } from "lucide-react";
import { inr, pctOff } from "@/lib/format";

export type CourseCardData = {
  id: string; slug: string; title: string; subtitle: string; price: number; mrp: number;
  coverFrom: string; coverTo: string; highlights: string[]; chapterCount: number; owned: boolean;
};

export function CourseCard({ c }: { c: CourseCardData }) {
  const off = pctOff(c.price, c.mrp);
  return (
    <Link
      href={`/courses/${c.slug}`}
      className="group relative flex w-[290px] shrink-0 snap-start flex-col overflow-hidden rounded-3xl p-6 text-white shadow-xl transition hover:-translate-y-1 sm:w-[360px]"
      style={{ background: `linear-gradient(140deg, ${c.coverFrom}, ${c.coverTo})` }}
    >
      <div className="pointer-events-none absolute -bottom-10 -right-6 font-display text-[12rem] font-extrabold leading-none text-white/15">Σ</div>
      {off > 0 && <span className="absolute right-4 top-4 rounded-full bg-black/30 px-3 py-1 text-xs font-bold backdrop-blur">Save {off}%</span>}
      <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Complete course</p>
      <h3 className="mt-2 font-display text-2xl font-extrabold leading-tight">{c.title}</h3>
      <p className="mt-1 text-sm opacity-85">{c.subtitle}</p>
      <ul className="mt-4 space-y-1.5 text-sm">
        <li className="flex items-center gap-2"><Check className="size-4" /> {c.chapterCount} chapters included</li>
        {c.highlights.slice(0, 3).map((h) => (
          <li key={h} className="flex items-center gap-2"><Check className="size-4" /> {h}</li>
        ))}
      </ul>
      <div className="mt-auto flex items-end justify-between pt-6">
        <div>
          <span className="font-display text-3xl font-extrabold">{inr(c.price)}</span>
          {off > 0 && <span className="ml-2 text-sm line-through opacity-70">{inr(c.mrp)}</span>}
        </div>
        <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black">{c.owned ? "Open" : "View"}</span>
      </div>
    </Link>
  );
}
