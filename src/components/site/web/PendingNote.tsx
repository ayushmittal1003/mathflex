"use client";
import { useEffect, useState } from "react";

// Under "Confirming your payment": after the poller's two minutes are up, say so plainly so
// nobody pays twice while a bank confirmation is slow.
export function PendingNote() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 120_000);
    return () => clearTimeout(t);
  }, []);
  return slow ? (
    <p role="status" className="mt-3 rounded-lg bg-gold/15 px-4.5 py-3.5 text-left text-[13px] leading-[1.55] text-foreground">
      <b>This is taking longer than usual.</b> Some banks are slow to confirm. Please don&apos;t pay again: tap “Check status now” in a few minutes. If money was taken and the order still doesn&apos;t confirm, contact support with your order ID and we&apos;ll sort it out.
    </p>
  ) : (
    <p className="mt-0 rounded-b-xl px-4.5 py-3.5 text-left text-[13px] leading-[1.5] text-secondary-foreground">Most payments confirm within 2 minutes.</p>
  );
}
