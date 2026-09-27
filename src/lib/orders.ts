import { randomInt } from "node:crypto";
import { db } from "./db";
import { quoteCart, evaluateCoupon, type CartLine } from "./pricing";
import type { Prisma } from "@/generated/prisma/client";

export async function createOrder(userId: string, items: CartLine[], couponCode: string | null, mentorship: boolean) {
  const quote = await quoteCart(items, { userId, couponCode, mentorship });
  if (quote.lines.length === 0) throw new Error("Your cart is empty (or you already own everything in it).");
  const orderNo = `MF${Date.now().toString(36).toUpperCase()}${randomInt(100, 999)}`;
  return db.order.create({
    data: {
      orderNo,
      userId,
      subtotal: quote.subtotal,
      discount: quote.discount,
      total: quote.total,
      couponCode: quote.coupon?.code ?? null,
      items: {
        create: quote.lines.map((l) => ({ itemType: l.type, itemId: l.id, title: l.title, price: l.price })),
      },
    },
    include: { items: true },
  });
}

// Idempotent: safe to call from both the Paytm callback and a status re-check.
export async function fulfilOrder(orderId: string, gateway: { txnId?: string; raw?: unknown }) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    if (order.status === "PAID") return order;

    const [chapters, courses] = await Promise.all([
      tx.chapter.findMany({ where: { id: { in: order.items.filter((i) => i.itemType === "CHAPTER").map((i) => i.itemId!) } } }),
      tx.course.findMany({ where: { id: { in: order.items.filter((i) => i.itemType === "COURSE").map((i) => i.itemId!) } } }),
    ]);
    // Renewals stack on top of whatever validity is left.
    const expiry = async (days: number, where: { chapterId?: string; courseId?: string }) => {
      const current = await tx.entitlement.findFirst({ where: { userId: order.userId, ...where }, orderBy: { expiresAt: "desc" } });
      const base = Math.max(Date.now(), current?.expiresAt.getTime() ?? 0);
      return new Date(base + days * 86_400_000);
    };

    for (const ch of chapters) {
      const expiresAt = await expiry(ch.validityDays, { chapterId: ch.id });
      await tx.entitlement.create({ data: { userId: order.userId, chapterId: ch.id, orderId: order.id, expiresAt } });
    }
    for (const c of courses) {
      const expiresAt = await expiry(c.validityDays, { courseId: c.id });
      await tx.entitlement.create({ data: { userId: order.userId, courseId: c.id, orderId: order.id, expiresAt } });
    }
    if (order.items.some((i) => i.itemType === "MENTORSHIP")) {
      await tx.mentorshipBooking.create({ data: { userId: order.userId, orderId: order.id } });
    }
    if (order.couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: order.couponCode } });
      if (coupon) {
        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
        await tx.couponRedemption.create({ data: { couponId: coupon.id, userId: order.userId, orderId: order.id } });
      }
    }
    return tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        gatewayTxnId: gateway.txnId,
        gatewayRaw: (gateway.raw ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  });
}

export { evaluateCoupon };

// The fake gateway is for local testing only; production needs an explicit opt-in.
export function mockPaymentsAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_PAYMENTS === "1";
}
