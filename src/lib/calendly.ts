import "server-only";

// Optional: with CALENDLY_API_TOKEN (a personal access token from Calendly → Integrations → API &
// webhooks) the site reads a booked call's time and Google Meet link and shows them to the student
// and the team. Without it, bookings are still recorded and Calendly emails the details.
export const EVENT_URI = /^https:\/\/api\.calendly\.com\/scheduled_events\/[A-Za-z0-9-]{8,64}$/;
export const INVITEE_URI = /^https:\/\/api\.calendly\.com\/scheduled_events\/[A-Za-z0-9-]{8,64}\/invitees\/[A-Za-z0-9-]{8,64}$/;

type CalendlyEvent = { start_time: string; status: string; location?: { join_url?: string } | null };

export async function calendlyEvent(uri: string): Promise<{ start: Date; meetLink: string | null; active: boolean } | null> {
  const token = process.env.CALENDLY_API_TOKEN?.trim();
  if (!token || !EVENT_URI.test(uri)) return null;
  try {
    const res = await fetch(uri, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return null;
    const { resource } = (await res.json()) as { resource: CalendlyEvent };
    return { start: new Date(resource.start_time), meetLink: resource.location?.join_url ?? null, active: resource.status === "active" };
  } catch {
    return null;
  }
}
