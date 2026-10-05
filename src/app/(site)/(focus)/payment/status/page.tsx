import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { inr } from "@/lib/format";
import { firstWeek } from "@/lib/site-content";
import { PaidCelebration } from "@/components/site/PaidCelebration";
import { PaymentPoller } from "@/components/site/PaymentPoller";
import { SiteLogo } from "@/components/site/web/SiteLogo";
import { Caret, CheckIcon, Mark, PlayIcon } from "@/components/site/web/primitives";
import { CheckStatusNow } from "@/components/site/web/CheckStatusNow";
import { button, cx, tone } from "@/components/site/web/ui";

export const metadata = { title: "Payment status" };

// Payment status + thank you (Payment Status.dc.html, Thank You.dc.html). Same lookup and
// polling as before: the order must belong to the signed-in user, PaymentPoller asks the
// server (which asks Cashfree) while it's pending, and PaidCelebration clears the cart once
// it's paid. Payment method and Cashfree reference only show when Cashfree's stored data has them.
export default async function PaymentStatus({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderNo } = await searchParams;
  const user = await requireUser("/my-learning");
  const settings = await getSettings();
  const order = orderNo ? await db.order.findFirst({ where: { orderNo, userId: user.id }, include: { items: true } }) : null;

  const chapterIds = order?.items.filter((i) => i.itemType === "CHAPTER").map((i) => i.itemId!) ?? [];
  const courseIds = order?.items.filter((i) => i.itemType === "COURSE").map((i) => i.itemId!) ?? [];
  const [chapters, courses] = await Promise.all([
    chapterIds.length ? db.chapter.findMany({ where: { id: { in: chapterIds } }, select: { id: true, slug: true, title: true, symbol: true, coverFrom: true, coverTo: true, classLevel: true, _count: { select: { parts: true } } } }) : [],
    courseIds.length
      ? db.course.findMany({
          where: { id: { in: courseIds } },
          select: { id: true, title: true, chapters: { where: { chapter: { isPublished: true } }, select: { chapter: { select: { slug: true, title: true, classLevel: true, sortOrder: true } } } } },
        })
      : [],
  ]);

  // What Cashfree returned when the order was confirmed (stored by the existing backend).
  const raw = (order?.gatewayRaw ?? null) as { payment?: { payment_group?: string } | null } | null;
  const method = raw?.payment?.payment_group ? raw.payment.payment_group.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()).replace(/\bUpi\b/, "UPI") : null;
  const reference = order?.gateway === "cashfree" && order.gatewayTxnId ? order.gatewayTxnId : null;
  const tax = order ? Math.max(0, order.total - (order.subtotal - order.discount)) : 0;
  const status = order?.status ?? "MISSING";
  const firstName = user.name.trim().split(" ")[0];

  const header = (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-17 w-[min(1160px,calc(100%-32px))] items-center justify-between gap-4">
        <Link href="/" aria-label="Mathflex home"><SiteLogo className="h-[25px]" /></Link>
        <Link href="/my-learning" className="text-sm font-bold text-secondary-foreground hover:text-foreground">My Learning →</Link>
      </div>
    </header>
  );
  const footer = (
    <footer className="px-4 py-5 text-center text-xs text-muted-foreground">
      Payments are processed securely by Cashfree. <Link href="/refund-policy" className="underline">Refund policy</Link>
    </footer>
  );
  const metaRows = [
    order && { k: "Amount", v: inr(order.total) },
    order && { k: "Order ID", v: order.orderNo },
    reference && { k: "Cashfree ref", v: reference },
    method && { k: "Method", v: method },
  ].filter(Boolean) as { k: string; v: string }[];
  const metaTable = (
    <div className="mt-7 overflow-hidden rounded-xl border border-border bg-card text-left">
      {metaRows.map((m) => (
        <div key={m.k} className="flex justify-between gap-4 border-b border-border px-4.5 py-3.5 text-sm last:border-b-0">
          <span className="text-muted-foreground">{m.k}</span>
          <span className="break-all text-right font-bold">{m.v}</span>
        </div>
      ))}
    </div>
  );

  if (status !== "PAID") {
    return (
      <div className="flex min-h-dvh flex-col">
        {header}
        <main className="grid flex-1 place-items-center px-4 pb-18 pt-12">
          <div className="w-[min(560px,100%)] text-center">
            {status === "PENDING" ? (
              <div className="animate-mf-rise">
                {order!.gateway === "cashfree" && <PaymentPoller orderNo={order!.orderNo} />}
                <span className="relative inline-grid size-20 place-items-center rounded-full bg-gold/18">
                  <span className="absolute inset-0 animate-spin rounded-full border-4 border-gold/30 border-t-[oklch(0.7_0.17_70)]" />
                  <svg className="size-7.5 text-[oklch(0.6_0.15_70)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
                </span>
                <h1 className="mt-6.5 text-[clamp(32px,4.4vw,46px)] font-extrabold leading-[1.05] tracking-[-0.04em]">Confirming your payment</h1>
                <p className="mx-auto mt-3 max-w-[440px] text-base leading-[1.55] text-secondary-foreground">We&apos;re confirming your payment with Cashfree. This page updates by itself. Please don&apos;t close it or pay again.</p>
                <div className="mx-auto mt-7 max-w-[420px]">
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-1/3 animate-[shimmer_1.6s_linear_infinite] rounded-full bg-gradient-to-r from-primary to-brand-2" /></div>
                  <div className="mt-2 text-left text-[13px] text-muted-foreground">Checking with Cashfree…</div>
                </div>
                {metaTable}
                <p className="mt-0 rounded-b-xl px-4.5 py-3.5 text-left text-[13px] leading-[1.5] text-secondary-foreground">Most payments confirm within 2 minutes.</p>
                <div className="mt-5.5 flex flex-wrap justify-center gap-2.5">
                  <CheckStatusNow orderNo={order!.orderNo} />
                  <Link href="/contact" className={cx(button.md, tone.secondary)}>Contact support</Link>
                </div>
              </div>
            ) : status === "MISSING" ? (
              <div className="animate-mf-rise">
                <h1 className="text-[clamp(32px,4.4vw,46px)] font-extrabold leading-[1.05] tracking-[-0.04em]">We couldn&apos;t find that order</h1>
                <p className="mx-auto mt-3 max-w-[440px] text-base leading-[1.55] text-secondary-foreground">It may belong to a different account. Your purchases are always listed in My Learning.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                  <Link href="/my-learning" className={cx(button.md, tone.primaryFlat)}>Go to My Learning</Link>
                  <Link href="/contact" className={cx(button.md, tone.secondary)}>Contact support</Link>
                </div>
              </div>
            ) : (
              <div className="animate-mf-rise">
                <span className="inline-grid size-20 animate-mf-pop place-items-center rounded-full bg-destructive shadow-[0_0_0_12px_color-mix(in_oklab,var(--destructive)_14%,transparent)]">
                  <svg className="size-8.5" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
                </span>
                <h1 className="mt-6.5 text-[clamp(32px,4.4vw,46px)] font-extrabold leading-[1.05] tracking-[-0.04em]">{status === "REFUNDED" ? "This order was refunded" : "Payment didn't go through"}</h1>
                <p className="mx-auto mt-3 max-w-[440px] text-base leading-[1.55] text-secondary-foreground">
                  {status === "REFUNDED" ? "The amount has been refunded to your original payment method." : "No money was taken, or it will be refunded by your bank. Your cart is saved, so you can try again."}
                </p>
                {metaTable}
                {status !== "REFUNDED" && (
                  <div className="mt-5.5 grid gap-2.5">
                    <Link href="/checkout" className="flex h-13 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground shadow-cta hover:brightness-108">Retry payment · {inr(order!.total)}</Link>
                  </div>
                )}
                <p className="mt-4.5 text-sm text-muted-foreground">Still stuck? <Link href="/contact" className="font-bold text-primary">Contact support</Link> with the order ID above.</p>
              </div>
            )}
          </div>
        </main>
        {footer}
      </div>
    );
  }

  // ---- Paid: thank-you page ----------------------------------------------------------
  const paid = order!;
  const sortedCourseChapters = (c: (typeof courses)[number]) => c.chapters.map((x) => x.chapter).sort((a, b) => a.classLevel - b.classLevel || a.sortOrder - b.sortOrder);
  const unlocked = [
    ...courses.map((c) => {
      const first = sortedCourseChapters(c)[0];
      return { key: c.id, kind: "Course", title: c.title, sub: `${c.chapters.length} chapters${first ? ` · start with ${first.title}` : ""}`, href: first ? `/learn/${first.slug}` : "/my-learning", cta: first ? "Start Chapter 1" : "Open", symbol: "Σ", bg: "linear-gradient(135deg, var(--primary), var(--brand-2))" };
    }),
    ...chapters.map((ch) => ({ key: ch.id, kind: "Chapter", title: ch.title, sub: `Class ${ch.classLevel} · ${ch._count.parts} parts · DPPs, PYQs, notes`, href: `/learn/${ch.slug}`, cta: "Start Part 1", symbol: ch.symbol, bg: `linear-gradient(155deg, ${ch.coverFrom}, ${ch.coverTo})` })),
  ];
  const start = unlocked[0];
  const hasCall = paid.items.some((i) => i.itemType === "MENTORSHIP");
  const steps = firstWeek.map((s, i) => ({ ...s, n: `0${i + 1}`, href: [start?.href ?? "/my-learning", "/#how", "/leaderboard", "/my-learning"][i] })).filter((s) => s.href !== "/leaderboard" || settings.features.leaderboard);

  return (
    <div className="min-h-dvh bg-card">
      <PaidCelebration />
      <div className="px-4 pt-4">
        <section className="relative overflow-hidden rounded-xl bg-wash pb-18">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-5.5 tablet:px-8">
            <Link href="/" className="justify-self-start" aria-label="Mathflex home"><SiteLogo /></Link>
            <Link href="/my-learning" className="flex items-center gap-2.5 rounded-full border border-white/95 bg-white/75 py-1.5 pl-1.5 pr-3 text-foreground hover:bg-card">
              <span className="grid size-7.5 place-items-center rounded-full bg-gradient-to-br from-primary to-brand-2 text-[13px] font-extrabold text-white">{firstName[0]?.toUpperCase()}</span>
              <span className="text-sm font-bold">{firstName}</span>
            </Link>
          </div>
          <div className="px-6 pt-7 text-center">
            <span className="inline-grid size-[84px] animate-mf-pop place-items-center rounded-full bg-ok shadow-[0_0_0_12px_color-mix(in_oklab,var(--ok)_18%,transparent),0_20px_40px_-14px_color-mix(in_oklab,var(--ok)_70%,transparent)]">
              <CheckIcon className="size-9.5 text-white" />
            </span>
            <div className="mt-6.5 text-sm font-bold text-[oklch(0.5_0.16_149)]">Payment successful · {inr(paid.total)}</div>
            <h1 className="mx-auto mt-3.5 max-w-[960px] text-[clamp(42px,6.6vw,84px)] font-extrabold leading-none tracking-[-0.045em] text-balance">
              You&apos;re in, {firstName}. Let&apos;s get you that <Mark onWash>seat<Caret /></Mark>
            </h1>
            <p className="mx-auto mt-5 max-w-[560px] text-[17px] leading-[1.55] text-secondary-foreground text-pretty">Everything you bought is unlocked on your account.</p>
            <div className="mt-7.5 flex flex-wrap justify-center gap-2.5">
              {start && <Link href={start.href} className={cx(button.lg, tone.primary)}><PlayIcon className="size-3.5" /> Start {start.title}</Link>}
              <Link href="/my-learning" className={cx(button.lg, tone.glass)}>Go to My Learning</Link>
            </div>
          </div>

          {(unlocked.length > 0 || hasCall) && (
            <div className="mx-auto mt-14 w-[min(980px,calc(100%-48px))] overflow-hidden rounded-xl border-[6px] border-foreground bg-card shadow-[0_40px_80px_-34px_rgb(80_20_0/0.5)]">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-5 py-4">
                <span className="text-[15px] font-extrabold">Unlocked for you</span>
                <span className="text-xs font-bold text-muted-foreground">Order {paid.orderNo}</span>
              </div>
              {unlocked.map((it, i) => (
                <div key={it.key} className="flex animate-mf-rise flex-wrap items-center gap-4 border-b border-border px-5 py-4 last:border-b-0" style={{ animationDelay: `${i * 80}ms` }}>
                  <span className={cx("grid aspect-[16/10] w-20 shrink-0 place-items-center rounded-lg font-black tracking-[-0.04em] text-white", it.symbol.length > 2 ? "text-sm" : "text-2xl")} style={{ background: it.bg }}>{it.symbol}</span>
                  <div className="min-w-0 flex-[1_1_200px]">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                      <span className={cx("rounded px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em]", it.kind === "Course" ? "bg-primary text-white" : "bg-muted text-secondary-foreground")}>{it.kind}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[oklch(0.5_0.16_149)]"><CheckIcon className="size-[11px]" strokeWidth={3.5} />Unlocked</span>
                    </div>
                    <div className="mt-1.5 text-base font-bold tracking-[-0.015em]">{it.title}</div>
                    <div className="mt-0.5 text-[13px] text-muted-foreground">{it.sub}</div>
                  </div>
                  <Link href={it.href} className={cx("shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-[13px] font-bold", i === 0 ? "bg-primary text-white" : "border border-border bg-card text-foreground")}>{it.cta}</Link>
                </div>
              ))}
              {hasCall && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3.5 bg-[color-mix(in_oklab,var(--brand-2)_7%,var(--card))] px-5 py-4">
                  <span className="grid aspect-[16/10] w-20 shrink-0 place-items-center rounded-lg bg-foreground text-white">
                    <svg className="size-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
                  </span>
                  <div className="min-w-0 flex-[1_1_220px]">
                    <div className="text-base font-bold">{settings.mentorshipTitle}</div>
                    <div className="mt-0.5 text-[13px] text-muted-foreground">Your call is booked. The team will WhatsApp you to pick a time.</div>
                  </div>
                  <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noreferrer" className="shrink-0 whitespace-nowrap rounded-lg bg-foreground px-3.5 py-2.5 text-[13px] font-bold text-white hover:brightness-130">WhatsApp us</a>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="py-22">
        <div className="mx-auto w-[min(1120px,calc(100%-48px))]">
          <h2 className="text-center text-[clamp(34px,4.2vw,54px)] font-extrabold leading-[1.04] tracking-[-0.045em] text-balance">Your first <Mark>week</Mark> on Mathflex</h2>
          <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] border-t-2 border-foreground">
            {steps.map((n) => (
              <Link key={n.t} href={n.href} className="flex flex-col gap-2.5 border-b border-border pb-6.5 pr-5.5 pt-6 text-foreground">
                <span className="font-mono text-[13px] font-bold text-primary">{n.n}</span>
                <span className="text-[19px] font-extrabold tracking-[-0.02em]">{n.t}</span>
                <span className="text-sm leading-[1.55] text-muted-foreground">{n.d}</span>
                <span className="mt-auto pt-1.5 text-sm font-bold text-primary">{n.cta} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-22">
        <div className="mx-auto flex w-[min(1120px,calc(100%-48px))] flex-wrap items-start gap-x-16 gap-y-10">
          <div className="min-w-0 flex-[1_1_320px]">
            <h3 className="text-2xl font-extrabold tracking-[-0.025em]">Order details</h3>
            <div className="mt-4 border-t border-border">
              {[
                { k: "Order ID", v: paid.orderNo },
                paid.paidAt && { k: "Date", v: paid.paidAt.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) },
                method && { k: "Paid with", v: method },
                reference && { k: "Cashfree ref", v: reference },
                { k: "Account", v: user.email },
              ].filter(Boolean).map((m) => (
                <div key={(m as { k: string }).k} className="flex justify-between gap-4 border-b border-border py-3 text-sm">
                  <span className="text-muted-foreground">{(m as { k: string }).k}</span>
                  <span className="break-all text-right font-bold">{(m as { v: string }).v}</span>
                </div>
              ))}
            </div>
            <div className="mt-4.5 flex flex-wrap gap-2">
              <Link href="/refund-policy" className="rounded-lg border border-border px-3.5 py-2.5 text-[13px] font-bold hover:bg-secondary">Refund policy</Link>
            </div>
          </div>
          <div className="min-w-0 flex-[1_1_320px]">
            <h3 className="text-2xl font-extrabold tracking-[-0.025em]">Payment summary</h3>
            <div className="mt-4 border-t border-border">
              {paid.items.map((i) => (
                <div key={i.id} className="flex justify-between gap-4 border-b border-border py-3 text-sm">
                  <span className="text-secondary-foreground">{i.title}</span>
                  <span className="font-bold">{inr(i.price)}</span>
                </div>
              ))}
              {paid.discount > 0 && (
                <div className="flex justify-between gap-4 border-b border-border py-3 text-sm">
                  <span className="text-secondary-foreground">{paid.couponCode ?? "Discount"}</span>
                  <span className="font-bold text-[oklch(0.5_0.16_149)]">−{inr(paid.discount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between gap-4 border-b border-border py-3 text-sm">
                  <span className="text-secondary-foreground">GST</span>
                  <span className="font-bold">{inr(tax)}</span>
                </div>
              )}
            </div>
            <div className="flex items-baseline justify-between gap-4 py-4">
              <span className="text-base font-extrabold">Paid</span>
              <span className="text-[30px] font-extrabold tracking-[-0.04em]">{inr(paid.total)}</span>
            </div>
            <p className="mt-1 text-[13px] leading-[1.55] text-muted-foreground">
              Questions about your order? Email {settings.supportEmail} or <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noreferrer" className="font-semibold text-primary">WhatsApp us</a>.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-[min(1120px,calc(100%-48px))] flex-wrap justify-between gap-3 py-5.5 text-[13px] text-muted-foreground">
          <span>© {new Date().getFullYear()} Mathflex · mathflex.in</span>
          <div className="flex flex-wrap gap-5">
            <Link href="/terms">Terms &amp; conditions</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/refund-policy">Refund policy</Link>
            <Link href="/contact">Contact us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
