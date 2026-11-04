import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { startGuestAccess, validGuestOrderToken } from "@/lib/orders";

// The status page sends a guest here once Cashfree has confirmed their payment, because a page can't
// set the login cookie. startGuestAccess only ever works once per order.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const orderNo = params.get("order") ?? "";
  const token = params.get("t") ?? "";
  const status = `/payment/status?order=${encodeURIComponent(orderNo)}`;
  if (!validGuestOrderToken(orderNo, token)) return NextResponse.redirect(new URL(status, req.url), 303);
  const user = await startGuestAccess(orderNo);
  if (!user) return NextResponse.redirect(new URL(`${status}&t=${encodeURIComponent(token)}&manual=1`, req.url), 303);
  await createSession(user.id, user.role);
  return NextResponse.redirect(new URL(status, req.url), 303);
}
