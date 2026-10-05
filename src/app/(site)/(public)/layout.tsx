import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { activeBanners } from "@/lib/banners";
import { isStaff } from "@/lib/permissions";
import { Marquee } from "@/components/site/Marquee";
import { SiteExtras } from "@/components/site/SiteExtras";
import { SiteNav } from "@/components/site/web/SiteNav";
import { SiteFooter } from "@/components/site/web/SiteFooter";

// Redesigned public website shell (dipankar-design/design.md). Always light: .site-light
// re-applies the light tokens here without touching the root layout or admin.
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const marquee = settings.features.marquee ? await activeBanners("MARQUEE") : [];

  return (
    <div className="site-light min-h-dvh overflow-x-clip bg-card text-foreground">
      {/* Admin-managed running ticker, kept from the original shell. */}
      <Marquee items={marquee.map((m) => ({ id: m.id, title: m.title, href: m.ctaHref }))} />
      <div className="relative">
        <SiteNav
          user={user ? { name: user.name, avatarColor: user.avatarColor, isStaff: isStaff(user.role) } : null}
          leaderboard={settings.features.leaderboard}
        />
        <main>{children}</main>
      </div>
      <SiteFooter settings={settings} />
      <SiteExtras settings={settings} />
    </div>
  );
}
