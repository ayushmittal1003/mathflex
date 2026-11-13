"use server";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { allow, clientIp } from "@/lib/rate-limit";
import { captureMetaMatch, sendMetaLead } from "@/lib/meta-capi";
import { alertNewLead } from "@/lib/lead-alerts";
import { siteUrl } from "@/lib/app-url";

const Lead = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  phone: z.string().transform((v) => v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "")).pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number.")),
  email: z.email("Enter a valid email address.").max(254).transform((v) => v.trim().toLowerCase()),
  classLevel: z.enum(["11", "12", "DROPPER"]),
  goal: z.enum(["MAIN", "ADVANCED", "BOARDS"]),
  weakAreas: z.array(z.string().max(40)).max(10).default([]),
  callTime: z.enum(["MORNING", "AFTERNOON", "EVENING", ""]).default(""),
  message: z.string().max(500).default(""),
  consent: z.literal(true, { error: "Please allow us to call you." }),
  // Milliseconds from opening the form to sending it. People take several seconds over four
  // steps; scripts post instantly. (A hidden trap field was dropped: browser autofill filled it.)
  elapsedMs: z.number().int().nonnegative().max(86_400_000).optional(),
  source: z.object({
    utmSource: z.string().max(100).optional(),
    utmMedium: z.string().max(100).optional(),
    utmCampaign: z.string().max(150).optional(),
    utmContent: z.string().max(150).optional(),
    fbclid: z.string().max(500).optional(),
    landingPath: z.string().max(300).optional(),
  }).default({}),
});

export type EnquiryResult = { ok: true; leadId: string } | { ok: false; error: string; field?: string };

// Saves an enquiry as a lead for the team to call. The same number enquiring again within a day
// updates that lead instead of adding a duplicate.
export async function submitEnquiry(input: unknown): Promise<EnquiryResult> {
  const settings = await getSettings();
  if (!settings.enquiry.enabled) return { ok: false, error: "Enquiries are closed right now. Please WhatsApp us instead." };
  const parsed = Lead.safeParse(input);
  if (!parsed.success) {
    // Only our own messages reach the student; anything else gets a plain one.
    const issue = parsed.error.issues.find((i) => ["name", "phone", "email", "consent"].includes(String(i.path[0])));
    return issue ? { ok: false, error: issue.message, field: String(issue.path[0]) } : { ok: false, error: "Something went wrong. Please try again." };
  }
  const d = parsed.data;
  if (d.elapsedMs !== undefined && d.elapsedMs < 2500) return { ok: true, leadId: "ok" }; // quietly drop bots
  if (!(await allow(`enquiry:ip:${await clientIp()}`, 8, 3600))) return { ok: false, error: "Too many enquiries from this network. Please try again later or WhatsApp us." };

  const phone = `+91${d.phone}`;
  const [user, metaMatch] = await Promise.all([getCurrentUser(), captureMetaMatch()]);
  const data = {
    name: d.name,
    phone,
    email: d.email,
    classLevel: d.classLevel,
    goal: d.goal,
    weakAreas: d.weakAreas,
    callTime: d.callTime,
    message: d.message.trim(),
    ...d.source,
    ...(metaMatch ? { metaMatch } : {}),
    userId: user?.id ?? null,
  };
  const recent = await db.lead.findFirst({ where: { phone, createdAt: { gt: new Date(Date.now() - 86_400_000) } }, select: { id: true } });
  const lead = recent ? await db.lead.update({ where: { id: recent.id }, data }) : await db.lead.create({ data });
  if (!recent) {
    const base = await siteUrl();
    after(() => Promise.all([sendMetaLead(lead.id), alertNewLead(lead, base)]));
  }
  console.info(`[enquiry] lead ${lead.id} (${d.classLevel}, ${d.goal}) from ${d.source.utmSource ?? "direct"}`);
  return { ok: true, leadId: lead.id };
}
