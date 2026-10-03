import { LegalDoc } from "@/components/site/LegalDoc";
import { ABOUT } from "@/lib/legal/about";

export const metadata = { title: "About us", alternates: { canonical: "/about" } };

export default function Page() {
  return <LegalDoc source={ABOUT} />;
}
