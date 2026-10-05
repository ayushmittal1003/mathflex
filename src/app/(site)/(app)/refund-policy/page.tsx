import { LegalDoc } from "@/components/site/LegalDoc";
import { REFUND } from "@/lib/legal/refund";

export const metadata = { title: "Refund Policy", alternates: { canonical: "/refund-policy" } };

export default function Page() {
  return <LegalDoc source={REFUND} />;
}
