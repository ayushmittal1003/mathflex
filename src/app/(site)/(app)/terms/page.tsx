import { LegalDoc } from "@/components/site/LegalDoc";
import { TERMS } from "@/lib/legal/terms";

export const metadata = { title: "Terms of Use", alternates: { canonical: "/terms" } };

export default function Page() {
  return <LegalDoc source={TERMS} />;
}
