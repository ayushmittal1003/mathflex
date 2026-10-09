import { getSettings } from "@/lib/settings";
import { LegalPage } from "@/components/site/web/LegalPage";
import { TERMS } from "@/lib/legal/terms";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({ title: "Terms of Use", description: "The terms that apply when you use MathFlex and buy its courses.", path: "/terms" });

// Policy text is Ayush's (lib/legal/terms.ts), unchanged; only the layout is redesigned.
export default async function Page() {
  const { supportEmail } = await getSettings();
  return <LegalPage source={TERMS} current="/terms" email={supportEmail} />;
}
