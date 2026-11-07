// Meta (Facebook) Pixel: shared by the browser pixel and the server Conversions API.
export const META_PIXEL_ID = "29207478038890403";

// The same id is sent by the browser and the server for one purchase, so Meta counts it once.
export const purchaseEventId = (orderNo: string) => `purchase-${orderNo}`;

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
