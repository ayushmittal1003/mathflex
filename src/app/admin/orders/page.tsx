import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr } from "@/lib/format";
import { cashfreeConfigured } from "@/lib/cashfree";
import { PageHeader, Table, Td, Badge } from "@/components/admin/ui";
import { ConfirmButton, ActionButton } from "@/components/admin/ConfirmButton";
import { markOrderPaid, refundOrder, recheckPayment } from "../actions";
import type { OrderStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Orders" };
const STATUSES: OrderStatus[] = ["PAID", "PENDING", "FAILED", "REFUNDED"];

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: OrderStatus; q?: string }> }) {
  await requireStaff("orders");
  const { status, q } = await searchParams;
  const orders = await db.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ orderNo: { contains: q, mode: "insensitive" } }, { user: { email: { contains: q, mode: "insensitive" } } }, { contactEmail: { contains: q, mode: "insensitive" } }, { contactPhone: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { id: true, name: true, email: true } }, items: true },
  });
  const grants = await db.entitlement.findMany({ where: { orderId: { in: orders.map((o) => o.id) } }, select: { orderId: true, expiresAt: true } });
  const accessUntil = new Map<string, Date>();
  for (const g of grants) if (g.orderId && g.expiresAt > (accessUntil.get(g.orderId) ?? new Date(0))) accessUntil.set(g.orderId, g.expiresAt);
  const exportQuery = new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}) });
  const cashfree = cashfreeConfigured();
  return (
    <div>
      <PageHeader title="Orders & payments" subtitle="Every checkout. Open an order for its full record, mark offline payments as paid, refund, or re-check a pending Cashfree order." action={<a href={`/admin/orders/export?${exportQuery}`} className="btn btn-ghost !py-2 text-sm">Export CSV</a>} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Order no., email or mobile" className="input max-w-xs" />
        <select name="status" defaultValue={status ?? ""} className="input max-w-[160px]">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="btn btn-ghost !py-2 text-sm">Filter</button>
      </form>
      <Table head={["Order", "Student", "Items", "Total", "Status", "Access until", "Date", ""]} empty={!orders.length}>
        {orders.map((o) => (
          <tr key={o.id}>
            <Td><Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-bold hover:text-brand">{o.orderNo}</Link>{o.couponCode && <span className="block text-xs text-muted">{o.couponCode} −{inr(o.discount)}</span>}</Td>
            <Td>
              {o.user ? (
                <><Link href={`/admin/students/${o.user.id}`} className="font-semibold hover:text-brand">{o.user.name}</Link><span className="block text-xs text-muted">{o.user.email}</span></>
              ) : (
                <><span className="font-semibold">Guest · not logged in yet</span><span className="block text-xs text-muted">{o.contactEmail}</span><span className="block text-xs text-muted">{o.contactPhone}</span></>
              )}
            </Td>
            <Td className="max-w-[240px]"><span className="line-clamp-2 text-xs">{o.items.map((i) => i.title).join(", ")}</span></Td>
            <Td className="font-bold">{inr(o.total)}</Td>
            <Td><Badge tone={o.status === "PAID" ? "ok" : o.status === "PENDING" ? "gold" : "bad"}>{o.status}</Badge></Td>
            <Td className="whitespace-nowrap text-xs">{accessUntil.get(o.id)?.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" }) ?? "—"}</Td>
            <Td className="whitespace-nowrap text-xs text-muted">{o.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</Td>
            <Td>
              <div className="flex gap-1">
                {(o.status === "PENDING" || o.status === "FAILED") && cashfree && o.gateway === "cashfree" && <ActionButton action={recheckPayment.bind(null, o.id)}>Re-check</ActionButton>}
                {(o.status === "PENDING" || o.status === "FAILED") && <ConfirmButton action={markOrderPaid.bind(null, o.id)} message="Mark as paid and unlock access? Only do this if you received the money." className="!bg-ok/15 !text-ok">Mark paid</ConfirmButton>}
                {o.status === "PAID" && <ConfirmButton action={refundOrder.bind(null, o.id)} message="Mark refunded and REMOVE the student's access from this order? (Refund the money in your Cashfree dashboard.)">Refund</ConfirmButton>}
              </div>
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
