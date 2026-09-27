import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { NavBar } from "@/components/site/NavBar";
import { TabBar } from "@/components/site/TabBar";
import { Footer } from "@/components/site/Footer";
import { Marquee } from "@/components/site/Marquee";
import { PromoPopup } from "@/components/site/PromoPopup";
import { ChatWidget } from "@/components/site/ChatWidget";
import { CelebrateProvider } from "@/components/site/Celebrate";
import { activeBanners } from "@/lib/banners";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const [marquee, popups, ents] = await Promise.all([
    settings.features.marquee ? activeBanners("MARQUEE") : Promise.resolve([]),
    activeBanners("POPUP"),
    user
      ? db.entitlement.findMany({
          where: { userId: user.id, expiresAt: { gt: new Date() } },
          orderBy: { expiresAt: "asc" },
          include: { chapter: { select: { title: true } }, course: { select: { title: true } } },
        })
      : Promise.resolve([]),
  ]);

  const planSummary = ents.length
    ? `${ents.length} active plan${ents.length > 1 ? "s" : ""} · next expiry ${ents[0].expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
    : null;

  const contact = { whatsapp: settings.whatsappNumber, email: settings.supportEmail };
  const f = settings.features;

  return (
    <CelebrateProvider sound={f.celebrationSound}>
      <NavBar
        ticker={<Marquee items={marquee.map((m) => ({ id: m.id, title: m.title, href: m.ctaHref }))} />}
        user={user ? { name: user.name, email: user.email, avatarColor: user.avatarColor, role: user.role, xp: user.xp, streak: user.streak, planSummary } : null}
        features={{ leaderboard: f.leaderboard, referAndEarn: f.referAndEarn }}
        contact={contact}
      />
      <main className={`min-h-[70vh] ${marquee.length ? "[--nav-h:6.25rem]" : "[--nav-h:4rem]"}`}>{children}</main>
      <Footer email={contact.email} whatsapp={contact.whatsapp} />
      <TabBar leaderboard={f.leaderboard} />
      {f.chatbot && <ChatWidget name={settings.chatbot.name} greeting={settings.chatbot.greeting} />}
      <PromoPopup promo={popups[0] ?? null} />
    </CelebrateProvider>
  );
}
