import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { inr } from "@/lib/format";
import { PaidCelebration } from "@/components/site/PaidCelebration";

export default async function PaymentStatus({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderNo } = await searchParams;
  const user = await requireUser("/my-learning");
  const order = orderNo ? await db.order.findFirst({ where: { orderNo, userId: user.id }, include: { items: true } }) : null;
  const chapterIds = order?.items.filter((i) => i.itemType === "CHAPTER").map((i) => i.itemId!) ?? [];
  const firstChapter = chapterIds.length ? await db.chapter.findUnique({ where: { id: chapterIds[0] }, select: { slug: true, title: true } }) : null;

  const paid = order?.status === "PAID";
  return (
    <div className="mx-auto max-w-lg px-4 pt-[calc(var(--nav-h)+3rem)] text-center">
      {paid && <PaidCelebration />}
      <div className={`mx-auto grid size-24 place-items-center rounded-full text-5xl ${paid ? "bg-ok/15" : "bg-bad/10"}`}>{paid ? "🎉" : order?.status === "PENDING" ? "⏳" : "😕"}</div>
      <h1 className="mt-6 font-display text-3xl font-extrabold">
        {paid ? "You're in!" : order?.status === "PENDING" ? "Payment processing" : "Payment didn't go through"}
      </h1>
      <p className="mt-2 text-muted">
        {paid
          ? `Order ${order!.orderNo} · ${inr(order!.total)} paid. Everything is unlocked in My Learning.`
          : order?.status === "PENDING"
            ? "We're waiting for confirmation from Paytm. This page will show success as soon as it arrives — refresh in a minute."
            : "No money was taken, or it will be auto-refunded by your bank. Please try again."}
      </p>
      {paid && order!.items.some((i) => i.itemType === "MENTORSHIP") && (
        <p className="mt-4 rounded-2xl bg-gold/10 p-4 text-sm font-semibold">📞 Your mentorship call is booked. The team will WhatsApp you to pick a time.</p>
      )}
      <div className="mt-8 flex flex-col gap-3">
        {paid && firstChapter ? (
          <Link href={`/learn/${firstChapter.slug}`} className="btn btn-primary">Start {firstChapter.title}</Link>
        ) : paid ? (
          <Link href="/my-learning" className="btn btn-primary">Go to My Learning</Link>
        ) : (
          <Link href="/cart" className="btn btn-primary">Back to cart</Link>
        )}
      </div>
    </div>
  );
}
