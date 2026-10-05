import { redirect } from "next/navigation";

// The cart moved into /checkout (redesign). /cart keeps working for old links, the
// "log in to pay" return path and Cashfree's return route, which sends shoppers here.
export default async function CartPage({ searchParams }: { searchParams: Promise<{ mentorship?: string }> }) {
  const { mentorship } = await searchParams;
  redirect(mentorship === "1" ? "/checkout?mentorship=1" : "/checkout");
}
