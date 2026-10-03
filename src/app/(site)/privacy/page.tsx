import { LegalDoc } from "@/components/site/LegalDoc";
import { PRIVACY } from "@/lib/legal/privacy";

export const metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function Page() {
  return <LegalDoc source={PRIVACY} />;
}
