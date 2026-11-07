import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "./db";
import { META_PIXEL_ID, leadEventId, purchaseEventId } from "./meta-pixel";

// Meta Conversions API: reports confirmed purchases from the server, so they count even when an
// ad blocker or iPhone privacy settings stop the browser pixel. Off until META_CAPI_TOKEN is set
// (Events Manager → the pixel → Settings → Conversions API → Generate access token).
// META_TEST_EVENT_CODE (from Events Manager → Test events) sends to the test view instead.
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v24.0";

export type MetaMatch = { fbp?: string; fbc?: string; ip?: string; ua?: string; url?: string };

const sha = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

// Called at checkout, in the buyer's own request: the browser details Meta uses to match the sale to an ad click.
export async function captureMetaMatch(): Promise<MetaMatch | undefined> {
  try {
    const [c, h] = await Promise.all([cookies(), headers()]);
    const m: MetaMatch = {
      fbp: c.get("_fbp")?.value?.slice(0, 200),
      fbc: c.get("_fbc")?.value?.slice(0, 300),
      ip: (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim().slice(0, 64) || undefined,
      ua: h.get("user-agent")?.slice(0, 400),
      url: h.get("referer")?.slice(0, 500),
    };
    return Object.values(m).some(Boolean) ? m : undefined;
  } catch {
    return undefined;
  }
}

// Sends one confirmed Cashfree order to Meta as a Purchase. Never throws: tracking must not affect payments.
export async function sendMetaPurchase(orderId: string) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return;
  try {
    const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.status !== "PAID") return;
    const match = (order.metaMatch ?? {}) as MetaMatch;
    const phone = order.contactPhone?.replace(/\D/g, "");
    const user_data: Record<string, unknown> = {
      ...(order.contactEmail ? { em: [sha(order.contactEmail)] } : {}),
      ...(phone ? { ph: [sha(phone)] } : {}),
      external_id: [sha(order.userId ?? `guest-${order.orderNo}`)],
      country: [sha("in")],
      ...(match.ip ? { client_ip_address: match.ip } : {}),
      ...(match.ua ? { client_user_agent: match.ua } : {}),
      ...(match.fbp ? { fbp: match.fbp } : {}),
      ...(match.fbc ? { fbc: match.fbc } : {}),
    };
    const contentIds = order.items.map((i) => i.itemId ?? "mentorship-call");
    const event = {
      event_name: "Purchase",
      event_time: Math.floor((order.paidAt ?? new Date()).getTime() / 1000),
      event_id: purchaseEventId(order.orderNo),
      action_source: "website",
      ...(match.url ? { event_source_url: match.url } : {}),
      user_data,
      custom_data: { currency: "INR", value: order.total, content_ids: contentIds, content_type: "product", num_items: order.items.length, order_id: order.orderNo },
    };
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [event], access_token: token, ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`[meta-capi] ${order.orderNo} purchase not accepted: ${res.status} ${(await res.text()).slice(0, 300)}`);
    else console.info(`[meta-capi] ${order.orderNo} purchase sent (₹${order.total})`);
  } catch (e) {
    console.error("[meta-capi] send failed:", (e as Error).message);
  }
}

// Sends one enquiry to Meta as a Lead (same event id as the browser's, so it is counted once).
export async function sendMetaLead(leadId: string) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return;
  try {
    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;
    const match = (lead.metaMatch ?? {}) as MetaMatch;
    const [first, ...rest] = lead.name.trim().toLowerCase().split(/\s+/);
    const event = {
      event_name: "Lead",
      event_time: Math.floor(lead.createdAt.getTime() / 1000),
      event_id: leadEventId(lead.id),
      action_source: "website",
      ...(match.url ? { event_source_url: match.url } : {}),
      user_data: {
        em: [sha(lead.email)],
        ph: [sha(lead.phone.replace(/\D/g, ""))],
        ...(first ? { fn: [sha(first)] } : {}),
        ...(rest.length ? { ln: [sha(rest[rest.length - 1])] } : {}),
        external_id: [sha(`lead-${lead.id}`)],
        country: [sha("in")],
        ...(match.ip ? { client_ip_address: match.ip } : {}),
        ...(match.ua ? { client_user_agent: match.ua } : {}),
        ...(match.fbp ? { fbp: match.fbp } : {}),
        // The _fbc cookie, or built from the ad click id on the landing URL (Meta's documented format).
        ...(match.fbc ? { fbc: match.fbc } : lead.fbclid ? { fbc: `fb.1.${lead.createdAt.getTime()}.${lead.fbclid}` } : {}),
      },
      custom_data: { content_name: "Enquiry form", content_category: lead.classLevel === "DROPPER" ? "dropper" : `class-${lead.classLevel}` },
    };
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [event], access_token: token, ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`[meta-capi] lead ${lead.id} not accepted: ${res.status} ${(await res.text()).slice(0, 300)}`);
  } catch (e) {
    console.error("[meta-capi] lead send failed:", (e as Error).message);
  }
}
