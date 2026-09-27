import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { CartView } from "@/components/site/CartView";

export const metadata = { title: "Cart" };

export default async function CartPage({ searchParams }: { searchParams: Promise<{ mentorship?: string }> }) {
  const [{ mentorship }, s, user] = await Promise.all([searchParams, getSettings(), getCurrentUser()]);
  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-[calc(var(--nav-h)+2rem)] md:px-8">
      <h1 className="mb-6 font-display text-3xl font-extrabold sm:text-4xl">Your cart</h1>
      <CartView
        mentorship={{ enabled: s.features.mentorshipUpsell, price: s.mentorshipPrice, title: s.mentorshipTitle, blurb: s.mentorshipBlurb, mentor: s.mentorName }}
        couponsEnabled={s.features.coupons}
        initialMentorship={mentorship === "1" && s.features.mentorshipUpsell}
        loggedIn={!!user}
      />
    </div>
  );
}
