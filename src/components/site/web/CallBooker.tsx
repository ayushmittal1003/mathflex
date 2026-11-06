"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { recordCalendlyBooking, suggestCallTimes, type SuggestState } from "@/app/actions/mentorship";
import { button, cx, tone } from "./ui";

// Karan's Calendly, embedded. When the student books, Calendly tells this page (postMessage) and the
// booking is saved on their account. "None of these work?" opens a form to suggest times instead.
export function CallBooker({ bookingId, calendlyUrl, name, email }: { bookingId: string; calendlyUrl: string; name: string; email: string }) {
  const [booked, setBooked] = useState(false);
  const [suggest, setSuggest] = useState(false);
  const saved = useRef(false);
  const [state, action, pending] = useActionState<SuggestState, FormData>(suggestCallTimes, undefined);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== "https://calendly.com" || e.data?.event !== "calendly.event_scheduled" || saved.current) return;
      saved.current = true;
      setBooked(true);
      const p = e.data.payload ?? {};
      void recordCalendlyBooking(bookingId, p.event?.uri, p.invitee?.uri).finally(() => window.location.reload());
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [bookingId]);

  const src = (() => {
    const u = new URL(calendlyUrl);
    u.searchParams.set("embed_domain", typeof window === "undefined" ? "mathflex.in" : window.location.hostname);
    u.searchParams.set("embed_type", "Inline");
    u.searchParams.set("hide_gdpr_banner", "1");
    u.searchParams.set("name", name);
    if (email) u.searchParams.set("email", email);
    u.searchParams.set("utm_content", bookingId);
    return u.toString();
  })();

  if (state?.ok) {
    return <p role="status" className="rounded-xl bg-ok/12 p-5 text-[15px] font-semibold text-ok-strong">Thanks! Karan&apos;s team will confirm one of your times and send you the Google Meet link on WhatsApp and email.</p>;
  }
  return (
    <div>
      {!suggest && (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {booked && <p role="status" className="bg-ok/12 px-4 py-3 text-sm font-bold text-ok-strong">Booked! Saving it to your account…</p>}
            <iframe title="Pick a time for your 1:1 call" src={src} className="h-[min(820px,85dvh)] w-full" />
          </div>
          <button type="button" onClick={() => setSuggest(true)} className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-[3px]">None of these times work? Suggest your own</button>
        </>
      )}
      {suggest && (
        <form action={action} className="grid gap-4 rounded-xl border border-border bg-card p-5">
          <input type="hidden" name="id" value={bookingId} />
          <p className="text-[15px] text-secondary-foreground">Give up to three times that suit you (Indian time). The team will confirm one and send the Google Meet link.</p>
          {[1, 2, 3].map((n) => (
            <label key={n} className="grid gap-1.5 text-sm font-bold">
              Option {n}{n > 1 && <span className="font-normal text-muted-foreground"> (optional)</span>}
              <input type="datetime-local" name="time" required={n === 1} className="h-12 rounded-lg border border-input bg-card px-3.5 text-base" />
            </label>
          ))}
          <label className="grid gap-1.5 text-sm font-bold">
            Anything Karan should know? <span className="font-normal text-muted-foreground">(optional)</span>
            <textarea name="note" rows={3} maxLength={400} className="rounded-lg border border-input bg-card px-3.5 py-2.5 text-base" placeholder="e.g. weak chapters, your target exam" />
          </label>
          {state?.error && <p role="alert" className="text-sm font-semibold text-bad">{state.error}</p>}
          <div className="flex flex-wrap gap-2">
            <button disabled={pending} className={cx(button.md, tone.primary)}>{pending ? "Sending…" : "Send my times"}</button>
            <button type="button" onClick={() => setSuggest(false)} className={cx(button.md, tone.secondary)}>Back to available slots</button>
          </div>
        </form>
      )}
    </div>
  );
}
