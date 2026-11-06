import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getMentorPrivate } from "@/lib/mentor-private";
import { accountContact, isPlaceholderEmail } from "@/lib/format";
import { Field, PageHeader, SubmitButton, Badge } from "@/components/admin/ui";
import { updateBooking } from "../actions";

export const metadata = { title: "Mentorship" };
const dt = (d: Date | null) => (d ? new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16) : "");
const when = (d: Date) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const LABEL: Record<string, [string, "gold" | "brand" | "ok" | "bad" | "muted"]> = {
  REQUESTED: ["Waiting for student to book", "muted"],
  SUGGESTED: ["Student suggested times", "gold"],
  SCHEDULED: ["Scheduled", "brand"],
  DONE: ["Done", "ok"],
  CANCELLED: ["Cancelled", "bad"],
};
const wa = (number: string, text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

// Paid 1:1 calls. Students book on Calendly (Meet link created and emailed by Calendly) or suggest
// times; for those, set the agreed time and a Meet link here. The buttons open WhatsApp or email
// with the message already written: one tap to alert Karan or send the student their link.
export default async function Mentorship() {
  await requireStaff("mentorship");
  const [bookings, settings, mentor] = await Promise.all([
    db.mentorshipBooking.findMany({ orderBy: [{ createdAt: "desc" }], include: { user: true }, take: 200 }),
    getSettings(),
    getMentorPrivate(),
  ]);
  const order = ["SUGGESTED", "SCHEDULED", "REQUESTED", "DONE", "CANCELLED"];
  bookings.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const site = process.env.APP_URL?.trim() || "https://mathflex.in";

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title="Mentorship calls"
        subtitle={settings.calendlyUrl ? "Paid 1:1 calls. Students pick a slot on Calendly after paying, or suggest times." : "Add the Calendly link in Settings → Mentorship upsell so students can pick a slot after paying."}
      />
      {bookings.map((b) => {
        const phone = b.user.phone ? `91${b.user.phone}` : null;
        const email = isPlaceholderEmail(b.user.email) ? null : b.user.email;
        const timeText = b.scheduledAt ? `${when(b.scheduledAt)} IST` : "";
        const studentMsg = b.meetLink && b.scheduledAt
          ? `Hi ${b.user.name}, your 1:1 call with ${settings.mentorName} is confirmed for ${timeText}. Join on Google Meet: ${b.meetLink}`
          : b.status === "SUGGESTED"
            ? `Hi ${b.user.name}, thanks for suggesting times for your 1:1 call with ${settings.mentorName}. We'll confirm one shortly and send you the Google Meet link.`
            : `Hi ${b.user.name}, thanks for booking a 1:1 call with ${settings.mentorName}. Pick a time here: ${site}/book-call/${b.id}`;
        const mentorMsg = b.status === "SUGGESTED"
          ? `New 1:1 call request from ${b.user.name} (${accountContact(b.user.email)}${b.user.phone ? `, ${b.user.phone}` : ""}). Suggested: ${b.requestedTimes.map(when).join(" / ")}.${b.requestNote ? ` Note: ${b.requestNote}` : ""}`
          : `1:1 call with ${b.user.name}${timeText ? ` on ${timeText}` : ""}.${b.meetLink ? ` Meet: ${b.meetLink}` : ""}`;
        const [label, tone] = LABEL[b.status] ?? [b.status, "muted"];
        return (
          <form key={b.id} action={updateBooking} className="card space-y-4 p-5">
            <input type="hidden" name="id" value={b.id} />
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/admin/students/${b.userId}`} className="font-bold hover:text-brand">{b.user.name}</Link>
              <span className="text-sm text-muted">{accountContact(b.user.email)}{b.user.phone ? ` · ${b.user.phone}` : ""}</span>
              <Badge tone={tone}>{label}</Badge>
              <span className="ml-auto text-xs text-muted">Paid {b.createdAt.toLocaleDateString("en-IN")}</span>
            </div>

            {b.status === "SUGGESTED" && (
              <div className="rounded-lg bg-surface-2 p-3 text-sm">
                <p className="font-semibold">Suggested times</p>
                <ul className="mt-1 list-disc pl-5">{b.requestedTimes.map((t) => <li key={t.toISOString()}>{when(t)} IST</li>)}</ul>
                {b.requestNote && <p className="mt-2 text-muted">“{b.requestNote}”</p>}
                <p className="mt-2 text-xs text-muted">Agree a time, create it in Google Calendar with “Add Google Meet video conferencing”, paste the time and link below, set Scheduled and save. Then send it to the student.</p>
              </div>
            )}
            {b.calendlyEvent && <p className="text-xs text-muted">Booked on Calendly{b.scheduledAt ? "" : ": the time and Meet link are in Karan's Calendly emails (add CALENDLY_API_TOKEN to show them here)"}.</p>}

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Status">
                <select name="status" defaultValue={b.status} className="input">
                  {Object.keys(LABEL).map((s) => <option key={s} value={s}>{LABEL[s][0]}</option>)}
                </select>
              </Field>
              <Field label="When (IST)"><input type="datetime-local" name="scheduledAt" defaultValue={dt(b.scheduledAt)} className="input" /></Field>
              <Field label="Google Meet link"><input name="meetLink" defaultValue={b.meetLink ?? ""} placeholder="https://meet.google.com/…" className="input" /></Field>
            </div>
            <Field label="Notes (team only)"><textarea name="notes" rows={2} defaultValue={b.notes} className="input" /></Field>
            <div className="flex flex-wrap items-center gap-2">
              <SubmitButton>Save</SubmitButton>
              {phone && <a className="btn btn-ghost !py-2 text-sm" href={wa(phone, studentMsg)} target="_blank" rel="noreferrer">Send to student on WhatsApp</a>}
              {email && <a className="btn btn-ghost !py-2 text-sm" href={`mailto:${email}?subject=${encodeURIComponent(`Your 1:1 call with ${settings.mentorName}`)}&body=${encodeURIComponent(studentMsg)}`}>Email student</a>}
              {mentor.whatsapp && <a className="btn btn-ghost !py-2 text-sm" href={wa(mentor.whatsapp, mentorMsg)} target="_blank" rel="noreferrer">Alert {settings.mentorName} on WhatsApp</a>}
            </div>
          </form>
        );
      })}
      {!bookings.length && <p className="card p-8 text-center text-muted">No mentorship bookings yet.</p>}
    </div>
  );
}
