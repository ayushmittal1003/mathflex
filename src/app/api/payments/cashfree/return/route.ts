import { NextResponse } from "next/server";
import { appUrl } from "@/lib/app-url";
import { syncCashfreeOrder } from "@/lib/payments";

// Cashfree sends the shopper back here after checkout. Reaching this URL proves
// nothing, so we ask Cashfree's API for the order's real status before showing it.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const orderNo = params.get("order_id") ?? "";
  const token = params.get("t"); // a guest's link to their own order; the status page checks it
  const back = new URL(`/payment/status?order=${encodeURIComponent(orderNo)}${token ? `&t=${encodeURIComponent(token)}` : ""}`, /cashfree\.com/i.test(process.env.APP_URL ?? "") ? req.url : process.env.APP_URL?.trim() ? appUrl() : req.url);
  if (!/^MF[A-Z0-9]{6,30}$/.test(orderNo)) return NextResponse.redirect(new URL("/cart", back), 303);
  const result = await syncCashfreeOrder(orderNo);
  console.info(`[cashfree:return] ${orderNo} → ${result}`);
  return NextResponse.redirect(back, 303);
}
