"use client";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { cart } from "./cart-store";
import { track } from "@/lib/track";
import { metaTrack, purchaseEventId } from "@/lib/meta-pixel";

// `value` and `ids` report the sale to Meta once per order (the server sends the same event id, so Meta counts it once).
export function PaidCelebration({ orderNo, value, ids }: { orderNo?: string; value?: number; ids?: string[] }) {
  useEffect(() => {
    cart.clear(); // the purchase went through; the cart is kept until then so a failed payment can be retried
    // Shown again on every visit to this page, so reports count each order number once.
    if (orderNo) track("purchase", orderNo);
    if (orderNo && value) {
      let seen = false;
      try { seen = localStorage.getItem(`mf-meta-${orderNo}`) === "1"; localStorage.setItem(`mf-meta-${orderNo}`, "1"); } catch {}
      if (!seen) metaTrack("Purchase", { currency: "INR", value, content_ids: ids ?? [], content_type: "product", num_items: ids?.length ?? 0 }, purchaseEventId(orderNo));
    }
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.4 }, colors: ["#FF2E63", "#FF8A3D", "#FACC15", "#8B5CF6"], disableForReducedMotion: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per order
  }, [orderNo]);
  return null;
}
