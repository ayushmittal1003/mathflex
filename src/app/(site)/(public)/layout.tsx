import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { activeBanners } from "@/lib/banners";
import { getCartMeta, getSiteNavProps } from "@/components/site/web/data";
import { Marquee } from "@/components/site/Marquee";
import { SiteExtras } from "@/components/site/SiteExtras";
import { SiteNav } from "@/components/site/web/SiteNav";
import { SiteFooter } from "@/components/site/web/SiteFooter";
import { SkipLink } from "@/components/site/web/SkipLink";
import { ToastProvider } from "@/components/site/web/Toast";
import { CartDrawerProvider } from "@/components/site/web/CartDrawer";

// Redesigned public website shell (dipankar-design/design.md). Always light: .site-light
// re-applies the light tokens here without touching the root layout or admin.
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const [marquee, nav, cartMeta] = await Promise.all([
    settings.features.marquee ? activeBanners("MARQUEE") : Promise.resolve([]),
    getSiteNavProps(user, settings),
    getCartMeta(),
  ]);

  return (
    <div className="site-light min-h-dvh overflow-x-clip bg-card pb-[calc(64px+env(safe-area-inset-bottom))] text-foreground tablet:pb-0">
      <ToastProvider>
      <CartDrawerProvider meta={cartMeta}>
      <SkipLink />
      {/* Admin-managed running ticker, kept from the original shell. */}
      <Marquee items={marquee.map((m) => ({ id: m.id, title: m.title, href: m.ctaHref }))} />
      <div className="relative">
        <SiteNav {...nav} />
        <main id="main">{children}</main>
      </div>
      <SiteFooter settings={settings} />
      <SiteExtras settings={settings} />
      </CartDrawerProvider>
      </ToastProvider>
    </div>
  );
}
