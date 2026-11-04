import Link from "next/link";
import { FirebaseSignIn } from "@/components/site/FirebaseSignIn";
import { PaidCelebration } from "@/components/site/PaidCelebration";
import { PaymentPoller } from "@/components/site/PaymentPoller";
import type { FirebaseWebConfig } from "@/lib/firebase";
import { inr } from "@/lib/format";
import { CheckStatusNow } from "./CheckStatusNow";
import { PendingNote } from "./PendingNote";
import { CheckIcon } from "./primitives";
import { SiteLogo } from "./SiteLogo";
import { button, cx, tone } from "./ui";

const FIELD = "h-12 w-full rounded-lg border border-input bg-card px-3.5 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/25";
const maskEmail = (email: string) => email.replace(/^(.).*(@.*)$/, "$1•••$2");
const maskPhone = (phone: string) => `+91 ••••••${phone.slice(-4)}`;

type GuestOrder = { orderNo: string; status: string; total: number; gateway: string; userId: string | null; contactEmail: string | null; contactPhone: string | null; items: { id: string; title: string }[] };

// The payment page for someone with no session: while it confirms, if it failed, or if the order is
// already on an account (the link is reopened elsewhere). Anyone holding the link can see this, so
// contact details stay masked and nothing unlocks here without proving the email or number.
export function GuestPaymentStatus({ order, token, firebase }: { order: GuestOrder; token: string; firebase: FirebaseWebConfig | null }) {
  const title = "text-[clamp(28px,4.4vw,46px)] font-extrabold leading-[1.05] tracking-[-0.04em]";
  const copy = "mx-auto mt-3 max-w-[440px] text-base leading-[1.55] text-secondary-foreground";
  const details = (
    <div className="mt-7 overflow-hidden rounded-xl border border-border bg-card text-left">
      {order.items.map((i) => (
        <div key={i.id} className="border-b border-border px-4.5 py-3.5 text-sm font-bold">{i.title}</div>
      ))}
      <div className="flex justify-between gap-4 border-b border-border px-4.5 py-3.5 text-sm"><span className="text-muted-foreground">Amount</span><span className="font-bold">{inr(order.total)}</span></div>
      <div className="flex justify-between gap-4 px-4.5 py-3.5 text-sm"><span className="text-muted-foreground">Order ID</span><span className="break-all text-right font-bold">{order.orderNo}</span></div>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-17 w-[min(1160px,calc(100%-32px))] items-center">
          <Link href="/" aria-label="Mathflex home" className="tap relative inline-block"><SiteLogo className="h-[25px]" /></Link>
        </div>
      </header>
      <main id="main" className="grid flex-1 place-items-center px-4 pb-18 pt-12">
        <div className="w-[min(560px,100%)] animate-mf-rise text-center">
          {order.status === "PAID" ? (
            <>
              <PaidCelebration />
              <span className="inline-grid size-20 animate-mf-pop place-items-center rounded-full bg-ok"><CheckIcon className="size-9 text-white" /></span>
              <h1 className={cx(title, "mt-6.5")}>Thank you! Your order is confirmed</h1>
              {order.userId ? (
                <>
                  <p className={copy}>Your access has already been opened on the device you paid from. To open it here, log in with the email or number you used at checkout.</p>
                  <Link href="/login?next=/my-learning" className={cx(button.md, tone.primaryFlat, "mt-6")}>Log in</Link>
                </>
              ) : (
                <>
                  <p className={copy}>Log in to open your chapters. Use Google with <b>{maskEmail(order.contactEmail ?? "")}</b>, or an OTP on <b>{maskPhone(order.contactPhone ?? "")}</b>.</p>
                  <div className="mx-auto max-w-[400px] text-left">
                    {firebase ? <FirebaseSignIn config={firebase} next="/my-learning" field={FIELD} /> : <Link href="/login?next=/my-learning" className={cx(button.md, tone.primaryFlat, "mt-6 w-full")}>Log in</Link>}
                  </div>
                </>
              )}
              {details}
            </>
          ) : order.status === "PENDING" ? (
            <>
              {order.gateway === "cashfree" && <PaymentPoller orderNo={order.orderNo} token={token} />}
              <h1 className={title}>Confirming your payment</h1>
              <p className={copy}>This page updates by itself. Please don&apos;t close it or pay again.</p>
              {details}
              <PendingNote />
              <div className="mt-5.5 cta-row">
                <CheckStatusNow orderNo={order.orderNo} token={token} />
                <Link href="/contact" className={cx(button.md, tone.secondary)}>Contact support</Link>
              </div>
            </>
          ) : (
            <>
              <h1 className={title}>{order.status === "REFUNDED" ? "This order was refunded" : "Payment didn't go through"}</h1>
              <p className={copy}>{order.status === "REFUNDED" ? "The amount has been refunded to your original payment method." : "No money was taken, or it will be refunded by your bank. Your cart is saved, so you can try again."}</p>
              {details}
              <div className="mt-5.5 cta-row">
                {order.status !== "REFUNDED" && <Link href="/checkout" className={cx(button.md, tone.primaryFlat)}>Try again</Link>}
                <Link href="/contact" className={cx(button.md, tone.secondary)}>Contact support</Link>
              </div>
            </>
          )}
        </div>
      </main>
      <footer className="px-4 py-5 text-center text-xs text-muted-foreground">
        Payments are processed securely by Cashfree. <Link href="/refund-policy" className="underline">Refund policy</Link>
      </footer>
    </div>
  );
}
