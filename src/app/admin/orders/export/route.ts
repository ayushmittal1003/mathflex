import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGuestEmail } from "@/lib/format";
import { orderPayment } from "@/lib/order-record";
import type { OrderStatus } from "@/generated/prisma/enums";

const STATUSES = ["PAID", "PENDING", "FAILED", "REFUNDED"];
const when = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "");
// Quotes every cell, and stops a spreadsheet running a typed value such as "=..." as a formula.
const cell = (v: string | number | null | undefined) => {
  const s = String(v ?? "");
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

// Orders as a spreadsheet, using the same filters as the orders page.
export async function GET(req: Request) {
  const me = await requireStaff("orders");
  const params = new URL(req.url).searchParams;
  const status = STATUSES.includes(params.get("status") ?? "") ? (params.get("status") as OrderStatus) : undefined;
  const q = params.get("q") ?? "";
  const orders = await db.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ orderNo: { contains: q, mode: "insensitive" } }, { user: { email: { contains: q, mode: "insensitive" } } }, { contactEmail: { contains: q, mode: "insensitive" } }, { contactPhone: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: { items: true, user: { select: { id: true, name: true, email: true } } },
  });
  const grants = await db.entitlement.findMany({ where: { orderId: { in: orders.map((o) => o.id) } }, select: { orderId: true, createdAt: true, expiresAt: true } });

  const head = ["Order", "Status", "Placed (IST)", "Confirmed (IST)", "Student", "Account type", "Student ID", "Email at checkout", "Mobile at checkout", "Items", "Subtotal", "Coupon", "Discount", "GST", "Total", "Gateway", "Method", "Payment reference", "Bank reference", "Access started (IST)", "Access until (IST)"];
  const rows = orders.map((o) => {
    const payment = orderPayment(o);
    const own = grants.filter((g) => g.orderId === o.id);
    const started = own.length ? new Date(Math.min(...own.map((g) => g.createdAt.getTime()))) : null;
    const until = own.length ? new Date(Math.max(...own.map((g) => g.expiresAt.getTime()))) : null;
    return [o.orderNo, o.status, when(o.createdAt), when(o.paidAt), o.user?.name ?? "", !o.user ? "Not on an account" : isGuestEmail(o.user.email) ? "Guest" : "Student", o.user?.id ?? "", o.contactEmail, o.contactPhone, o.items.map((i) => i.title).join("; "), o.subtotal, o.couponCode, o.discount, payment.tax, o.total, o.gateway, payment.method, o.gatewayTxnId, payment.bankReference, when(started), when(until)];
  });
  await audit(me, "order.export", `Exported ${orders.length} orders to CSV`, { entity: "order", meta: { status: status ?? "all", q } });
  const csv = [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(`﻿${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="mathflex-orders.csv"`, "Cache-Control": "no-store" } });
}
