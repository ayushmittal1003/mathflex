import { headers } from "next/headers";

// The public site address, used for links that leave the app (payment return and webhook URLs, invites).
// APP_URL is easy to save blank or without its scheme ("mathflex.in"). A scheme-less or empty value would be
// treated as a relative path by Cashfree, so we add https:// and strip trailing slashes.
export function appUrl(): string {
  const raw = configured();
  if (!raw) return "http://localhost:3000";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

// APP_URL once got set to Cashfree's own API address, which sent shoppers to api.cashfree.com after paying.
function configured(): string {
  const raw = (process.env.APP_URL ?? "").trim().replace(/\/+$/, "");
  return /cashfree\.com/i.test(raw) ? "" : raw;
}

// Like appUrl(), but when APP_URL isn't set it uses the address the visitor is on, so production
// never sends localhost to a payment gateway.
export async function siteUrl(): Promise<string> {
  if (configured()) return appUrl();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return appUrl();
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
