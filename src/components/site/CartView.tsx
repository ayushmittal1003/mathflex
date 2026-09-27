"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Tag, PhoneCall, ShieldCheck, ShoppingBag, Loader2 } from "lucide-react";
import { cart, useCart } from "./cart-store";
import { getQuote, placeOrder } from "@/app/actions/checkout";
import type { Quote } from "@/lib/pricing";
import { inr } from "@/lib/format";

declare global {
  interface Window {
    Paytm?: { CheckoutJS: { init: (c: unknown) => Promise<void>; invoke: () => void; onLoad: (cb: () => void) => void } };
  }
}

export function CartView(props: {
  mentorship: { enabled: boolean; price: number; title: string; blurb: string; mentor: string };
  couponsEnabled: boolean;
  initialMentorship: boolean;
  loggedIn: boolean;
}) {
  const items = useCart();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [mentor, setMentor] = useState(props.initialMentorship);
  const [error, setError] = useState<string | null>(null);
  const [paying, startPay] = useTransition();
  const [loading, startLoad] = useTransition();

  useEffect(() => {
    startLoad(async () => setQuote(await getQuote(items, coupon, mentor)));
  }, [items, coupon, mentor]);

  const empty = items.length === 0 && !mentor;

  function pay() {
    setError(null);
    startPay(async () => {
      const res = await placeOrder(items, coupon, mentor);
      if (!res.ok) {
        if (res.login) router.push(`/login?next=${encodeURIComponent("/cart" + (mentor ? "?mentorship=1" : ""))}`);
        else setError(res.error);
        return;
      }
      if (res.mode === "free") {
        cart.clear();
        router.push(`/payment/status?order=${res.orderNo}`);
      } else if (res.mode === "mock") {
        cart.clear();
        router.push(`/payment/mock?order=${res.orderId}`);
      } else {
        await openPaytm(res);
      }
    });
  }

  async function openPaytm(res: { orderNo: string; txnToken: string; amount: number; scriptUrl: string }) {
    await new Promise<void>((resolve, reject) => {
      if (window.Paytm?.CheckoutJS) return resolve();
      const s = document.createElement("script");
      s.src = res.scriptUrl;
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Could not load Paytm"));
      document.body.appendChild(s);
    });
    const config = {
      root: "",
      flow: "DEFAULT",
      data: { orderId: res.orderNo, token: res.txnToken, tokenType: "TXN_TOKEN", amount: res.amount.toFixed(2) },
      handler: { notifyMerchant: (event: string) => event === "APP_CLOSED" && setError("Payment cancelled.") },
    };
    window.Paytm!.CheckoutJS.onLoad(async () => {
      await window.Paytm!.CheckoutJS.init(config);
      cart.clear();
      window.Paytm!.CheckoutJS.invoke();
    });
  }

  if (empty) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-surface-2"><ShoppingBag className="size-9 text-muted" /></div>
        <h2 className="mt-5 font-display text-2xl font-extrabold">Your cart is empty</h2>
        <p className="mt-1 text-muted">Pick the one chapter you&apos;re stuck on. That&apos;s the whole point.</p>
        <Link href="/browse" className="btn btn-primary mt-6">Browse chapters</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        {quote?.lines.filter((l) => l.type !== "MENTORSHIP").map((l) => (
          <div key={l.id} className="card flex items-center gap-4 p-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-brand-gradient font-display text-xl font-extrabold text-white">{l.type === "COURSE" ? "Σ" : "∫"}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{l.type === "COURSE" ? "Complete course" : "Chapter"}</p>
              <p className="truncate font-bold">{l.title}</p>
              <p className="text-sm"><span className="font-bold">{inr(l.price)}</span>{l.mrp > l.price && <span className="ml-2 text-muted line-through">{inr(l.mrp)}</span>}</p>
            </div>
            <button onClick={() => cart.remove(l.id!)} className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-bad" aria-label="Remove">
              <Trash2 className="size-5" />
            </button>
          </div>
        ))}
        {!!quote?.skipped.length && (
          <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">Removed from the bill because you already own them: {quote.skipped.join(", ")}</p>
        )}

        {props.mentorship.enabled && (
          <label className={`card flex cursor-pointer items-start gap-4 p-4 transition ${mentor ? "border-brand ring-2 ring-brand/20" : ""}`}>
            <input type="checkbox" checked={mentor} onChange={(e) => setMentor(e.target.checked)} className="mt-1 size-5 accent-[var(--brand)]" />
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold"><PhoneCall className="size-6" /></span>
            <span className="flex-1">
              <span className="flex flex-wrap items-center gap-2 font-bold">{props.mentorship.title} <span className="rounded-md bg-gold/20 px-1.5 py-0.5 text-[11px] text-gold">POPULAR</span></span>
              <span className="mt-0.5 block text-sm text-muted">{props.mentorship.blurb}</span>
            </span>
            <span className="font-bold">+{inr(props.mentorship.price)}</span>
          </label>
        )}
      </div>

      <aside className="card h-fit p-5 lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)]">
        {props.couponsEnabled && (
          <form
            onSubmit={(e) => { e.preventDefault(); setCoupon(couponInput.trim() || null); }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code" className="input !pl-9 uppercase" />
            </div>
            <button className="btn btn-ghost !px-4">Apply</button>
          </form>
        )}
        {quote?.coupon && <p className="mt-2 text-sm font-semibold text-ok">🎉 {quote.coupon.message}</p>}
        {quote?.couponError && <p className="mt-2 text-sm font-semibold text-bad">{quote.couponError}</p>}

        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="font-semibold">{inr(quote?.subtotal ?? 0)}</dd></div>
          {!!quote?.discount && <div className="flex justify-between text-ok"><dt>Coupon</dt><dd className="font-semibold">−{inr(quote.discount)}</dd></div>}
          {!!quote?.tax && <div className="flex justify-between"><dt className="text-muted">GST</dt><dd className="font-semibold">{inr(quote.tax)}</dd></div>}
          <div className="flex justify-between border-t border-border pt-3 text-lg"><dt className="font-bold">Total</dt><dd className="font-display font-extrabold">{inr(quote?.total ?? 0)}</dd></div>
        </dl>
        {error && <p className="mt-3 rounded-xl bg-bad/10 p-3 text-sm font-medium text-bad">{error}</p>}
        <button onClick={pay} disabled={paying || loading || !quote?.lines.length} className="btn btn-primary mt-5 w-full !py-3.5 text-base">
          {paying ? <Loader2 className="size-5 animate-spin" /> : null}
          {props.loggedIn ? `Pay ${inr(quote?.total ?? 0)}` : "Log in to pay"}
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted"><ShieldCheck className="size-4" /> Secure payment via Paytm · UPI, cards, netbanking</p>
      </aside>
    </div>
  );
}
