import { getSettings } from "@/lib/settings";
import { LegalPage } from "@/components/site/web/LegalPage";
import { TERMS } from "@/lib/legal/terms";

export const metadata = { title: "Terms of Use", alternates: { canonical: "/terms" } };

// Policy text is Ayush's (lib/legal/terms.ts), unchanged; only the layout is redesigned.
export default async function Page() {
  const { supportEmail } = await getSettings();
  return <LegalPage source={TERMS} current="/terms" email={supportEmail} />;
}
