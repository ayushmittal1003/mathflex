import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { completeMockPayment } from "@/app/actions/checkout";
import { mockPaymentsAllowed, validGuestOrderToken } from "@/lib/orders";
import { inr } from "@/lib/format";
import { cashfreeConfigured } from "@/lib/cashfree";
import { privateMetadata } from "@/lib/seo/metadata";

// Stand-in for Cashfree checkout in local development when Cashfree keys aren't set.
export const metadata = privateMetadata("Test payment");

export default async function MockPay({ searchParams }: { searchParams: Promise<{ order?: string; t?: string }> }) {
  const { order: id, t } = await searchParams;
  if (!mockPaymentsAllowed() || cashfreeConfigured() || !id) notFound();
  const found = await db.order.findUnique({ where: { id }, include: { items: true } });
  const guest = !!found && !found.userId && validGuestOrderToken(found.orderNo, t);
  const user = guest ? null : await requireUser("/cart");
  const order = guest || found?.userId === user?.id ? found : null;
  if (!order) notFound();
  return (
    <div className="mx-auto max-w-md px-4 pt-[calc(var(--nav-h)+3rem)]">
      <div className="card overflow-hidden">
        <div className="bg-[#00BAF2] p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">Test payment · no real money</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{inr(order.total)}</p>
          <p className="text-sm opacity-90">Order {order.orderNo}</p>
        </div>
        <ul className="space-y-1 p-5 text-sm">
          {order.items.map((i) => <li key={i.id} className="flex justify-between"><span>{i.title}</span><span>{inr(i.price)}</span></li>)}
        </ul>
        <div className="grid gap-2 p-5 pt-0">
          <form action={completeMockPayment.bind(null, order.id, true, t)}><button className="btn btn-primary w-full">Simulate successful payment</button></form>
          <form action={completeMockPayment.bind(null, order.id, false, t)}><button className="btn btn-ghost w-full">Simulate failure</button></form>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Add the Cashfree keys to the environment to use the real checkout.</p>
    </div>
  );
}
