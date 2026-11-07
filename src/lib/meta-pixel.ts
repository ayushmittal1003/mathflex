// Meta (Facebook) Pixel: shared by the browser pixel and the server Conversions API.
// The "Mathflex" dataset owned by the MathFlex business portfolio (Events Manager → Datasets).
export const META_PIXEL_ID = "1117851897637769";

// The same id is sent by the browser and the server for one purchase, so Meta counts it once.
export const purchaseEventId = (orderNo: string) => `purchase-${orderNo}`;
export const leadEventId = (leadId: string) => `lead-${leadId}`;

type Fbq = (...args: unknown[]) => void;

// Sends a standard event from the browser. Does nothing if the pixel is blocked or not loaded.
export function metaTrack(event: string, data?: Record<string, unknown>, eventId?: string) {
  if (typeof window === "undefined") return;
  try {
    const fbq = (window as unknown as { fbq?: Fbq }).fbq;
    if (!fbq) return;
    if (eventId) fbq("track", event, data ?? {}, { eventID: eventId });
    else fbq("track", event, data ?? {});
  } catch {}
}
