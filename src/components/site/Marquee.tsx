import Link from "next/link";

// Reading speed in px per second, so the strip moves the same however many offers there are.
const PHONE_SPEED = 40;
const WIDE_SPEED = 70;
const CHAR_PX = 7.4; // average width of this text, close enough for a speed
const ITEM_EXTRA_PX = 94; // the gaps and the ✦ around each offer

export function Marquee({ items }: { items: { id: string; title: string; href: string }[] }) {
  if (!items.length) return null;
  const row = [...items, ...items, ...items, ...items];
  // One loop travels the width of one row.
  const rowPx = row.reduce((sum, m) => sum + m.title.length * CHAR_PX + ITEM_EXTRA_PX, 0);
  const duration = { "--marquee-phone": `${Math.round(rowPx / PHONE_SPEED)}s`, "--marquee-wide": `${Math.round(rowPx / WIDE_SPEED)}s` } as React.CSSProperties;
  return (
    <div className="overflow-hidden bg-brand-gradient text-sm font-semibold text-white">
      <div style={duration} className="flex w-max animate-marquee gap-10 whitespace-nowrap [animation-duration:var(--marquee-phone)] hover:[animation-play-state:paused] active:[animation-play-state:paused] tablet:[animation-duration:var(--marquee-wide)]">
        {[...row, ...row].map((m, i) => (
          <Link key={i} href={m.href || "#"} className="flex min-h-11 items-center gap-10">
            {m.title}
            <span aria-hidden>✦</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
