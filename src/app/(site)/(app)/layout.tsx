import { getCurrentUser } from "@/lib/auth";
import { activeEntitlements } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import { NavBar } from "@/components/site/NavBar";
import { Footer } from "@/components/site/Footer";
import { Marquee } from "@/components/site/Marquee";
import { SiteExtras } from "@/components/site/SiteExtras";
import { activeBanners } from "@/lib/banners";

// The original site shell, unchanged. Pages move out of this group as they're redesigned;
// My Learning, Practice and Profile stay here.
export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const [marquee, ents] = await Promise.all([
    settings.features.marquee ? activeBanners("MARQUEE") : Promise.resolve([]),
    user ? activeEntitlements(user.id) : Promise.resolve([]),
  ]);

  const planSummary = ents.length
    ? `${ents.length} active plan${ents.length > 1 ? "s" : ""} · next expiry ${ents[0].expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
    : null;

  const contact = { whatsapp: settings.whatsappNumber, email: settings.supportEmail };
  const f = settings.features;

  return (
    <>
      <NavBar
        ticker={<Marquee items={marquee.map((m) => ({ id: m.id, title: m.title, href: m.ctaHref }))} />}
        user={user ? { name: user.name, email: user.email, avatarColor: user.avatarColor, role: user.role, xp: user.xp, streak: user.streak, planSummary } : null}
        features={{ leaderboard: f.leaderboard, referAndEarn: f.referAndEarn, practice: f.practice }}
        contact={contact}
      />
      <main className={`min-h-[70vh] ${marquee.length ? "[--nav-h:6.25rem]" : "[--nav-h:4rem]"}`}>{children}</main>
      <Footer email={contact.email} whatsapp={contact.whatsapp} />
      <SiteExtras settings={settings} />
    </>
  );
}
