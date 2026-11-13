import "server-only";
import { LEAD_CLASS_LABEL, LEAD_GOAL_LABEL, LEAD_TIME_LABEL } from "./leads";

// Instant "new lead" ping to the team's phones through a Telegram bot (free, no per-message cost).
// Off until TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set: create the bot with @BotFather, add it
// to the team's group (or message it), and put the chat id in TELEGRAM_CHAT_ID (several: comma-separated).
// Never throws: an alert failing must not lose the lead.
type AlertLead = { id: string; name: string; phone: string; classLevel: string; goal: string; weakAreas: string[]; callTime: string; channel: string; utmSource?: string | null; utmCampaign?: string | null };

export async function alertNewLead(lead: AlertLead, siteUrl: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chats = (process.env.TELEGRAM_CHAT_ID ?? "").split(",").map((c) => c.trim()).filter(Boolean);
  if (!token || !chats.length) return;
  const digits = lead.phone.replace(/\D/g, "");
  const lines = [
    `🔔 New lead: ${lead.name}`,
    `📞 ${lead.phone}`,
    [LEAD_CLASS_LABEL[lead.classLevel], LEAD_GOAL_LABEL[lead.goal]].filter(Boolean).join(" · "),
    lead.weakAreas.length ? `Weak: ${lead.weakAreas.join(", ")}` : "",
    lead.callTime ? `Call: ${LEAD_TIME_LABEL[lead.callTime] ?? lead.callTime}` : "",
    `From: ${lead.channel === "meta_form" ? "Instagram/Facebook lead form" : "website form"}${lead.utmCampaign ? ` · ${lead.utmCampaign}` : lead.utmSource ? ` · ${lead.utmSource}` : ""}`,
  ].filter(Boolean);
  const body = (chat: string) => JSON.stringify({
    chat_id: chat,
    text: lines.join("\n"),
    reply_markup: { inline_keyboard: [[{ text: "WhatsApp", url: `https://wa.me/${digits}` }, { text: "Open in admin", url: `${siteUrl}/admin/leads?q=${encodeURIComponent(digits.slice(-10))}` }]] },
  });
  await Promise.all(chats.map(async (chat) => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: body(chat), signal: AbortSignal.timeout(6000) });
      if (!res.ok) console.error(`[lead-alert] Telegram ${res.status}: ${(await res.text()).slice(0, 200)}`);
    } catch (e) {
      console.error("[lead-alert] failed:", (e as Error).message);
    }
  }));
}
