import { ChevronDown } from "lucide-react";
import { db } from "@/lib/db";
import { Card, Field, PageHeader, Toggle, SubmitButton, Badge } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { saveCoupon, deleteCoupon } from "../actions";
import type { Coupon } from "@/generated/prisma/client";

export const metadata = { title: "Coupons" };

const dt = (d: Date | null) => (d ? new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16) : "");

export default async function Coupons() {
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="Coupons" subtitle="Percent or flat discounts, with limits and schedules. Public coupons are shown by FlexCare." />
      {coupons.map((c) => (
        <details key={c.id} className="card group overflow-hidden">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4">
            <span className="rounded-lg bg-surface-2 px-2.5 py-1 font-mono font-bold">{c.code}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{c.type === "PERCENT" ? `${c.value}% off` : `₹${c.value} off`}{c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ""}{c.minAmount ? ` · min ₹${c.minAmount}` : ""}</span>
            <span className="text-xs text-muted">{c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ""} used</span>
            {c.isActive ? <Badge tone="ok">Active</Badge> : <Badge>Off</Badge>}
            {c.isPublic && <Badge tone="brand">Public</Badge>}
            <ChevronDown className="size-5 transition group-open:rotate-180" />
          </summary>
          <div className="border-t border-border p-4">
            <CouponForm c={c} />
            <div className="mt-3"><ConfirmButton action={deleteCoupon.bind(null, c.id)} message={`Delete ${c.code}?`}>Delete</ConfirmButton></div>
          </div>
        </details>
      ))}
      <Card title="New coupon"><CouponForm c={null} /></Card>
    </div>
  );
}

function CouponForm({ c }: { c: Coupon | null }) {
  return (
    <form action={saveCoupon} className="space-y-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Code"><input name="code" defaultValue={c?.code} required className="input font-mono uppercase" /></Field>
        <Field label="Type"><select name="type" defaultValue={c?.type ?? "PERCENT"} className="input"><option value="PERCENT">Percent off</option><option value="FLAT">Flat ₹ off</option></select></Field>
        <Field label="Value" hint="% or ₹"><input name="value" type="number" min={0} defaultValue={c?.value ?? 10} required className="input" /></Field>
        <Field label="Max discount (₹)" hint="For percent coupons"><input name="maxDiscount" type="number" defaultValue={c?.maxDiscount ?? ""} className="input" /></Field>
        <Field label="Minimum order (₹)"><input name="minAmount" type="number" defaultValue={c?.minAmount ?? 0} className="input" /></Field>
        <Field label="Per-student limit"><input name="perUserLimit" type="number" min={1} defaultValue={c?.perUserLimit ?? 1} className="input" /></Field>
        <Field label="Total uses allowed" hint="Blank = unlimited"><input name="usageLimit" type="number" defaultValue={c?.usageLimit ?? ""} className="input" /></Field>
        <Field label="Starts (IST)"><input name="startsAt" type="datetime-local" defaultValue={dt(c?.startsAt ?? null)} className="input" /></Field>
        <Field label="Ends (IST)"><input name="endsAt" type="datetime-local" defaultValue={dt(c?.endsAt ?? null)} className="input" /></Field>
      </div>
      <Field label="Description" hint="Shown to students and FlexCare"><input name="description" defaultValue={c?.description} className="input" /></Field>
      <div className="grid gap-1 sm:grid-cols-2">
        <Toggle name="isActive" label="Active" defaultChecked={c?.isActive ?? true} />
        <Toggle name="isPublic" label="Public" hint="FlexCare can tell students about it" defaultChecked={c?.isPublic} />
      </div>
      <SubmitButton>{c ? "Save coupon" : "Create coupon"}</SubmitButton>
    </form>
  );
}
