import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { Field, PageHeader, SubmitButton, Badge } from "@/components/admin/ui";
import { updateBooking } from "../actions";

export const metadata = { title: "Mentorship" };
const dt = (d: Date | null) => (d ? new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16) : "");

export default async function Mentorship() {
  await requireStaff("mentorship");
  const bookings = await db.mentorshipBooking.findMany({ orderBy: [{ status: "desc" }, { createdAt: "desc" }], include: { user: true } });
  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="Mentorship calls" subtitle="Paid 1:1 calls. Schedule them and share the meeting link — the student sees it in their profile." />
      {bookings.map((b) => (
        <form key={b.id} action={updateBooking} className="card space-y-4 p-5">
          <input type="hidden" name="id" value={b.id} />
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/admin/students/${b.userId}`} className="font-bold hover:text-brand">{b.user.name}</Link>
            <span className="text-sm text-muted">{b.user.email}{b.user.phone ? ` · ${b.user.phone}` : ""}</span>
            <Badge tone={b.status === "REQUESTED" ? "gold" : b.status === "DONE" ? "ok" : "brand"}>{b.status}</Badge>
            {b.user.phone && <a className="ml-auto text-sm font-bold text-ok" href={`https://wa.me/91${b.user.phone}`} target="_blank">WhatsApp →</a>}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Status">
              <select name="status" defaultValue={b.status} className="input">
                {["REQUESTED", "SCHEDULED", "DONE", "CANCELLED"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="When (IST)"><input type="datetime-local" name="scheduledAt" defaultValue={dt(b.scheduledAt)} className="input" /></Field>
            <Field label="Meeting link"><input name="meetLink" defaultValue={b.meetLink ?? ""} placeholder="https://meet.google.com/…" className="input" /></Field>
          </div>
          <Field label="Notes"><textarea name="notes" rows={2} defaultValue={b.notes} className="input" /></Field>
          <SubmitButton>Save</SubmitButton>
        </form>
      ))}
      {!bookings.length && <p className="card p-8 text-center text-muted">No mentorship bookings yet.</p>}
    </div>
  );
}
