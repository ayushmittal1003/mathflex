"use client";
import { useActionState, useEffect, useRef, startTransition } from "react";
import { saveCoupon, type CouponState } from "@/app/admin/actions";
import { Field, Toggle } from "./ui";

export type CouponValues = {
  id: string; code: string; type: "PERCENT" | "FLAT"; value: number; maxDiscount: number | null; minAmount: number;
  perUserLimit: number; usageLimit: number | null; startsAt: string; endsAt: string; description: string; isActive: boolean; isPublic: boolean;
};

// Submits without React's automatic form reset, so typed values survive a validation error.
export function CouponForm({ c }: { c: CouponValues | null }) {
  const [state, action, pending] = useActionState<CouponState, FormData>(saveCoupon, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !c) ref.current?.reset(); // clear the "new coupon" form after it's created
  }, [state, c]);
  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-4"
    >
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Code"><input name="code" defaultValue={c?.code} required className="input font-mono uppercase" /></Field>
        <Field label="Type"><select name="type" defaultValue={c?.type ?? "PERCENT"} className="input"><option value="PERCENT">Percent off</option><option value="FLAT">Flat ₹ off</option></select></Field>
        <Field label="Value" hint="% or ₹"><input name="value" type="number" min={1} defaultValue={c?.value ?? 10} required className="input" /></Field>
        <Field label="Max discount (₹)" hint="For percent coupons"><input name="maxDiscount" type="number" min={1} defaultValue={c?.maxDiscount ?? ""} className="input" /></Field>
        <Field label="Minimum order (₹)"><input name="minAmount" type="number" min={0} defaultValue={c?.minAmount ?? 0} className="input" /></Field>
        <Field label="Per-student limit"><input name="perUserLimit" type="number" min={1} defaultValue={c?.perUserLimit ?? 1} className="input" /></Field>
        <Field label="Total uses allowed" hint="Blank = unlimited"><input name="usageLimit" type="number" min={1} defaultValue={c?.usageLimit ?? ""} className="input" /></Field>
        <Field label="Starts (IST)"><input name="startsAt" type="datetime-local" defaultValue={c?.startsAt ?? ""} className="input" /></Field>
        <Field label="Ends (IST)"><input name="endsAt" type="datetime-local" defaultValue={c?.endsAt ?? ""} className="input" /></Field>
      </div>
      <Field label="Description" hint="Shown to students and FlexCare"><input name="description" defaultValue={c?.description} className="input" /></Field>
      <div className="grid gap-1 sm:grid-cols-2">
        <Toggle name="isActive" label="Active" defaultChecked={c?.isActive ?? true} />
        <Toggle name="isPublic" label="Public" hint="FlexCare can tell students about it" defaultChecked={c?.isPublic} />
      </div>
      {state?.error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad">{state.error}</p>}
      {state?.ok && <p className="rounded-xl bg-ok/10 px-3 py-2 text-sm font-medium text-ok">{state.ok}</p>}
      <button disabled={pending} className="btn btn-primary !py-2 text-sm">{pending ? "Saving…" : c ? "Save coupon" : "Create coupon"}</button>
    </form>
  );
}
