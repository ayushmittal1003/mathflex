"use client";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { cart } from "./cart-store";
import { track } from "@/lib/track";

export function PaidCelebration({ orderNo }: { orderNo?: string }) {
  useEffect(() => {
    cart.clear(); // the purchase went through; the cart is kept until then so a failed payment can be retried
    // Shown again on every visit to this page, so reports count each order number once.
    if (orderNo) track("purchase", orderNo);
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.4 }, colors: ["#FF2E63", "#FF8A3D", "#FACC15", "#8B5CF6"], disableForReducedMotion: true });
  }, [orderNo]);
  return null;
}
