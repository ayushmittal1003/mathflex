"use server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EVENT_URI, INVITEE_URI, calendlyEvent } from "@/lib/calendly";

async function ownBooking(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  return db.mentorshipBooking.findFirst({ where: { id, userId: user.id, status: { in: ["REQUESTED", "SUGGESTED"] } } });
}

// Called by the booking page when the Calendly embed reports a booking.
export async function recordCalendlyBooking(id: string, eventUri: unknown, inviteeUri: unknown) {
  const booking = await ownBooking(id);
  if (!booking || typeof eventUri !== "string" || !EVENT_URI.test(eventUri) || (inviteeUri && (typeof inviteeUri !== "string" || !INVITEE_URI.test(inviteeUri)))) return { ok: false };
  const ev = await calendlyEvent(eventUri);
  await db.mentorshipBooking.update({
    where: { id: booking.id },
    data: { status: "SCHEDULED", calendlyEvent: eventUri, ...(ev ? { scheduledAt: ev.start, meetLink: ev.meetLink } : {}) },
  });
  revalidatePath(`/book-call/${id}`);
  return { ok: true };
}

export type SuggestState = { ok?: boolean; error?: string } | undefined;

// None of the Calendly slots suit them: up to three times they could do, for the team to confirm.
export async function suggestCallTimes(_: SuggestState, form: FormData): Promise<SuggestState> {
  const booking = await ownBooking(String(form.get("id") ?? ""));
  if (!booking) return { error: "This call can't be changed. Contact support if you need help." };
  const now = Date.now();
  const times = form.getAll("time").map(String).filter(Boolean)
    // datetime-local has no zone; students are in India.
    .map((t) => new Date(`${t}:00+05:30`))
    .filter((d) => !Number.isNaN(d.getTime()) && d.getTime() > now + 3600_000 && d.getTime() < now + 90 * 86_400_000);
  if (!times.length) return { error: "Pick at least one time, at least an hour from now." };
  await db.mentorshipBooking.update({
    where: { id: booking.id },
    data: { status: "SUGGESTED", requestedTimes: times.slice(0, 3), requestNote: String(form.get("note") ?? "").trim().slice(0, 400) },
  });
  revalidatePath(`/book-call/${booking.id}`);
  return { ok: true };
}
