import type { Settings } from "@/lib/settings";
import { activeBanners } from "@/lib/banners";
import { TabBar } from "./TabBar";
import { ChatWidget } from "./ChatWidget";
import { PromoPopup } from "./PromoPopup";

// Floating pieces every site page gets (mobile tab bar, FlexCare, promo popup).
// Rendered inside each shell so they pick up that shell's theme.
export async function SiteExtras({ settings }: { settings: Settings }) {
  const f = settings.features;
  const popups = await activeBanners("POPUP");
  return (
    <>
      <TabBar leaderboard={f.leaderboard} practice={f.practice} />
      {f.chatbot && <ChatWidget name={settings.chatbot.name} greeting={settings.chatbot.greeting} />}
      <PromoPopup promo={popups[0] ?? null} />
    </>
  );
}
