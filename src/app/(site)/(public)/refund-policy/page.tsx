import { getSettings } from "@/lib/settings";
import { LegalPage } from "@/components/site/web/LegalPage";
import { REFUND } from "@/lib/legal/refund";

export const metadata = { title: "Refund Policy", alternates: { canonical: "/refund-policy" } };

// Policy text is Ayush's (lib/legal/refund.ts), unchanged; only the layout is redesigned.
export default async function Page() {
  const { supportEmail } = await getSettings();
  return <LegalPage source={REFUND} current="/refund-policy" email={supportEmail} />;
}
