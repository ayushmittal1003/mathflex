import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { isPlaceholderEmail } from "@/lib/format";
import { instructorNames, mentorshipCall } from "@/lib/site-content";
import { Eyebrow } from "@/components/site/web/primitives";
import { CallBooker } from "@/components/site/web/CallBooker";
import { button, container, cx, tone } from "@/components/site/web/ui";
import { privateMetadata } from "@/lib/seo/metadata";

export const metadata = privateMetadata("Book your 1:1 call");

const when = (d: Date) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

// After paying for a 1:1 call: pick a slot on Karan's Calendly (which creates the Google Meet link
// and emails it) or suggest times. Only the student who bought the call can open this page.
export default async function BookCall({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/book-call/${id}`);
  const [booking, settings] = await Promise.all([db.mentorshipBooking.findFirst({ where: { id, userId: user.id } }), getSettings()]);
  if (!booking) notFound();
  const mentor = instructorNames(settings).short;

  return (
    <div className={cx(container.text, "pb-24 pt-[calc(86px+28px)]")}>
      <div className="text-center">
        <Eyebrow dot="ok">Your 1:1 call</Eyebrow>
        <h1 className="mx-auto mt-5 max-w-[760px] text-[clamp(30px,5vw,56px)] font-extrabold leading-[1.08] tracking-[-0.04em] text-balance">
          {booking.status === "SCHEDULED" ? `Your call with ${mentor} is booked` : booking.status === "SUGGESTED" ? "We've got your times" : booking.status === "DONE" ? "Call completed" : `Pick a time to talk with ${mentor}`}
        </h1>
        <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-[1.55] text-secondary-foreground">{mentorshipCall.minutes}-minute call on Google Meet. {mentorshipCall.pitch}</p>
      </div>

      <div className="mt-10">
        {booking.status === "SCHEDULED" ? (
          <div className="mx-auto max-w-[560px] rounded-xl border border-border bg-card p-6 text-center">
            <div className="text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">When</div>
            <div className="mt-1 text-2xl font-extrabold tracking-[-0.02em]">{booking.scheduledAt ? `${when(booking.scheduledAt)} IST` : "See the confirmation email from Calendly"}</div>
            {booking.meetLink ? (
              <a href={booking.meetLink} target="_blank" rel="noreferrer" className={cx(button.lg, tone.primary, "mt-5")}>Join on Google Meet</a>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">The Google Meet link is in your confirmation email{booking.calendlyEvent ? " from Calendly" : ""}, and we&apos;ll share it on WhatsApp too.</p>
            )}
          </div>
        ) : booking.status === "SUGGESTED" ? (
          <div className="mx-auto max-w-[560px] rounded-xl border border-border bg-card p-6">
            <p className="text-[15px] text-secondary-foreground">The team will confirm one of these and send the Google Meet link on WhatsApp and email:</p>
            <ul className="mt-3 grid gap-2 text-[15px] font-bold">{booking.requestedTimes.map((t) => <li key={t.toISOString()}>{when(t)} IST</li>)}</ul>
          </div>
        ) : booking.status === "DONE" || booking.status === "CANCELLED" ? (
          <p className="text-center text-secondary-foreground">{booking.status === "DONE" ? "Hope it helped!" : "This call was cancelled."} <Link href="/book-a-call" className="font-bold text-primary">Book another call</Link></p>
        ) : settings.calendlyUrl.startsWith("https://calendly.com/") ? (
          <CallBooker bookingId={booking.id} calendlyUrl={settings.calendlyUrl} name={user.name} email={isPlaceholderEmail(user.email) ? "" : user.email} />
        ) : (
          <p className="mx-auto max-w-[560px] rounded-xl border border-border bg-card p-6 text-center text-secondary-foreground">{mentorshipCall.contactNote}</p>
        )}
      </div>
    </div>
  );
}
