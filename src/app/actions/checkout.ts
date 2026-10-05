"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { quoteCart, type Quote } from "@/lib/pricing";
import { createOrder, fulfilOrder } from "@/lib/orders";
import { CashfreeError, cashfreeConfigured, cashfreeMode, createCashfreeOrder, type CashfreeMode } from "@/lib/cashfree";
import { syncCashfreeOrder } from "@/lib/payments";
import { mockPaymentsAllowed } from "@/lib/orders";

const Items = z.array(z.object({ type: z.enum(["CHAPTER", "COURSE"]), id: z.string().min(1) })).max(50);

export async function getQuote(items: unknown, coupon: string | null, mentorship: boolean): Promise<Quote> {
  const user = await getCurrentUser();
  return quoteCart(Items.parse(items), { userId: user?.id, couponCode: coupon, mentorship });
}

export type PlaceOrderResult =
  | { ok: false; error: string; login?: boolean; needPhone?: boolean }
  | { ok: true; mode: "mock"; orderId: string }
  | { ok: true; mode: "cashfree"; orderNo: string; paymentSessionId: string; env: CashfreeMode }
  | { ok: true; mode: "free"; orderNo: string };

const Phone = /^[6-9]\d{9}$/;
const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

// The browser only sends item ids, a coupon code and the mentorship toggle. Prices,
// discounts and the total are recomputed from the database in createOrder.
export async function placeOrder(items: unknown, coupon: string | null, mentorship: boolean, phoneInput?: string): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please log in to continue", login: true };

  const cashfree = cashfreeConfigured();
  if (!cashfree && !mockPaymentsAllowed()) {
    console.error("[checkout] Cashfree keys missing (CASHFREE_APP_ID / CASHFREE_SECRET_KEY); refusing checkout");
    return { ok: false, error: "Online payments aren't available right now. Please try again shortly." };
  }

  // Cashfree requires a 10-digit mobile number; ask for it once and remember it.
  let phone = user.phone ?? "";
  if (cashfree && !Phone.test(phone)) {
    const typed = (phoneInput ?? "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (!Phone.test(typed)) return { ok: false, needPhone: true, error: "Enter your 10-digit mobile number to pay." };
    phone = typed;
    await db.user.update({ where: { id: user.id }, data: { phone } });
  }

  let order;
  try {
    order = await createOrder(user.id, Items.parse(items), coupon, mentorship, cashfree ? "cashfree" : "mock");
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  // 100% coupon: nothing to charge.
  if (order.total === 0) {
    await fulfilOrder(order.id, { txnId: "FREE" });
    return { ok: true, mode: "free", orderNo: order.orderNo };
  }

  if (cashfree) {
    const base = appUrl();
    try {
      const { paymentSessionId, cfOrderId } = await createCashfreeOrder({
        orderNo: order.orderNo,
        amount: order.total,
        customer: { id: user.id, phone, email: user.email, name: user.name },
        returnUrl: `${base}/api/payments/cashfree/return?order_id={order_id}`,
        // Cashfree only calls HTTPS webhooks, so local http dev skips it (the return check still runs).
        notifyUrl: base.startsWith("https://") ? `${base}/api/payments/cashfree/webhook` : null,
      });
      await db.order.update({ where: { id: order.id }, data: { gatewayRaw: { cf_order_id: cfOrderId } } });
      console.info(`[checkout] ${order.orderNo} created for ₹${order.total} (user ${user.id})`);
      return { ok: true, mode: "cashfree", orderNo: order.orderNo, paymentSessionId, env: cashfreeMode() };
    } catch (e) {
      await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
      const msg = e instanceof CashfreeError && e.status === 400 ? e.message : "Couldn't start the payment. Please try again.";
      return { ok: false, error: msg };
    }
  }

  return { ok: true, mode: "mock", orderId: order.id };
}

// Polled by the payment status page while Cashfree confirms (UPI can take a moment).
export async function refreshPaymentStatus(orderNo: string) {
  const user = await getCurrentUser();
  if (!user) return "NOT_FOUND";
  const order = await db.order.findFirst({ where: { orderNo, userId: user.id }, select: { status: true, gateway: true } });
  if (!order) return "NOT_FOUND";
  if (order.status !== "PENDING" || order.gateway !== "cashfree") return order.status;
  return syncCashfreeOrder(orderNo);
}

// Test-mode gateway for local development when Cashfree keys aren't set.
export async function completeMockPayment(orderId: string, succeed: boolean) {
  const user = await getCurrentUser();
  if (!user || !mockPaymentsAllowed() || cashfreeConfigured()) throw new Error("Not allowed");
  const order = await db.order.findFirstOrThrow({ where: { id: orderId, userId: user.id, gateway: "mock", status: "PENDING" } });
  if (succeed) await fulfilOrder(order.id, { txnId: `MOCK-${Date.now()}`, raw: { mock: true } });
  else await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
  redirect(`/payment/status?order=${order.orderNo}`);
}
