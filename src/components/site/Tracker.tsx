"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { startTracking, trackPageView } from "@/lib/track";

// Records a page view on every route change on the public site and the student app (not /admin).
export function Tracker() {
  const pathname = usePathname();
  useEffect(() => startTracking(), []);
  useEffect(() => { trackPageView(pathname); }, [pathname]);
  return null;
}
