import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { activeBanners } from "@/lib/banners";
import { Marquee } from "@/components/site/Marquee";
import { SiteExtras } from "@/components/site/SiteExtras";
import { SiteNav } from "@/components/site/web/SiteNav";
import { SiteFooter } from "@/components/site/web/SiteFooter";
import { ToastProvider } from "@/components/site/web/Toast";
import { getSiteNavProps } from "@/components/site/web/data";

// What stays in this group: the local mock payment page and the old-URL redirects
// (/browse, /cart). Same shell as the public site.
export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const [marquee, nav] = await Promise.all([
    settings.features.marquee ? activeBanners("MARQUEE") : Promise.resolve([]),
    getSiteNavProps(user, settings),
  ]);

  return (
    <div className="site-light min-h-dvh overflow-x-clip bg-card pb-[calc(64px+env(safe-area-inset-bottom))] text-foreground tablet:pb-0">
      <ToastProvider>
        <Marquee items={marquee.map((m) => ({ id: m.id, title: m.title, href: m.ctaHref }))} />
        <div className="relative">
          <SiteNav {...nav} />
          <main className="min-h-[70vh] [--nav-h:7rem]">{children}</main>
        </div>
        <SiteFooter settings={settings} />
        <SiteExtras settings={settings} />
      </ToastProvider>
    </div>
  );
}
