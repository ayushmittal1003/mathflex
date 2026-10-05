import Link from "next/link";
import { cx } from "../ui";

type Banner = { id: string; title: string; subtitle: string; ctaText: string; ctaHref: string; colorFrom: string; colorTo: string };

// Admin-managed HERO and OFFER banners. The new design has no slot for them, but they're a
// live admin feature, so they stay on the home page as a compact strip under the hero.
// Renders nothing when no banner is active.
export function OffersStrip({ banners }: { banners: Banner[] }) {
  if (!banners.length) return null;
  return (
    <section aria-label="Offers" className="mx-auto w-[min(1120px,calc(100%-48px))] pt-16">
      <div className={cx("grid gap-3", banners.length > 1 && "sm:grid-cols-2")}>
        {banners.map((b) => (
          <Link
            key={b.id}
            href={b.ctaHref || "/browse"}
            className="relative flex min-h-28 flex-col justify-end overflow-hidden rounded-xl p-5 text-white shadow-frame transition duration-300 ease-mf hover:-translate-y-1"
            style={{ background: `linear-gradient(135deg, ${b.colorFrom}, ${b.colorTo})` }}
          >
            <p className="text-xl font-extrabold leading-tight tracking-[-0.02em]">{b.title}</p>
            {b.subtitle && <p className="mt-1 text-sm text-white/90">{b.subtitle}</p>}
            {b.ctaText && <p className="mt-3 text-sm font-bold">{b.ctaText} →</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
