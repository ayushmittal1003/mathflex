import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { LEAD_CLASS_LABEL, LEAD_GOAL_LABEL, LEAD_STATUS_LABEL, LEAD_TIME_LABEL } from "@/lib/leads";
import type { LeadStatus } from "@/generated/prisma/enums";

const when = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "");
// Quotes every cell, and stops a spreadsheet running a typed value such as "=..." as a formula.
const cell = (v: string | number | null | undefined) => {
  const s = String(v ?? "");
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

// Leads as a spreadsheet, with the same filter as the Leads page.
export async function GET(req: Request) {
  const me = await requireStaff("leads");
  const s = new URL(req.url).searchParams.get("status") ?? "";
  const status = s in LEAD_STATUS_LABEL ? (s as LeadStatus) : undefined;
  const leads = await db.lead.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: 10000 });
  const head = ["Received (IST)", "Channel", "Name", "Mobile", "Email", "Class", "Goal", "Weak areas", "Best time", "Status", "Notes", "First contacted (IST)", "Source", "Medium", "Campaign", "Ad", "Landing page"];
  const rows = leads.map((l) => [when(l.createdAt), l.channel === "meta_form" ? "Meta lead form" : "Website form", l.name, l.phone, l.email, LEAD_CLASS_LABEL[l.classLevel] ?? l.classLevel, LEAD_GOAL_LABEL[l.goal] ?? l.goal, l.weakAreas.join("; "), LEAD_TIME_LABEL[l.callTime] ?? l.callTime, LEAD_STATUS_LABEL[l.status], l.notes, when(l.contactedAt), l.utmSource, l.utmMedium, l.utmCampaign, l.utmContent, l.landingPath]);
  await audit(me, "lead.export", `Exported ${leads.length} leads to CSV`, { entity: "lead", meta: { status: status ?? "all" } });
  const csv = [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(`﻿${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="mathflex-leads.csv"`, "Cache-Control": "no-store" } });
}
