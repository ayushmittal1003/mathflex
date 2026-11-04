import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { accountContact, inr, isGuestEmail } from "@/lib/format";
import { cashfreeConfigured } from "@/lib/cashfree";
import { orderPayment } from "@/lib/order-record";
import { requestNow } from "@/lib/time";
import { Badge, Card, PageHeader, Table, Td } from "@/components/admin/ui";
import { ActionButton, ConfirmButton } from "@/components/admin/ConfirmButton";
import { markOrderPaid, recheckPayment, refundOrder } from "../../actions";

export const metadata = { title: "Order" };

const when = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—");
const DAY = 86_400_000;

function Rows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y divide-border text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-2.5">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words text-right font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// The full record of one purchase: who bought it, what they paid, how it was confirmed, and what
// access it gave them.
export default async function OrderRecord({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff("orders");
  const order = await db.order.findUnique({ where: { id }, include: { items: true, user: { select: { id: true, name: true, email: true, phone: true, verifiedPhone: true, isBlocked: true, createdAt: true } } } });
  if (!order) notFound();

  const chapterIds = order.items.filter((i) => i.itemType === "CHAPTER").map((i) => i.itemId!);
  const courseIds = order.items.filter((i) => i.itemType === "COURSE").map((i) => i.itemId!);
  const [grants, chapters, courses, calls] = await Promise.all([
    db.entitlement.findMany({ where: { orderId: order.id } }),
    db.chapter.findMany({ where: { id: { in: chapterIds } }, select: { id: true, validityDays: true } }),
    db.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, validityDays: true, chapters: { select: { chapterId: true } } } }),
    db.mentorshipBooking.findMany({ where: { orderId: order.id }, select: { status: true, scheduledAt: true } }),
  ]);
  const courseChapters = new Map(courses.map((c) => [c.id, c.chapters.map((x) => x.chapterId)]));
  const partsOf = async (ids: string[]) => {
    const total = await db.part.count({ where: { chapterId: { in: ids } } });
    const done = order.userId ? await db.partProgress.count({ where: { userId: order.userId, completedAt: { not: null }, part: { chapterId: { in: ids } } } }) : 0;
    return `${done} of ${total} parts`;
  };
  const items = await Promise.all(
    order.items.map(async (i) => {
      const grant = i.itemId ? grants.find((g) => (i.itemType === "CHAPTER" ? g.chapterId === i.itemId : g.courseId === i.itemId)) : undefined; // a 1:1 call has no access period
      const days = i.itemType === "CHAPTER" ? chapters.find((c) => c.id === i.itemId)?.validityDays : courses.find((c) => c.id === i.itemId)?.validityDays;
      const ids = i.itemType === "CHAPTER" ? [i.itemId!] : i.itemType === "COURSE" ? (courseChapters.get(i.itemId!) ?? []) : [];
      return { ...i, grant, days, progress: ids.length && grant ? await partsOf(ids) : "—" };
    }),
  );

  const payment = orderPayment(order);
  const now = requestNow();
  const guestAccount = order.user ? isGuestEmail(order.user.email) : false;
  const cashfree = cashfreeConfigured();
  const open = order.status === "PENDING" || order.status === "FAILED";

  return (
    <div className="max-w-5xl space-y-6">
      <p className="text-sm"><Link href="/admin/orders" className="text-muted hover:text-brand">← All orders</Link></p>
      <PageHeader
        title={`Order ${order.orderNo}`}
        subtitle={`Placed ${when(order.createdAt)} IST`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={order.status === "PAID" ? "ok" : order.status === "PENDING" ? "gold" : "bad"}>{order.status}</Badge>
            {open && cashfree && order.gateway === "cashfree" && <ActionButton action={recheckPayment.bind(null, order.id)}>Re-check</ActionButton>}
            {open && <ConfirmButton action={markOrderPaid.bind(null, order.id)} message="Mark as paid and unlock access? Only do this if you received the money." className="!bg-ok/15 !text-ok">Mark paid</ConfirmButton>}
            {order.status === "PAID" && <ConfirmButton action={refundOrder.bind(null, order.id)} message="Mark refunded and REMOVE the student's access from this order? (Refund the money in your Cashfree dashboard.)">Refund</ConfirmButton>}
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Buyer">
          <Rows
            rows={[
              ["Account", order.user ? <Link key="a" href={`/admin/students/${order.user.id}`} className="hover:text-brand">{guestAccount ? "Guest account" : order.user.name}</Link> : "Not on an account yet"],
              ["Identity", !order.user ? "Unproven" : guestAccount ? "Unproven: this device only" : order.user.verifiedPhone ? "Mobile verified by OTP" : "Account login"],
              ["Email at checkout", order.contactEmail ?? "—"],
              ["Mobile at checkout", order.contactPhone ?? "—"],
              ["Account login", order.user && !guestAccount ? accountContact(order.user.email) : "—"],
              ["Account created", when(order.user?.createdAt)],
              ["Blocked", order.user?.isBlocked ? "Yes" : "No"],
            ]}
          />
        </Card>
        <Card title="Payment">
          <Rows
            rows={[
              ["Subtotal", inr(order.subtotal)],
              ["Coupon", order.couponCode ? `${order.couponCode} (−${inr(order.discount)})` : "None"],
              ["GST", inr(payment.tax)],
              ["Total", inr(order.total)],
              ["Confirmed", when(order.paidAt)],
              ["Gateway", order.gateway],
              ["Method", payment.method ?? "—"],
              ["Payment reference", order.gatewayTxnId ?? "—"],
              ["Cashfree order ID", payment.cfOrderId ?? "—"],
              ["Bank reference", payment.bankReference ?? "—"],
            ]}
          />
        </Card>
      </div>

      <Card title="What they bought and their access">
        <Table head={["Item", "Type", "Paid", "Access started", "Access until", "Time left", "Progress"]}>
          {items.map((i) => {
            const left = i.grant ? Math.ceil((i.grant.expiresAt.getTime() - now) / DAY) : null;
            return (
              <tr key={i.id}>
                <Td className="font-semibold">{i.title}</Td>
                <Td className="text-xs">{i.itemType}</Td>
                <Td className="font-bold">{inr(i.price)}</Td>
                <Td className="whitespace-nowrap text-xs">{i.grant ? when(i.grant.createdAt) : "—"}</Td>
                <Td className="whitespace-nowrap text-xs">{i.grant ? when(i.grant.expiresAt) : i.itemType === "MENTORSHIP" ? "—" : order.status === "PAID" ? `${i.days ?? "?"} days from first login` : "—"}</Td>
                <Td>{left === null ? "—" : left > 0 ? <Badge tone="ok">{left} days</Badge> : <Badge tone="bad">Expired</Badge>}</Td>
                <Td className="whitespace-nowrap text-xs">{i.itemType === "MENTORSHIP" ? (calls[0]?.status ?? "—") : i.progress}</Td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}
