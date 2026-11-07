"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { META_PIXEL_ID as PIXEL_ID } from "@/lib/meta-pixel";

// Meta (Facebook) Pixel for ad tracking. Loaded only on the student-facing site, never in /admin.
const snippet = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`;

declare global {
  interface Window { fbq?: (...args: unknown[]) => void }
}

// The snippet sends the first PageView. Next.js changes pages without a full reload, so later
// page changes are sent from here. The last path is kept at module level so React's double
// effects in development don't send twice.
let lastPath: string | null = null;

export function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (lastPath === null) { lastPath = pathname; return; }
    if (pathname === lastPath) return;
    lastPath = pathname;
    window.fbq?.("track", "PageView");
  }, [pathname]);

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">{snippet}</Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}
