import { ChevronDown } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader, Badge } from "@/components/admin/ui";
import { CouponForm, type CouponValues } from "@/components/admin/CouponForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { deleteCoupon } from "../actions";
import type { Coupon } from "@/generated/prisma/client";

export const metadata = { title: "Coupons" };

const dt = (d: Date | null) => (d ? new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16) : "");

export default async function Coupons() {
  await requireStaff("coupons");
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="Coupons" subtitle="Percent or flat discounts, with limits and schedules. Public coupons are shown by MathMate." />
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
            <CouponForm c={toValues(c)} />
            <div className="mt-3"><ConfirmButton action={deleteCoupon.bind(null, c.id)} message={`Delete ${c.code}?`}>Delete</ConfirmButton></div>
          </div>
        </details>
      ))}
      <Card title="New coupon"><CouponForm c={null} /></Card>
    </div>
  );
}

// Plain values for the client form (dates as IST datetime-local strings).
function toValues(c: Coupon): CouponValues {
  return {
    id: c.id, code: c.code, type: c.type, value: c.value, maxDiscount: c.maxDiscount, minAmount: c.minAmount, perUserLimit: c.perUserLimit,
    usageLimit: c.usageLimit, startsAt: dt(c.startsAt), endsAt: dt(c.endsAt), description: c.description, isActive: c.isActive, isPublic: c.isPublic,
  };
}
