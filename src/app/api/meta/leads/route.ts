import { createHmac, timingSafeEqual } from "node:crypto";
import { after, type NextRequest, NextResponse } from "next/server";
import { saveMetaLead } from "@/lib/meta-leads";

// Meta Lead Ads webhook: every Instagram/Facebook Instant Form submission lands in Admin → Leads.
// Setup (Meta app → Webhooks → Page → "leadgen"):
//   META_LEADS_VERIFY_TOKEN  any secret phrase, also typed into Meta's "Verify token" box
//   META_APP_SECRET          the Meta app's App secret (proves each call really comes from Meta)
//   META_PAGE_TOKEN          a long-lived Page access token with leads_retrieval, to read each lead

// Meta checks the address once when the webhook is added.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const token = process.env.META_LEADS_VERIFY_TOKEN;
  if (token && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === token) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

type Change = { field?: string; value?: { leadgen_id?: string; form_id?: string; ad_id?: string; page_id?: string } };
type Payload = { object?: string; entry?: { changes?: Change[] }[] };

export async function POST(req: NextRequest) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !process.env.META_PAGE_TOKEN) return NextResponse.json({ message: "Lead webhook is not configured" }, { status: 500 });
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const expected = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return NextResponse.json({ message: "Bad signature" }, { status: 401 });
  }
  let body: Payload;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ message: "Bad request" }, { status: 400 }); }
  const ids = (body.entry ?? []).flatMap((e) => e.changes ?? []).filter((c) => c.field === "leadgen" && c.value?.leadgen_id).map((c) => c.value!.leadgen_id!);
  // Answer Meta straight away; reading and saving each lead happens just after.
  if (ids.length) after(() => Promise.all(ids.map(saveMetaLead)));
  return NextResponse.json({ received: ids.length });
}
