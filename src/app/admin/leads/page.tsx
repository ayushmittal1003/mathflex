import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/app-url";
import { requestNow } from "@/lib/time";
import { LEAD_CLASS_LABEL, LEAD_GOAL_LABEL, LEAD_STATUS_LABEL, LEAD_TIME_LABEL } from "@/lib/leads";
import { instructorNames } from "@/lib/site-content";
import { Badge, Card, Field, PageHeader, Stat, SubmitButton, Toggle } from "@/components/admin/ui";
import type { LeadStatus } from "@/generated/prisma/enums";
import { saveEnquirySettings, updateLead } from "../actions";

export const metadata = { title: "Leads" };

const TONE: Record<LeadStatus, "gold" | "brand" | "ok" | "bad" | "muted"> = { NEW: "gold", CONTACTED: "brand", INTERESTED: "brand", CONVERTED: "ok", NOT_INTERESTED: "muted" };
const when = (d: Date) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const ago = (d: Date, now: number) => {
  const m = Math.round((now - d.getTime()) / 60000);
  return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

// Enquiries from /enquiry (mostly ads): call them back, note what happened, export for the sales sheet.
export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; saved?: string }> }) {
  await requireStaff("leads");
  const { status: rawStatus, q = "", saved } = await searchParams;
  const status = rawStatus && rawStatus in LEAD_STATUS_LABEL ? (rawStatus as LeadStatus) : undefined;
  const [settings, base] = await Promise.all([getSettings(), siteUrl()]);
  const now = requestNow();
  const where = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q.replace(/\D/g, "") || q } }, { email: { contains: q, mode: "insensitive" as const } }, { utmCampaign: { contains: q, mode: "insensitive" as const } }] } : {}),
  };
  const [leads, counts, today] = await Promise.all([
    db.lead.findMany({ where, orderBy: [{ createdAt: "desc" }], take: 200 }),
    db.lead.groupBy({ by: ["status"], _count: true }),
    db.lead.count({ where: { createdAt: { gte: new Date(now - 86_400_000) } } }),
  ]);
  const count = (s: LeadStatus) => counts.find((c) => c.status === s)?._count ?? 0;
  const total = counts.reduce((a, c) => a + c._count, 0);
  const converted = count("CONVERTED");
  const mentor = instructorNames(settings).short;
  const e = settings.enquiry;
  const link = `${base}/enquiry`;

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Leads & enquiries"
        subtitle="People who filled the enquiry form. Call them, then set the status so the team knows where each one stands."
        action={<a href={`/admin/leads/export${status ? `?status=${status}` : ""}`} className="rounded-xl border border-border px-3.5 py-2 text-sm font-semibold hover:bg-surface-2">Export CSV</a>}
      />
      {saved && <p className="rounded-xl bg-ok/10 p-3 text-sm font-semibold text-ok">Saved. The enquiry page is updated.</p>}

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="New, not called yet" value={String(count("NEW"))} sub="Call these first" />
        <Stat label="Last 24 hours" value={String(today)} />
        <Stat label="Interested" value={String(count("INTERESTED"))} />
        <Stat label="Bought" value={String(converted)} sub={total ? `${Math.round((converted / total) * 100)}% of ${total} leads` : undefined} />
      </div>

      <Card title="Your ad link" action={<Link href="/enquiry" target="_blank" className="text-sm font-semibold text-brand">Open the form ↗</Link>}>
        <p className="text-sm">Use this as the website link in your Meta ads. Add tags to see which ad each lead came from:</p>
        <code className="mt-2 block break-all rounded-lg bg-surface-2 p-3 text-xs">{link}?utm_source=meta&amp;utm_medium=paid&amp;utm_campaign=your-campaign-name</code>
        <p className="mt-2 text-xs text-muted">Each form sent also reaches Meta as a <b>Lead</b>, so you can pick “Leads” as the ad goal.{!e.enabled && " The form is switched off below, so visitors see a WhatsApp button instead."}</p>
      </Card>

      <form className="flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, mobile, email or campaign" className="input max-w-xs" />
        {status && <input type="hidden" name="status" value={status} />}
        <button className="rounded-xl bg-foreground px-3.5 py-2 text-sm font-semibold text-background">Search</button>
        <div className="flex flex-wrap gap-1.5">
          <Link href={`/admin/leads${q ? `?q=${encodeURIComponent(q)}` : ""}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!status ? "bg-foreground text-background" : "bg-surface-2"}`}>All {total}</Link>
          {(Object.keys(LEAD_STATUS_LABEL) as LeadStatus[]).map((s) => (
            <Link key={s} href={`/admin/leads?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status === s ? "bg-foreground text-background" : "bg-surface-2"}`}>
              {LEAD_STATUS_LABEL[s]} {count(s)}
            </Link>
          ))}
        </div>
      </form>

      {leads.length === 0 ? (
        <Card><p className="py-6 text-center text-sm text-muted">{total ? "No leads match this filter." : "No enquiries yet. They'll appear here as soon as someone fills the form."}</p></Card>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => {
            const digits = l.phone.replace(/\D/g, "");
            const first = l.name.trim().split(/\s+/)[0];
            const wa = `Hi ${first}, this is the Mathflex team. Thanks for your enquiry! ${mentor} has a few ideas for your ${LEAD_GOAL_LABEL[l.goal] ?? "JEE"} prep${l.weakAreas.length && l.weakAreas[0] !== "Not sure yet" ? `, especially ${l.weakAreas.slice(0, 2).join(" and ")}` : ""}. Is now a good time for a quick call?`;
            const mail = `mailto:${l.email}?subject=${encodeURIComponent("Your Mathflex enquiry")}&body=${encodeURIComponent(`Hi ${first},\n\nThanks for your enquiry. We tried calling you about your JEE maths plan. When is a good time to talk?\n\nTeam Mathflex`)}`;
            return (
              <div key={l.id} className={`rounded-2xl border bg-card p-4 ${l.status === "NEW" ? "border-gold/60" : "border-border"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold">{l.name}</span>
                      <Badge tone={TONE[l.status]}>{LEAD_STATUS_LABEL[l.status]}</Badge>
                      {l.userId && <Badge tone="brand">Has an account</Badge>}
                    </div>
                    <p className="mt-1 text-sm">{l.phone} · {l.email}</p>
                    <p className="mt-1 text-xs text-muted">
                      {LEAD_CLASS_LABEL[l.classLevel] ?? l.classLevel} · {LEAD_GOAL_LABEL[l.goal] ?? l.goal} · Call: {LEAD_TIME_LABEL[l.callTime] ?? "Any time"}
                    </p>
                    {l.weakAreas.length > 0 && <p className="mt-1 text-xs"><span className="text-muted">Weak areas:</span> {l.weakAreas.join(", ")}</p>}
                    <p className="mt-1 text-xs text-muted">
                      {when(l.createdAt)} ({ago(l.createdAt, now)}){l.utmSource || l.utmCampaign ? ` · from ${[l.utmSource, l.utmCampaign, l.utmContent].filter(Boolean).join(" / ")}` : l.fbclid ? " · from a Meta ad" : " · direct"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={`tel:${l.phone}`} className="rounded-xl bg-foreground px-3.5 py-2 text-sm font-semibold text-background">Call</a>
                    <a href={`https://wa.me/${digits}?text=${encodeURIComponent(wa)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-ok/15 px-3.5 py-2 text-sm font-semibold text-ok">WhatsApp</a>
                    <a href={mail} className="rounded-xl border border-border px-3.5 py-2 text-sm font-semibold">Email</a>
                  </div>
                </div>
                <form action={updateLead.bind(null, l.id)} className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
                  <select name="status" defaultValue={l.status} className="input w-auto">
                    {(Object.keys(LEAD_STATUS_LABEL) as LeadStatus[]).map((s) => <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>)}
                  </select>
                  <input name="notes" defaultValue={l.notes} placeholder="Call notes, e.g. wants Class 12 combo, call back Sunday" className="input min-w-[220px] flex-1" />
                  <SubmitButton>Save</SubmitButton>
                </form>
              </div>
            );
          })}
        </div>
      )}

      <form action={saveEnquirySettings}>
        <Card title="Enquiry page" action={<SubmitButton>Save page</SubmitButton>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Toggle name="enabled" label="Enquiry form is live" hint="Off: the page shows a WhatsApp button instead" defaultChecked={e.enabled} />
            <Field label="Small label"><input name="eyebrow" defaultValue={e.eyebrow} className="input" /></Field>
            <Field label="Heading" hint="Wrap words in *stars* to highlight them" className="sm:col-span-2"><input name="title" defaultValue={e.title} className="input" /></Field>
            <Field label="Line under the heading" className="sm:col-span-2"><textarea name="subtitle" rows={2} defaultValue={e.subtitle} className="input" /></Field>
            <Field label="Promise after sending" hint="Shown on the thank-you screen, e.g. “We'll call you within 24 hours”" className="sm:col-span-2"><input name="promise" defaultValue={e.promise} className="input" /></Field>
          </div>
        </Card>
      </form>
    </div>
  );
}
