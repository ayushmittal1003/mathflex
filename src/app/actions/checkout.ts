"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { quoteCart, type Quote } from "@/lib/pricing";
import { createOrder, fulfilOrder } from "@/lib/orders";
import { initiateTransaction, paytmConfigured, paytmScriptUrl } from "@/lib/paytm";
import { mockPaymentsAllowed } from "@/lib/orders";

const Items = z.array(z.object({ type: z.enum(["CHAPTER", "COURSE"]), id: z.string().min(1) })).max(50);

export async function getQuote(items: unknown, coupon: string | null, mentorship: boolean): Promise<Quote> {
  const user = await getCurrentUser();
  return quoteCart(Items.parse(items), { userId: user?.id, couponCode: coupon, mentorship });
}

export type PlaceOrderResult =
  | { ok: false; error: string; login?: boolean }
  | { ok: true; mode: "mock"; orderId: string }
  | { ok: true; mode: "paytm"; orderNo: string; txnToken: string; amount: number; scriptUrl: string; mid: string }
  | { ok: true; mode: "free"; orderNo: string };

export async function placeOrder(items: unknown, coupon: string | null, mentorship: boolean): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please log in to continue", login: true };
  const settings = await getSettings();
  let order;
  try {
    order = await createOrder(user.id, Items.parse(items), coupon, mentorship);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  // 100% coupon: nothing to charge.
  if (order.total === 0) {
    await fulfilOrder(order.id, { txnId: "FREE" });
    return { ok: true, mode: "free", orderNo: order.orderNo };
  }

  if (settings.paymentMode === "paytm") {
    if (!paytmConfigured()) return { ok: false, error: "Payments are being set up. Please try again soon." };
    try {
      const { txnToken, mid } = await initiateTransaction({
        orderNo: order.orderNo,
        amount: order.total,
        userId: user.id,
        callbackUrl: `${process.env.APP_URL}/api/payments/paytm/callback`,
      });
      return { ok: true, mode: "paytm", orderNo: order.orderNo, txnToken, amount: order.total, scriptUrl: paytmScriptUrl(), mid };
    } catch (e) {
      console.error(e);
      return { ok: false, error: "Couldn't reach Paytm. Please try again." };
    }
  }

  if (!mockPaymentsAllowed()) return { ok: false, error: "Payments are not configured." };
  return { ok: true, mode: "mock", orderId: order.id };
}

// Test-mode gateway so the whole purchase flow works before Paytm keys exist.
export async function completeMockPayment(orderId: string, succeed: boolean) {
  const user = await getCurrentUser();
  if (!user || !mockPaymentsAllowed()) throw new Error("Not allowed");
  const order = await db.order.findFirstOrThrow({ where: { id: orderId, userId: user.id } });
  if (succeed) await fulfilOrder(order.id, { txnId: `MOCK-${Date.now()}`, raw: { mock: true } });
  else await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
  redirect(`/payment/status?order=${order.orderNo}`);
}
