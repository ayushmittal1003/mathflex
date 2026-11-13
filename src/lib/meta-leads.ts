import "server-only";
import { db } from "./db";
import { siteUrl } from "./app-url";
import { alertNewLead } from "./lead-alerts";

// Reads one Instant Form lead from Meta and saves it as a lead (Admin → Leads). Used by the
// webhook at /api/meta/leads. Never throws.
const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v24.0"}`;
type MetaLead = { id: string; created_time?: string; field_data?: { name: string; values?: string[] }[]; ad_name?: string; adset_name?: string; campaign_name?: string; form_id?: string; platform?: string };

const field = (l: MetaLead, ...names: string[]) => {
  for (const n of names) {
    const v = l.field_data?.find((f) => f.name.toLowerCase() === n)?.values?.[0]?.trim();
    if (v) return v;
  }
  return "";
};

// "+91 98765 43210", "919876543210", "09876543210" → "+919876543210"; anything else keeps its digits.
const phoneOf = (raw: string) => {
  const d = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (/^[6-9]\d{9}$/.test(d)) return `+91${d}`;
  if (/^91[6-9]\d{9}$/.test(d)) return `+${d}`;
  return d ? `+${d}` : "";
};

// A tap-to-answer class question, if the form has one ("Class 11", "12th", "Dropper"...).
const classOf = (l: MetaLead) => {
  const q = l.field_data?.find((f) => /class|grade|standard/i.test(f.name))?.values?.[0] ?? "";
  if (/drop|repeat/i.test(q)) return "DROPPER";
  if (/12/.test(q)) return "12";
  if (/11/.test(q)) return "11";
  return "";
};

export async function saveMetaLead(leadgenId: string) {
  try {
    if (await db.lead.findUnique({ where: { externalId: leadgenId }, select: { id: true } })) return;
    const res = await fetch(`${GRAPH}/${leadgenId}?fields=created_time,field_data,ad_name,adset_name,campaign_name,form_id,platform&access_token=${encodeURIComponent(process.env.META_PAGE_TOKEN!)}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.error(`[meta-leads] ${leadgenId}: ${res.status} ${(await res.text()).slice(0, 300)}`);
      return;
    }
    const l = (await res.json()) as MetaLead;
    const name = field(l, "full_name") || [field(l, "first_name"), field(l, "last_name")].filter(Boolean).join(" ") || "Instagram lead";
    const phone = phoneOf(field(l, "phone_number", "phone"));
    const platform = l.platform === "ig" ? "ig" : l.platform === "fb" ? "fb" : l.platform || "meta";
    const lead = await db.lead.create({
      data: {
        name: name.slice(0, 80),
        phone,
        email: field(l, "email").toLowerCase().slice(0, 254),
        classLevel: classOf(l),
        goal: "",
        channel: "meta_form",
        externalId: leadgenId,
        utmSource: platform,
        utmMedium: "lead_form",
        utmCampaign: l.campaign_name?.slice(0, 150) ?? null,
        utmContent: l.ad_name?.slice(0, 150) ?? null,
        landingPath: `Instant Form ${l.form_id ?? ""}`.trim(),
        ...(l.created_time ? { createdAt: new Date(l.created_time) } : {}),
      },
    });
    console.info(`[meta-leads] saved ${leadgenId} as lead ${lead.id} (${platform})`);
    await alertNewLead(lead, await siteUrl());
  } catch (e) {
    // A duplicate externalId (two webhook calls at once) lands here too, harmlessly.
    console.error(`[meta-leads] ${leadgenId} not saved:`, (e as Error).message);
  }
}
