import type { Settings } from "@/lib/settings";
import { activeBanners } from "@/lib/banners";
import { ChatWidget } from "./ChatWidget";
import { PromoPopup } from "./PromoPopup";

// Floating pieces every site page gets (MathMate, promo popup). The phone bottom bar
// lives in SiteNav.
// Rendered inside each shell so they pick up that shell's theme.
// lifted: keep MathMate above a phone bottom bar.
export async function SiteExtras({ settings, lifted = true }: { settings: Settings; lifted?: boolean }) {
  const f = settings.features;
  const popups = await activeBanners("POPUP");
  return (
    <>
      {f.chatbot && <ChatWidget name={settings.chatbot.name} greeting={settings.chatbot.greeting} lifted={lifted} />}
      <PromoPopup promo={popups[0] ?? null} />
    </>
  );
}
