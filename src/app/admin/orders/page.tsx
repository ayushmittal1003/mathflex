import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/format";
import { paytmConfigured } from "@/lib/paytm";
import { PageHeader, Table, Td, Badge } from "@/components/admin/ui";
import { ConfirmButton, ActionButton } from "@/components/admin/ConfirmButton";
import { markOrderPaid, refundOrder, recheckPaytm } from "../actions";
import type { OrderStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Orders" };
const STATUSES: OrderStatus[] = ["PAID", "PENDING", "FAILED", "REFUNDED"];

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: OrderStatus; q?: string }> }) {
  const { status, q } = await searchParams;
  const orders = await db.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ orderNo: { contains: q, mode: "insensitive" } }, { user: { email: { contains: q, mode: "insensitive" } } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { id: true, name: true, email: true } }, items: true },
  });
  const paytm = paytmConfigured();
  return (
    <div>
      <PageHeader title="Orders & payments" subtitle="Every checkout. Mark offline payments as paid, refund, or re-check a pending Paytm order." />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Order no. or email" className="input max-w-xs" />
        <select name="status" defaultValue={status ?? ""} className="input max-w-[160px]">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="btn btn-ghost !py-2 text-sm">Filter</button>
      </form>
      <Table head={["Order", "Student", "Items", "Total", "Status", "Date", ""]} empty={!orders.length}>
        {orders.map((o) => (
          <tr key={o.id}>
            <Td><span className="font-mono text-xs">{o.orderNo}</span>{o.couponCode && <span className="block text-xs text-muted">{o.couponCode} −{inr(o.discount)}</span>}</Td>
            <Td><Link href={`/admin/students/${o.user.id}`} className="font-semibold hover:text-brand">{o.user.name}</Link><span className="block text-xs text-muted">{o.user.email}</span></Td>
            <Td className="max-w-[240px]"><span className="line-clamp-2 text-xs">{o.items.map((i) => i.title).join(", ")}</span></Td>
            <Td className="font-bold">{inr(o.total)}</Td>
            <Td><Badge tone={o.status === "PAID" ? "ok" : o.status === "PENDING" ? "gold" : "bad"}>{o.status}</Badge></Td>
            <Td className="whitespace-nowrap text-xs text-muted">{o.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</Td>
            <Td>
              <div className="flex gap-1">
                {o.status === "PENDING" && paytm && <ActionButton action={recheckPaytm.bind(null, o.id)}>Re-check</ActionButton>}
                {(o.status === "PENDING" || o.status === "FAILED") && <ConfirmButton action={markOrderPaid.bind(null, o.id)} message="Mark as paid and unlock access? Only do this if you received the money." className="!bg-ok/15 !text-ok">Mark paid</ConfirmButton>}
                {o.status === "PAID" && <ConfirmButton action={refundOrder.bind(null, o.id)} message="Mark refunded and REMOVE the student's access from this order? (Refund the money in your Paytm dashboard.)">Refund</ConfirmButton>}
              </div>
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
