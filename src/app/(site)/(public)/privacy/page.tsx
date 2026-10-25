import { getSettings } from "@/lib/settings";
import { LegalPage } from "@/components/site/web/LegalPage";
import { PRIVACY } from "@/lib/legal/privacy";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({ title: "Privacy Policy", description: "How MathFlex collects, uses and protects your personal information.", path: "/privacy" });

// Policy text is Ayush's (lib/legal/privacy.ts), unchanged; only the layout is redesigned.
export default async function Page() {
  const { supportEmail } = await getSettings();
  return <LegalPage source={PRIVACY} current="/privacy" email={supportEmail} />;
}
