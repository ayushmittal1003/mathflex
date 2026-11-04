import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { guestEmail } from "./format";
import { quoteCart, evaluateCoupon, type CartLine } from "./pricing";
import type { Prisma } from "@/generated/prisma/client";

export type Buyer = { userId: string | null; email: string; phone: string }; // phone is +91XXXXXXXXXX

export async function createOrder(buyer: Buyer, items: CartLine[], couponCode: string | null, mentorship: boolean, gateway: "cashfree" | "mock") {
  const quote = await quoteCart(items, { userId: buyer.userId ?? undefined, couponCode, mentorship, contact: buyer.userId ? undefined : buyer });
  if (quote.lines.length === 0) throw new Error("Your cart is empty (or you already own everything in it).");
  // Guest details are only checked now, so don't quietly charge full price if the coupon was refused.
  if (couponCode && quote.couponError) throw new Error(quote.couponError);
  const orderNo = `MF${Date.now().toString(36).toUpperCase()}${randomInt(100, 999)}`;
  return db.order.create({
    data: {
      orderNo,
      userId: buyer.userId,
      contactEmail: buyer.email,
      contactPhone: buyer.phone,
      subtotal: quote.subtotal,
      discount: quote.discount,
      total: quote.total,
      couponCode: quote.coupon?.code ?? null,
      gateway,
      items: {
        create: quote.lines.map((l) => ({ itemType: l.type, itemId: l.id, title: l.title, price: l.price })),
      },
    },
    include: { items: true },
  });
}

type PaidOrder = Prisma.OrderGetPayload<{ include: { items: true } }>;

// Gives a paid order's buyer what they bought. Callers make sure this runs once per order.
async function grantOrder(tx: Prisma.TransactionClient, order: PaidOrder, userId: string) {
  const [chapters, courses] = await Promise.all([
    tx.chapter.findMany({ where: { id: { in: order.items.filter((i) => i.itemType === "CHAPTER").map((i) => i.itemId!) } } }),
    tx.course.findMany({ where: { id: { in: order.items.filter((i) => i.itemType === "COURSE").map((i) => i.itemId!) } } }),
  ]);
  // Renewals stack on top of whatever validity is left.
  const expiry = async (days: number, where: { chapterId?: string; courseId?: string }) => {
    const current = await tx.entitlement.findFirst({ where: { userId, ...where }, orderBy: { expiresAt: "desc" } });
    const base = Math.max(Date.now(), current?.expiresAt.getTime() ?? 0);
    return new Date(base + days * 86_400_000);
  };

  for (const ch of chapters) {
    const expiresAt = await expiry(ch.validityDays, { chapterId: ch.id });
    await tx.entitlement.create({ data: { userId, chapterId: ch.id, orderId: order.id, expiresAt } });
  }
  for (const c of courses) {
    const expiresAt = await expiry(c.validityDays, { courseId: c.id });
    await tx.entitlement.create({ data: { userId, courseId: c.id, orderId: order.id, expiresAt } });
  }
  if (order.items.some((i) => i.itemType === "MENTORSHIP")) {
    await tx.mentorshipBooking.create({ data: { userId, orderId: order.id } });
  }
  if (order.couponCode) {
    const coupon = await tx.coupon.findUnique({ where: { code: order.couponCode } });
    if (coupon) await tx.couponRedemption.create({ data: { couponId: coupon.id, userId, orderId: order.id } });
  }
}

// Idempotent and race-safe: the webhook and the browser's return can confirm the same
// order at the same moment. Claiming the order with a conditional update locks the row,
// so only one caller ever creates the entitlements. A guest order gets them when it's claimed.
export async function fulfilOrder(orderId: string, gateway: { txnId?: string; raw?: unknown }) {
  return db.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: { not: "PAID" } },
      data: {
        status: "PAID",
        paidAt: new Date(),
        gatewayTxnId: gateway.txnId,
        gatewayRaw: (gateway.raw ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    if (claimed.count === 0) return order; // already paid by an earlier call

    if (order.couponCode) await tx.coupon.updateMany({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } });
    if (order.userId) await grantOrder(tx, order, order.userId);
    return order;
  });
}

type Proof = { email?: string; phone?: string };
const matchesContact = (proof: Proof): Prisma.OrderWhereInput[] => [...(proof.email ? [{ contactEmail: proof.email }] : []), ...(proof.phone ? [{ contactPhone: proof.phone }] : [])];
const guestOrdersFor = (proof: Proof): Prisma.OrderWhereInput => ({ userId: null, status: { in: ["PAID", "PENDING"] }, OR: matchesContact(proof) });
const GUEST_USER = { email: { endsWith: "@guest.mathflex.in" } };

// Lets a buyer who has paid create their account even while new sign-ups are paused.
export async function guestOrderWaiting(proof: Proof) {
  return (await db.order.count({ where: { OR: [guestOrdersFor(proof), { user: GUEST_USER, OR: matchesContact(proof) }] } })) > 0;
}

// Gives the buyer of a paid guest order instant access: a new account that isn't tied to the email or
// number they typed, because those aren't proven. An existing account is never opened from here, even
// if the details match; proving them later moves this purchase onto it (claimGuestOrders). Setting
// userId is what makes this one-time, so the link can't log a second person in.
export async function startGuestAccess(orderNo: string) {
  return db
    .$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { orderNo }, include: { items: true } });
      if (!order || order.userId || order.status !== "PAID") return null;
      const user = await tx.user.create({
        data: {
          name: "Student",
          email: guestEmail(orderNo),
          phone: order.contactPhone?.replace(/^\+91/, ""),
          // Not a real hash, so no password can ever match it. This account logs in through Google or OTP.
          passwordHash: `guest-${randomBytes(16).toString("hex")}`,
        },
      });
      const moved = await tx.order.updateMany({ where: { id: order.id, userId: null, status: "PAID" }, data: { userId: user.id } });
      if (!moved.count) throw new Error("already attached"); // undoes the new account
      await grantOrder(tx, order, user.id);
      return user;
    })
    .catch((e) => {
      console.info(`[orders] no instant access for ${orderNo}: ${(e as Error).message}`);
      return null;
    });
}

// Moves everything from a guest account onto a proven one and deletes it, which also ends any session
// still using it. Progress the proven account already has wins over the guest's copy.
export async function mergeGuestAccount(fromId: string, toId: string) {
  if (fromId === toId) return;
  await db.$transaction(async (tx) => {
    const from = await tx.user.findFirst({ where: { id: fromId, ...GUEST_USER }, select: { xp: true } });
    if (!from) return;
    const move = { where: { userId: fromId }, data: { userId: toId } };
    await tx.order.updateMany(move);
    await tx.entitlement.updateMany(move);
    await tx.mentorshipBooking.updateMany(move);
    await tx.couponRedemption.updateMany(move);
    await tx.attempt.updateMany(move);
    await tx.xpEvent.updateMany(move);
    await tx.chatLog.updateMany(move);
    const [parts, marks] = await Promise.all([
      tx.partProgress.findMany({ where: { userId: toId }, select: { partId: true } }),
      tx.bookmark.findMany({ where: { userId: toId }, select: { questionId: true } }),
    ]);
    await tx.partProgress.updateMany({ where: { userId: fromId, partId: { notIn: parts.map((p) => p.partId) } }, data: { userId: toId } });
    await tx.bookmark.updateMany({ where: { userId: fromId, questionId: { notIn: marks.map((b) => b.questionId) } }, data: { userId: toId } });
    await tx.user.update({ where: { id: toId }, data: { xp: { increment: from.xp } } });
    await tx.user.delete({ where: { id: fromId } });
  });
}

// Moves guest orders and guest accounts onto an account. Only call this with an email or number that
// was just proven by Google or an OTP: a typed one, or an email from a password sign-up, was never
// checked. A pending order moves too, and fulfilOrder grants it once it's paid. The locked update means
// each order moves once, and whichever of this and fulfilOrder runs second sees the other's change and
// grants. `sessionGuestId` is the guest account this browser is using: they hold it and just proved who
// they are, so it moves even if they typed different details at checkout.
export async function claimGuestOrders(userId: string, proof: Proof, sessionGuestId?: string) {
  const owners = await db.order
    .findMany({ where: { user: GUEST_USER, OR: matchesContact(proof) }, select: { userId: true }, distinct: ["userId"] })
    .catch(() => []);
  const guests = new Set([...owners.map((o) => o.userId), sessionGuestId].filter((id): id is string => !!id && id !== userId));
  for (const id of guests) {
    await mergeGuestAccount(id, userId).catch((e) => console.error(`[orders] couldn't merge guest account ${id}:`, (e as Error).message));
  }
  const orders = await db.order.findMany({ where: guestOrdersFor(proof), select: { id: true } }).catch((e) => {
    console.error("[orders] couldn't look up guest orders:", (e as Error).message);
    return [];
  });
  for (const { id } of orders) {
    // A failure here must not stop the login. The order stays a guest order and the next login retries.
    await db
      .$transaction(async (tx) => {
        const moved = await tx.order.updateMany({ where: { id, userId: null, status: { in: ["PAID", "PENDING"] } }, data: { userId } });
        if (!moved.count) return;
        const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
        if (order.status === "PAID") await grantOrder(tx, order, userId);
      })
      .catch((e) => console.error(`[orders] couldn't attach guest order ${id}:`, (e as Error).message));
  }
}

// Lets a guest, who has no session, follow their own order from the link we send them back to.
export function guestOrderToken(orderNo: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET must be set");
  return createHmac("sha256", secret).update(`guest-order:${orderNo}`).digest("base64url");
}

export function validGuestOrderToken(orderNo: string, token: unknown) {
  if (typeof token !== "string") return false;
  const a = Buffer.from(token);
  const b = Buffer.from(guestOrderToken(orderNo));
  return a.length === b.length && timingSafeEqual(a, b);
}

export { evaluateCoupon };

// The fake gateway is for local testing only; production needs an explicit opt-in.
export function mockPaymentsAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_PAYMENTS === "1";
}
