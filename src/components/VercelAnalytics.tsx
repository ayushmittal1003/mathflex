"use client";
import { Analytics } from "@vercel/analytics/next";

// Vercel Web Analytics (page views; custom events need a paid plan). Admin pages are left out.
export function VercelAnalytics() {
  return <Analytics beforeSend={(e) => (new URL(e.url).pathname.startsWith("/admin") ? null : e)} />;
}
