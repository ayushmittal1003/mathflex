"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshPaymentStatus } from "@/app/actions/checkout";
import { button, cx, tone } from "./ui";

// Same server action PaymentPoller uses (it asks Cashfree), triggered on demand.
export function CheckStatusNow({ orderNo, token }: { orderNo: string; token?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await refreshPaymentStatus(orderNo, token).catch(() => null); router.refresh(); })}
      className={cx(button.md, tone.dark)}
    >
      {pending ? "Checking…" : "Check status now"}
    </button>
  );
}
