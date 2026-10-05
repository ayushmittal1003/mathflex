"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { refreshPaymentStatus } from "@/app/actions/checkout";

// While an order is still processing, ask the server (which asks Cashfree) every few
// seconds for up to two minutes, then re-render the page once it settles.
export function PaymentPoller({ orderNo }: { orderNo: string }) {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    let stopped = false;
    const t = setInterval(async () => {
      if (stopped) return;
      tries++;
      const status = await refreshPaymentStatus(orderNo).catch(() => "ERROR");
      if (status !== "PENDING" && status !== "ERROR") {
        stopped = true;
        clearInterval(t);
        router.refresh();
      } else if (tries >= 30) {
        clearInterval(t);
      }
    }, 4000);
    return () => clearInterval(t);
  }, [orderNo, router]);
  return null;
}
