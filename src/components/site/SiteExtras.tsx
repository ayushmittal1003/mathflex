import type { Settings } from "@/lib/settings";
import { activeBanners } from "@/lib/banners";
import { TabBar } from "./TabBar";
import { ChatWidget } from "./ChatWidget";
import { PromoPopup } from "./PromoPopup";

// Floating pieces every site page gets (mobile tab bar, FlexCare, promo popup).
// Rendered inside each shell so they pick up that shell's theme.
// tabBar: the original bottom bar (the redesigned site renders its own in SiteNav).
// lifted: keep FlexCare above a phone bottom bar.
export async function SiteExtras({ settings, tabBar = true, lifted = true }: { settings: Settings; tabBar?: boolean; lifted?: boolean }) {
  const f = settings.features;
  const popups = await activeBanners("POPUP");
  return (
    <>
      {tabBar && <TabBar leaderboard={f.leaderboard} practice={f.practice} />}
      {f.chatbot && <ChatWidget name={settings.chatbot.name} greeting={settings.chatbot.greeting} lifted={lifted} />}
      <PromoPopup promo={popups[0] ?? null} />
    </>
  );
}
