import Link from "next/link";

export function Marquee({ items }: { items: { id: string; title: string; href: string }[] }) {
  if (!items.length) return null;
  const row = [...items, ...items, ...items, ...items];
  return (
    <div className="overflow-hidden bg-brand-gradient py-2 text-sm font-semibold text-white">
      <div className="animate-marquee flex w-max gap-10 whitespace-nowrap hover:[animation-play-state:paused]">
        {[...row, ...row].map((m, i) => (
          <Link key={i} href={m.href || "#"} className="flex items-center gap-10">
            {m.title}
            <span aria-hidden>✦</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
