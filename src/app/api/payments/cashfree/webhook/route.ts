import { verifyCashfreeWebhook } from "@/lib/cashfree";
import { syncCashfreeOrder } from "@/lib/payments";

// Cashfree server-to-server notification (order_meta.notify_url). This is what still
// unlocks the purchase if the shopper closes the tab before returning to the site.
// The body is only used to learn the order id; the status is re-fetched from Cashfree.
export async function POST(req: Request) {
  const raw = await req.text(); // signature is over the exact raw body
  const ok = verifyCashfreeWebhook(raw, req.headers.get("x-webhook-timestamp"), req.headers.get("x-webhook-signature"));
  if (!ok) {
    console.warn("[cashfree:webhook] rejected: bad or missing signature");
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: { type?: string; data?: { order?: { order_id?: string } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const orderNo = event.data?.order?.order_id;
  if (!orderNo) {
    console.info(`[cashfree:webhook] ${event.type ?? "event"} without an order id; ignored`);
    return Response.json({ ok: true });
  }

  const result = await syncCashfreeOrder(orderNo);
  console.info(`[cashfree:webhook] ${event.type ?? "event"} ${orderNo} → ${result}`);
  // A temporary failure talking to Cashfree: ask them to retry the webhook later.
  if (result === "ERROR") return Response.json({ ok: false }, { status: 503 });
  return Response.json({ ok: true, result });
}
