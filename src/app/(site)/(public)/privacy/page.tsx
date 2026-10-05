import { getSettings } from "@/lib/settings";
import { LegalPage } from "@/components/site/web/LegalPage";
import { PRIVACY } from "@/lib/legal/privacy";

export const metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

// Policy text is Ayush's (lib/legal/privacy.ts), unchanged; only the layout is redesigned.
export default async function Page() {
  const { supportEmail } = await getSettings();
  return <LegalPage source={PRIVACY} current="/privacy" email={supportEmail} />;
}
