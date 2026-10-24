"use client";
import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { CheckIcon } from "./primitives";

// Existing coupon backend (quote.coupon / quote.couponError); only the wording is tidied here.
export function couponMessage(error: string) {
  const min = error.match(/^Add (₹[\d,]+) more to use (.+)\.$/);
  return min ? `Minimum order not met. Add ${min[1]} more to use ${min[2]}.` : error;
}

// "Have a coupon?" expander: collapsed until tapped; stays open while a code is applied or being fixed.
export function CouponField({ applied, error, onApply, onRemove }: {
  applied: { code: string; message: string } | null;
  error: string | null;
  onApply: (code: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");

  if (applied) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-ok bg-ok/7 px-3 py-2.5">
        <CheckIcon className="size-4 shrink-0 text-ok-strong" strokeWidth={2.5} />
        <span className="flex-1 text-[13px]"><b className="font-mono">{applied.code}</b> applied · {applied.message}</span>
        <button type="button" onClick={() => { onRemove(); setCode(""); setOpen(false); }} aria-label={`Remove coupon ${applied.code}`} className="inline-flex min-h-11 items-center text-xs font-bold text-muted-foreground underline underline-offset-[3px]">Remove</button>
      </div>
    );
  }

  const expanded = open || !!error;
  return (
    <div>
      <button type="button" onClick={() => setOpen(!expanded)} aria-expanded={expanded} aria-controls="coupon-panel" className="inline-flex min-h-11 items-center text-sm font-bold text-primary">
        Have a coupon?
        <svg className={`ml-1.5 size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {expanded && (
        <div id="coupon-panel">
          <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) onApply(code.trim()); }} className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Coupon code"
              aria-label="Coupon code"
              aria-invalid={!!error}
              autoComplete="off"
              autoCapitalize="characters"
              className="h-12 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 font-mono text-base uppercase outline-none focus:border-ring"
            />
            <button type="submit" className="h-12 shrink-0 rounded-lg border border-foreground bg-card px-4 text-[13px] font-bold">Apply</button>
          </form>
          {error && <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-destructive"><CircleAlert className="mt-px size-3.5 shrink-0" />{couponMessage(error)}</p>}
        </div>
      )}
    </div>
  );
}
