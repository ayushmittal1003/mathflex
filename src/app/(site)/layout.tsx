import { getCurrentUser, getImpersonator } from "@/lib/auth";
import { accessSnapshot, activeEntitlements } from "@/lib/access";
import { AccessWatcher } from "@/components/site/AccessWatcher";
import { ImpersonationBanner } from "@/components/site/ImpersonationBanner";
import { getSettings } from "@/lib/settings";
import { NavBar } from "@/components/site/NavBar";
import { TabBar } from "@/components/site/TabBar";
import { Footer } from "@/components/site/Footer";
import { Marquee } from "@/components/site/Marquee";
import { PromoPopup } from "@/components/site/PromoPopup";
import { ChatWidget } from "@/components/site/ChatWidget";
import { CelebrateProvider } from "@/components/site/Celebrate";
import { activeBanners } from "@/lib/banners";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [user, settings, impersonator] = await Promise.all([getCurrentUser(), getSettings(), getImpersonator()]);
  const [marquee, popups, ents] = await Promise.all([
    settings.features.marquee ? activeBanners("MARQUEE") : Promise.resolve([]),
    activeBanners("POPUP"),
    user ? activeEntitlements(user.id) : Promise.resolve([]),
  ]);

  const planSummary = ents.length
    ? `${ents.length} active plan${ents.length > 1 ? "s" : ""} · next expiry ${ents[0].expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
    : null;

  const contact = { whatsapp: settings.whatsappNumber, email: settings.supportEmail };
  const f = settings.features;

  return (
    <CelebrateProvider sound={f.celebrationSound}>
      {impersonator && user && <ImpersonationBanner student={user.name} admin={impersonator.name} />}
      {user && <AccessWatcher initial={accessSnapshot(user.role, ents)} />}
      <NavBar
        ticker={<Marquee items={marquee.map((m) => ({ id: m.id, title: m.title, href: m.ctaHref }))} />}
        user={user ? { name: user.name, email: user.email, avatarColor: user.avatarColor, role: user.role, xp: user.xp, streak: user.streak, planSummary } : null}
        features={{ leaderboard: f.leaderboard, referAndEarn: f.referAndEarn, practice: f.practice }}
        contact={contact}
      />
      <main className={`min-h-[70vh] ${marquee.length ? "[--nav-h:6.25rem]" : "[--nav-h:4rem]"}`}>{children}</main>
      <Footer email={contact.email} whatsapp={contact.whatsapp} />
      <TabBar leaderboard={f.leaderboard} practice={f.practice} />
      {f.chatbot && <ChatWidget name={settings.chatbot.name} greeting={settings.chatbot.greeting} />}
      <PromoPopup promo={popups[0] ?? null} />
    </CelebrateProvider>
  );
}
