import { getSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { requireStaff } from "@/lib/auth";
import { paytmConfigured } from "@/lib/paytm";
import { Card, Field, PageHeader, Toggle, SubmitButton } from "@/components/admin/ui";
import { saveSettings } from "../actions";

export const metadata = { title: "Settings" };

const FEATURE_LABELS: Record<keyof typeof DEFAULT_SETTINGS.features, [string, string]> = {
  chatbot: ["FlexCare chatbot", "Bottom-right assistant on every page"],
  leaderboard: ["Leaderboard", "Weekly / monthly / all-time rankings"],
  mentorshipUpsell: ["Mentorship upsell", "Offer the 1:1 call at checkout and on home"],
  coupons: ["Coupon codes", "Coupon field at checkout"],
  referAndEarn: ["Refer & Earn", "Referral section in the menu and profile"],
  introPopupVideo: ["Intro popup video", "30-sec mentor intro after purchasing a chapter"],
  celebrationSound: ["Celebration sounds", "Chimes on correct answers and unlocks"],
  sequentialUnlock: ["Sequential part unlock", "Part 2 opens only after Part 1 video + practice"],
  freePreviews: ["Free previews", "Parts marked as free preview are watchable without buying"],
  marquee: ["Running ticker", "Promo strip above the navbar"],
  signupOpen: ["New sign-ups", "Turn off to pause registrations"],
  practice: ["Practice question bank", "Chapter-wise Q bank with accuracy & marks analytics"],
};

const MARKING_LABELS: Record<keyof typeof DEFAULT_SETTINGS.marking, [string, string]> = {
  correct: ["Correct answer", "JEE: +4"],
  wrong: ["Wrong (single / numerical)", "JEE Main: −1"],
  multiWrong: ["Wrong (multi-correct)", "JEE Advanced: −2 if any wrong option is picked"],
  multiPartial: ["Partial (multi-correct)", "JEE Advanced: +1 per correct option, none wrong"],
};

const XP_LABELS: Record<keyof typeof DEFAULT_SETTINGS.xp, string> = {
  perCorrect: "Correct answer (default)",
  perPartVideo: "Finishing a video (default)",
  perPracticeSet: "Finishing a practice set",
  perChapter: "Completing a chapter",
  dailyStreakBonus: "Daily streak bonus",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireStaff("settings");
  const [s, { saved }] = await Promise.all([getSettings(), searchParams]);
  return (
    <form action={saveSettings} className="max-w-4xl space-y-6">
      <PageHeader title="Settings & features" subtitle="Switch features on and off and change prices — live instantly, no deploy needed." action={<SubmitButton>Save all</SubmitButton>} />
      {saved && <p className="rounded-xl bg-ok/10 p-3 text-sm font-semibold text-ok">Saved. Changes are live.</p>}

      <Card title="Features">
        <div className="grid gap-1 sm:grid-cols-2">
          {(Object.keys(FEATURE_LABELS) as (keyof typeof FEATURE_LABELS)[]).map((k) => (
            <Toggle key={k} name={`features.${k}`} label={FEATURE_LABELS[k][0]} hint={FEATURE_LABELS[k][1]} defaultChecked={s.features[k]} />
          ))}
        </div>
      </Card>

      <Card title="Payments">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Payment mode" hint={paytmConfigured() ? "Paytm keys found on the server." : "Paytm keys not found — set PAYTM_MID and PAYTM_MERCHANT_KEY."}>
            <select name="paymentMode" defaultValue={s.paymentMode} className="input">
              <option value="mock">Test mode (no real money)</option>
              <option value="paytm">Live Paytm</option>
            </select>
          </Field>
          <Field label="GST on top (%)" hint="0 if your prices already include tax"><input name="gstPercent" type="number" step="0.01" defaultValue={s.gstPercent} className="input" /></Field>
        </div>
      </Card>

      <Card title="Mentorship upsell">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price (₹)"><input name="mentorshipPrice" type="number" defaultValue={s.mentorshipPrice} className="input" /></Field>
          <Field label="Mentor name"><input name="mentorName" defaultValue={s.mentorName} className="input" /></Field>
          <Field label="Title"><input name="mentorshipTitle" defaultValue={s.mentorshipTitle} className="input" /></Field>
          <Field label="Pitch" className="sm:col-span-3"><input name="mentorshipBlurb" defaultValue={s.mentorshipBlurb} className="input" /></Field>
        </div>
      </Card>

      <Card title="XP rules">
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(XP_LABELS) as (keyof typeof XP_LABELS)[]).map((k) => (
            <Field key={k} label={XP_LABELS[k]}><input name={`xp.${k}`} type="number" min={0} defaultValue={s.xp[k]} className="input" /></Field>
          ))}
        </div>
      </Card>

      <Card title="JEE marking scheme" action={<span className="text-xs text-muted">Used to score practice and show marks</span>}>
        <div className="grid gap-4 sm:grid-cols-4">
          {(Object.keys(MARKING_LABELS) as (keyof typeof MARKING_LABELS)[]).map((k) => (
            <Field key={k} label={MARKING_LABELS[k][0]} hint={MARKING_LABELS[k][1]}><input name={`marking.${k}`} type="number" step="0.25" defaultValue={s.marking[k]} className="input" /></Field>
          ))}
        </div>
      </Card>

      <Card title="Brand & contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Site name"><input name="siteName" defaultValue={s.siteName} className="input" /></Field>
          <Field label="Tagline"><input name="tagline" defaultValue={s.tagline} className="input" /></Field>
          <Field label="Support email"><input name="supportEmail" type="email" defaultValue={s.supportEmail} className="input" /></Field>
          <Field label="WhatsApp number" hint="With country code, e.g. 917888558921"><input name="whatsappNumber" defaultValue={s.whatsappNumber} className="input" /></Field>
        </div>
      </Card>

      <div id="chatbot">
        <Card title="FlexCare chatbot">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bot name"><input name="chatbot.name" defaultValue={s.chatbot.name} className="input" /></Field>
            <Field label="Claude model" hint="Default claude-opus-5"><input name="chatbot.model" defaultValue={s.chatbot.model} className="input font-mono" /></Field>
            <Field label="Greeting" className="sm:col-span-2"><input name="chatbot.greeting" defaultValue={s.chatbot.greeting} className="input" /></Field>
          </div>
        </Card>
      </div>
      <SubmitButton>Save all</SubmitButton>
    </form>
  );
}
