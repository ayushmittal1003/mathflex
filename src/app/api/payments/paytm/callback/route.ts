import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchOrderStatus, verifyCallback } from "@/lib/paytm";
import { fulfilOrder } from "@/lib/orders";

// Paytm POSTs the transaction result here (form-encoded) and the browser follows our redirect.
export async function POST(req: Request) {
  const form = await req.formData();
  const fields = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const orderNo = fields.ORDERID;
  const back = (status: string) => NextResponse.redirect(new URL(`/payment/status?order=${encodeURIComponent(orderNo ?? "")}&s=${status}`, process.env.APP_URL), 303);

  if (!orderNo || !verifyCallback(fields)) return back("invalid");
  const order = await db.order.findUnique({ where: { orderNo } });
  if (!order) return back("invalid");

  // Never trust the callback alone: confirm with Paytm's order status API.
  const status = await fetchOrderStatus(orderNo);
  if (status.status === "TXN_SUCCESS" && Math.round(status.amount) === order.total) {
    await fulfilOrder(order.id, { txnId: status.txnId, raw: status.raw });
  } else if (status.status === "TXN_FAILURE") {
    await db.order.update({ where: { id: order.id }, data: { status: "FAILED", gatewayRaw: status.raw } });
  }
  return back(status.status ?? "unknown");
}
