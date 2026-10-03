import "server-only";
import { db } from "./db";
import { fulfilOrder } from "./orders";
import { CashfreeError, getCashfreeOrder, getCashfreePayments } from "./cashfree";

export type SyncResult = "PAID" | "PENDING" | "FAILED" | "MISMATCH" | "NOT_FOUND" | "ERROR";

// The only place a Cashfree order becomes PAID. Always asks Cashfree's API for the
// truth (never the browser redirect or webhook body) and checks the amount matches
// the total we computed from the database when the order was created.
export async function syncCashfreeOrder(orderNo: string): Promise<SyncResult> {
  const order = await db.order.findUnique({ where: { orderNo } });
  if (!order || order.gateway !== "cashfree") return "NOT_FOUND";
  if (order.status === "PAID") return "PAID";
  if (order.status === "REFUNDED") return "FAILED";

  let cf;
  try {
    cf = await getCashfreeOrder(orderNo);
  } catch (e) {
    if (e instanceof CashfreeError && e.status === 404) return "NOT_FOUND";
    return "ERROR";
  }

  if (cf.order_status === "PAID") {
    const paise = (rupees: number) => Math.round(rupees * 100);
    if (paise(cf.order_amount) !== paise(order.total) || cf.order_currency !== "INR") {
      console.error(`[payments] ${orderNo} amount mismatch: Cashfree ${cf.order_currency} ${cf.order_amount} vs order ₹${order.total}. Not unlocking.`);
      await db.order.update({ where: { id: order.id }, data: { gatewayRaw: { order: cf, flagged: "amount_mismatch" } } });
      return "MISMATCH";
    }
    const payments = await getCashfreePayments(orderNo).catch(() => []);
    const success = payments.find((p) => p.payment_status === "SUCCESS");
    await fulfilOrder(order.id, { txnId: success ? String(success.cf_payment_id) : cf.cf_order_id, raw: { order: cf, payment: success ?? null } });
    console.info(`[payments] ${orderNo} paid ₹${order.total} (cf_payment_id ${success?.cf_payment_id ?? "n/a"})`);
    return "PAID";
  }

  if (cf.order_status === "EXPIRED" || cf.order_status === "TERMINATED") {
    await db.order.updateMany({ where: { id: order.id, status: "PENDING" }, data: { status: "FAILED", gatewayRaw: { order: cf } } });
    return "FAILED";
  }

  // ACTIVE: no successful payment yet. A failed attempt can still be retried in the
  // same checkout, so only call it failed when the latest attempt failed or was dropped.
  const payments = await getCashfreePayments(orderNo).catch(() => []);
  const latest = payments.sort((a, b) => (b.payment_time ?? "").localeCompare(a.payment_time ?? ""))[0];
  if (latest && ["FAILED", "USER_DROPPED", "CANCELLED", "VOID"].includes(latest.payment_status)) {
    await db.order.updateMany({ where: { id: order.id, status: "PENDING" }, data: { status: "FAILED", gatewayRaw: { order: cf, payment: latest } } });
    return "FAILED";
  }
  return "PENDING";
}
