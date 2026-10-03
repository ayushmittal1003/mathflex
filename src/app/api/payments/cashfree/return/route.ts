import { NextResponse } from "next/server";
import { syncCashfreeOrder } from "@/lib/payments";

// Cashfree sends the shopper back here after checkout. Reaching this URL proves
// nothing, so we ask Cashfree's API for the order's real status before showing it.
export async function GET(req: Request) {
  const orderNo = new URL(req.url).searchParams.get("order_id") ?? "";
  const back = new URL(`/payment/status?order=${encodeURIComponent(orderNo)}`, process.env.APP_URL ?? req.url);
  if (!/^MF[A-Z0-9]{6,30}$/.test(orderNo)) return NextResponse.redirect(new URL("/cart", back), 303);
  const result = await syncCashfreeOrder(orderNo);
  console.info(`[cashfree:return] ${orderNo} → ${result}`);
  return NextResponse.redirect(back, 303);
}
