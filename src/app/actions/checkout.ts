"use server";
import { siteUrl } from "@/lib/app-url";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { quoteCart, type Quote } from "@/lib/pricing";
import { createOrder, fulfilOrder, guestOrderToken, validGuestOrderToken } from "@/lib/orders";
import { isPlaceholderEmail } from "@/lib/format";
import { allow, clientIp } from "@/lib/rate-limit";
import { CashfreeError, cashfreeConfigured, cashfreeMode, createCashfreeOrder, type CashfreeMode } from "@/lib/cashfree";
import { syncCashfreeOrder } from "@/lib/payments";
import { mockPaymentsAllowed } from "@/lib/orders";
import { captureMetaMatch } from "@/lib/meta-capi";

const Items = z.array(z.object({ type: z.enum(["CHAPTER", "COURSE"]), id: z.string().min(1) })).max(50);

export async function getQuote(items: unknown, coupon: string | null, mentorship: boolean): Promise<Quote> {
  const user = await getCurrentUser();
  return quoteCart(Items.parse(items), { userId: user?.id, couponCode: coupon, mentorship });
}

export type PlaceOrderResult =
  | { ok: false; error: string; login?: boolean; needPhone?: boolean; needEmail?: boolean }
  | { ok: true; mode: "mock"; orderId: string; token?: string }
  | { ok: true; mode: "cashfree"; orderNo: string; paymentSessionId: string; env: CashfreeMode }
  | { ok: true; mode: "free"; orderNo: string };

const Phone = /^[6-9]\d{9}$/;
const Contact = z.object({ email: z.string().max(254).optional(), phone: z.string().max(20).optional() });

// The browser only sends item ids, a coupon code, the mentorship toggle and any contact details we
// don't have yet. Prices, discounts and the total are recomputed from the database in createOrder.
// No login is needed: once a guest's payment is confirmed, startGuestAccess gives them an account.
export async function placeOrder(items: unknown, coupon: string | null, mentorship: boolean, contactInput?: unknown): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();

  const cashfree = cashfreeConfigured();
  if (!cashfree && !mockPaymentsAllowed()) {
    console.error("[checkout] Cashfree keys missing (CASHFREE_APP_ID / CASHFREE_SECRET_KEY); refusing checkout");
    return { ok: false, error: "Online payments aren't available right now. Please try again shortly." };
  }

  const typed = Contact.safeParse(contactInput ?? {});
  const email = (user && !isPlaceholderEmail(user.email) ? user.email : (typed.data?.email ?? "")).trim().toLowerCase();
  if (!z.email().safeParse(email).success || isPlaceholderEmail(email)) return { ok: false, needEmail: true, error: "Enter your email address to pay." };

  // Cashfree requires a 10-digit mobile number; a signed-in student is asked once and it's remembered.
  const phone = Phone.test(user?.phone ?? "") ? user!.phone! : (typed.data?.phone ?? "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  if (!Phone.test(phone)) return { ok: false, needPhone: true, error: "Enter your 10-digit mobile number to pay." };
  if (user && user.phone !== phone) await db.user.update({ where: { id: user.id }, data: { phone } });
  const contactPhone = `+91${phone}`;

  if (!user) {
    if (!(await allow(`guest-checkout:ip:${await clientIp()}`, 20, 600))) return { ok: false, error: "Too many attempts. Please try again in a few minutes." };
    // They couldn't log in afterwards to reach what they paid for.
    if (await db.user.findFirst({ where: { isBlocked: true, OR: [{ email }, { verifiedPhone: contactPhone }] }, select: { id: true } })) {
      return { ok: false, error: "We couldn't start this order. Please contact support." };
    }
    // Typed details aren't proof of anyone, so a fully free order needs a real account behind it.
    const quote = await quoteCart(Items.parse(items), { couponCode: coupon, mentorship, contact: { email, phone: contactPhone } });
    if (quote.lines.length && quote.total === 0) return { ok: false, login: true, error: "Please log in to use this coupon." };
  }

  let order;
  try {
    order = await createOrder({ userId: user?.id ?? null, email, phone: contactPhone }, Items.parse(items), coupon, mentorship, cashfree ? "cashfree" : "mock");
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  // 100% coupon: nothing to charge.
  if (order.total === 0) {
    await fulfilOrder(order.id, { txnId: "FREE" });
    return { ok: true, mode: "free", orderNo: order.orderNo };
  }

  const token = user ? null : guestOrderToken(order.orderNo);

  if (cashfree) {
    const base = await siteUrl();
    console.info(`[checkout] return base for ${order.orderNo}: ${base}`);
    try {
      const { paymentSessionId, cfOrderId } = await createCashfreeOrder({
        orderNo: order.orderNo,
        amount: order.total,
        customer: { id: user?.id ?? `guest_${order.orderNo}`, phone, email, name: user?.name ?? "" },
        returnUrl: `${base}/api/payments/cashfree/return?order_id={order_id}${token ? `&t=${token}` : ""}`,
        // Cashfree only calls HTTPS webhooks, so local http dev skips it (the return check still runs).
        notifyUrl: base.startsWith("https://") ? `${base}/api/payments/cashfree/webhook` : null,
      });
      const metaMatch = await captureMetaMatch();
      await db.order.update({ where: { id: order.id }, data: { gatewayRaw: { cf_order_id: cfOrderId }, ...(metaMatch ? { metaMatch } : {}) } });
      console.info(`[checkout] ${order.orderNo} created for ₹${order.total} (${user ? `user ${user.id}` : "guest"})`);
      return { ok: true, mode: "cashfree", orderNo: order.orderNo, paymentSessionId, env: cashfreeMode() };
    } catch (e) {
      await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
      const msg = e instanceof CashfreeError && e.status === 400 ? e.message : "Couldn't start the payment. Please try again.";
      return { ok: false, error: msg };
    }
  }

  return { ok: true, mode: "mock", orderId: order.id, token: token ?? undefined };
}

// Polled by the payment status page while Cashfree confirms (UPI can take a moment).
export async function refreshPaymentStatus(orderNo: string, token?: string) {
  const user = await getCurrentUser();
  const order = await db.order.findUnique({ where: { orderNo }, select: { userId: true, status: true, gateway: true } });
  if (!order || !((user && order.userId === user.id) || validGuestOrderToken(orderNo, token))) return "NOT_FOUND";
  if (order.status !== "PENDING" || order.gateway !== "cashfree") return order.status;
  return syncCashfreeOrder(orderNo);
}

// Test-mode gateway for local development when Cashfree keys aren't set.
export async function completeMockPayment(orderId: string, succeed: boolean, token?: unknown) {
  const user = await getCurrentUser();
  if (!mockPaymentsAllowed() || cashfreeConfigured()) throw new Error("Not allowed");
  const order = await db.order.findFirstOrThrow({ where: { id: orderId, gateway: "mock", status: "PENDING" } });
  const guest = !order.userId && validGuestOrderToken(order.orderNo, token);
  if (!guest && (!user || order.userId !== user.id)) throw new Error("Not allowed");
  if (succeed) await fulfilOrder(order.id, { txnId: `MOCK-${Date.now()}`, raw: { mock: true } });
  else await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
  redirect(`/payment/status?order=${order.orderNo}${guest ? `&t=${token}` : ""}`);
}
