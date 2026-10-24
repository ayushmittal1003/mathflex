"use client";
import { formatPhone, mentorshipCall, mentorshipPlan, supportEmail, supportPhone } from "@/lib/site-content";
import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Loader2 } from "lucide-react";
import { cart, useCart } from "./cart-store";
import { getQuote, placeOrder } from "@/app/actions/checkout";
import { login, type AuthState } from "@/app/actions/auth";
import { load } from "@cashfreepayments/cashfree-js";
import type { Quote } from "@/lib/pricing";
import { inr, pctOff, validity } from "@/lib/format";
import { SiteLogo } from "./web/SiteLogo";
import { Recommendations } from "./web/Recommendations";
import { CouponField } from "./web/CouponField";
import { BundleUpsell } from "./web/BundleUpsell";
import type { CartMeta } from "./web/cart-meta";
import { CheckIcon, LockIcon } from "./web/primitives";
import { cx } from "./web/ui";

// Display-only details for cart lines and suggestions (prices always come from getQuote).
export type CheckoutMeta = {
  chapters: Record<string, { title: string; symbol: string; coverFrom: string; coverTo: string; classLevel: number; parts: number; price: number; mrp: number }>;
  courses: { id: string; title: string; price: number; chapterIds: string[]; count: number }[];
  user: { name: string; email: string } | null;
  whatsapp: string;
};

export function CartView(props: {
  mentorship: { enabled: boolean; price: number; title: string; blurb: string; mentor: string };
  couponsEnabled: boolean;
  initialMentorship: boolean | null; // from ?mentorship=1 / 0; null = default
  loggedIn: boolean;
  meta: CheckoutMeta;
  cartMeta: CartMeta;
}) {
  const items = useCart();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [coupon, setCoupon] = useState<string | null>(null);
  // The 1:1 call is pre-ticked once the cart has a chapter or course; an explicit choice wins.
  const [mentorChoice, setMentorChoice] = useState<boolean | null>(props.initialMentorship);
  const mentor = props.mentorship.enabled && (mentorChoice ?? items.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [needPhone, setNeedPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false); // phones: the summary is a collapsible bar at the top
  const kbOffset = useKeyboardOffset();
  const [paying, startPay] = useTransition();
  const [loading, startLoad] = useTransition();

  // If the price check fails (network or server), show a retry instead of an error page.
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [quoteTry, setQuoteTry] = useState(0);
  useEffect(() => {
    startLoad(async () => {
      try {
        setQuote(await getQuote(items, coupon, mentor));
        setQuoteFailed(false);
      } catch {
        setQuoteFailed(true);
      }
    });
  }, [items, coupon, mentor, quoteTry]);

  const empty = items.length === 0 && !mentor;

  function pay() {
    setError(null);
    startPay(async () => {
      const res = await placeOrder(items, coupon, mentor, needPhone ? phone : undefined);
      if (!res.ok) {
        if (res.login) router.push(`/login?next=${encodeURIComponent(`/checkout?mentorship=${mentor ? 1 : 0}`)}`);
        else {
          if (res.needPhone) setNeedPhone(true);
          setError(res.error);
        }
        return;
      }
      if (res.mode === "free") {
        cart.clear();
        router.push(`/payment/status?order=${res.orderNo}`);
      } else if (res.mode === "mock") {
        cart.clear();
        router.push(`/payment/mock?order=${res.orderId}`);
      } else {
        await openCashfree(res.paymentSessionId, res.env);
      }
    });
  }

  // Official Cashfree JS SDK. It takes over the tab and returns to our return URL,
  // where the server confirms the payment. The cart is cleared only once it's paid.
  async function openCashfree(paymentSessionId: string, mode: "sandbox" | "production") {
    try {
      const cashfree = await load({ mode });
      if (!cashfree) throw new Error("Cashfree didn't load");
      const result = await cashfree.checkout({ paymentSessionId, redirectTarget: "_self" });
      if (result?.error) setError(result.error.message || "Payment was not completed.");
    } catch {
      setError("Couldn't open the payment page. Check your connection and try again.");
    }
  }

  // ---- Presentation (dipankar-design/designs/Checkout.dc.html) ----------------------
  const { meta } = props;
  const lines = quote?.lines.filter((l) => l.type !== "MENTORSHIP") ?? [];
  const signedIn = props.loggedIn;
  const canPay = !paying && !loading && !!quote?.lines.length;
  const mrpTotal = quote?.lines.reduce((s, l) => s + l.mrp, 0) ?? 0;
  const saved = quote ? mrpTotal - quote.subtotal + quote.discount : 0;
  const step = empty ? 0 : signedIn ? 2 : 1;

  // Access length per kind of line, from the catalogue (display only).
  const daysOf = (type: "CHAPTER" | "COURSE") => [...new Set((quote?.lines ?? []).filter((l) => l.type === type).map((l) => (type === "CHAPTER" ? props.cartMeta.chapters[l.id ?? ""]?.validityDays : props.cartMeta.courses.find((c) => c.id === l.id)?.validityDays)).filter((n): n is number => !!n))].sort((a, b) => a - b);
  const accessParts = [
    ...(daysOf("CHAPTER").length ? [`${daysOf("CHAPTER").map(validity).join(" / ")} access per chapter`] : []),
    ...(daysOf("COURSE").length ? [`${daysOf("COURSE").map(validity).join(" / ")} access per course`] : []),
  ];
  const payLabel = !quote?.lines.length ? "Your cart is empty" : signedIn ? `Pay ${inr(quote?.total ?? 0)}` : "Log in to pay";
  const card = "overflow-hidden rounded-xl border border-border bg-card";
  const stepDot = (n: number, done: boolean, active: boolean) => (
    <span className={cx("grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-extrabold", done ? "bg-ok text-white" : active ? "bg-foreground text-white" : "bg-muted text-muted-foreground")}>
      {done ? <CheckIcon className="size-3.5" strokeWidth={3.5} /> : n}
    </span>
  );

  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto grid h-18 w-[min(1160px,calc(100%-var(--gutter)*2))] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
          <Link href="/" className="tap relative justify-self-start" aria-label="Mathflex home"><SiteLogo className="h-[25px]" /></Link>
          <ol className="hidden items-center gap-2.5 tablet:flex" aria-label="Checkout steps">
            {["Cart", "Sign in", "Pay"].map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={label} className="flex items-center gap-2.5">
                  <span className={cx("flex items-center gap-2 text-[13px] font-bold", done || active ? "text-foreground" : "text-muted-foreground")} aria-current={active ? "step" : undefined}>
                    <span className={cx("grid size-5.5 place-items-center rounded-full text-xs font-extrabold", done ? "bg-ok text-white" : active ? "bg-foreground text-white" : "bg-muted text-muted-foreground")}>
                      {done ? <CheckIcon className="size-3" strokeWidth={3.5} /> : i + 1}
                    </span>
                    {label}
                  </span>
                  {i < 2 && <span className={cx("h-0.5 w-9 rounded-sm", done ? "bg-ok" : "bg-border")} />}
                </li>
              );
            })}
          </ol>
          <div className="flex items-center gap-2 justify-self-end text-[13px] font-bold text-secondary-foreground">
            <LockIcon className="size-[15px] text-ok" /> Secure checkout
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-[min(1160px,calc(100%-var(--gutter)*2))] pb-28 pt-10 tablet:pb-20">
        <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
          <h1 className="text-[clamp(28px,4vw,48px)] font-extrabold leading-[1.05] tracking-[-0.04em]">Checkout</h1>
          <Link href="/chapters" className="inline-flex min-h-11 items-center text-sm font-bold text-primary">← Keep browsing</Link>
        </div>

        <div className="mt-7 flex flex-wrap items-start gap-7">
          <div className="grid min-w-0 flex-[1_1_560px] gap-5">
            {/* 1 · Cart */}
            <section className={card}>
              <div className="flex items-center gap-3 border-b border-border px-5.5 py-5">
                {stepDot(1, !empty && step > 0, step === 0)}
                <h2 className="text-[19px] font-extrabold tracking-[-0.02em]">Your cart</h2>
                <span className="ml-auto text-[13px] font-semibold text-muted-foreground">
                  {loading && !quote ? "Loading…" : `${lines.length} item${lines.length === 1 ? "" : "s"}`}
                </span>
              </div>
              {lines.map((l) => {
                const ch = l.type === "CHAPTER" && l.id ? meta.chapters[l.id] : null;
                const course = l.type === "COURSE" ? meta.courses.find((c) => c.id === l.id) : null;
                return (
                  <div key={l.id} className="flex animate-mf-rise items-center gap-4 border-b border-border px-5.5 py-4.5">
                    <span
                      className={cx("relative grid aspect-[16/10] w-20 shrink-0 place-items-center overflow-hidden rounded-lg font-black tracking-[-0.04em] text-white tablet:w-24", ch && ch.symbol.length > 2 ? "text-base" : "text-2xl")}
                      style={{ background: ch ? `linear-gradient(155deg, ${ch.coverFrom}, ${ch.coverTo})` : "linear-gradient(135deg, var(--primary), var(--brand-2))" }}
                    >
                      {ch ? ch.symbol : "Σ"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className={cx("rounded px-1.5 py-0.5 text-xs font-extrabold uppercase tracking-[0.06em]", l.type === "COURSE" ? "bg-primary text-white" : "bg-muted text-secondary-foreground")}>
                        {l.type === "COURSE" ? "Course" : "Chapter"}
                      </span>
                      <div className="mt-1.5 text-base font-bold tracking-[-0.015em]">{l.title}</div>
                      <div className="mt-0.5 text-[13px] text-muted-foreground">
                        {ch ? `Class ${ch.classLevel} · ${ch.parts} parts · DPPs, PYQs, notes` : course ? `${course.count} chapters` : ""}
                        {(() => { const d = l.type === "CHAPTER" ? props.cartMeta.chapters[l.id ?? ""]?.validityDays : props.cartMeta.courses.find((c) => c.id === l.id)?.validityDays; return d ? ` · ${validity(d)} access` : ""; })()}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[17px] font-extrabold tracking-[-0.02em]">{inr(l.price)}</div>
                      {l.mrp > l.price && <div className="text-xs text-muted-foreground line-through">{inr(l.mrp)}</div>}
                      <button type="button" onClick={() => cart.remove(l.id!)} className="-mb-2.5 mt-0.5 inline-flex min-h-11 items-center text-xs font-bold text-muted-foreground underline underline-offset-[3px] hover:text-bad">Remove</button>
                    </div>
                  </div>
                );
              })}
              {!!quote?.skipped.length && (
                <p className="mx-5.5 my-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">Removed from the bill because you already own them: {quote.skipped.join(", ")}</p>
              )}
              {quoteFailed && !empty && !loading && (
                <div role="alert" className="mx-5.5 my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-bad/8 p-4 text-sm">
                  <span className="font-semibold text-foreground">We couldn&apos;t load the latest prices. Check your connection and try again.</span>
                  <button type="button" onClick={() => setQuoteTry((n) => n + 1)} className="rounded-lg bg-foreground px-3.5 py-2 text-sm font-bold text-white">Try again</button>
                </div>
              )}
              {empty && (
                <div className="px-5.5 py-12 text-center">
                  <div className="text-xl font-extrabold tracking-[-0.02em]">Your cart is empty</div>
                  <p className="mt-1.5 text-sm text-muted-foreground">Pick a chapter or a full course to get started.</p>
                  <div className="mt-4.5 flex flex-wrap justify-center gap-2">
                    <Link href="/chapters" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-bold text-white">Browse chapters</Link>
                    <Link href="/courses" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border px-4 text-sm font-bold">See courses</Link>
                  </div>
                </div>
              )}
              {!empty && !loading && quote && lines.length === 0 && !mentor && (
                <p className="px-5.5 py-6 text-sm text-muted-foreground">Nothing left to pay for.</p>
              )}
              {!empty && <BundleUpsell meta={props.cartMeta} className="mx-5.5 my-4.5" />}
            </section>

            {/* 1:1 intro call: pre-ticked once the cart has an item. Sits above sign-in and payment. */}
            {props.mentorship.enabled && !empty && (
              <section className={cx(card, "border-[1.5px]", mentor ? "border-primary" : "border-border")} aria-labelledby="mentor-title">
                <label className="flex cursor-pointer items-start gap-3.5 px-5.5 py-5">
                  <input
                    type="checkbox"
                    checked={mentor}
                    onChange={(e) => setMentorChoice(e.target.checked)}
                    className="mt-0.5 size-6 shrink-0 cursor-pointer accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span id="mentor-title" className="block text-base font-extrabold leading-[1.35] tracking-[-0.015em]">
                      {mentorshipCall.minutes}-minute 1:1 call with {props.mentorship.mentor} (IIT Delhi alumnus) <span className="whitespace-nowrap">· {inr(props.mentorship.price)}</span>
                    </span>
                    <span className="mt-1 block text-sm leading-[1.5] text-secondary-foreground">{mentorshipCall.pitch}</span>
                    <span className="mt-1 block text-[13px] leading-[1.5] text-muted-foreground">{mentorshipCall.contactNote}</span>
                  </span>
                </label>
                <p className="border-t border-border px-5.5 py-3.5 text-[13px] leading-[1.5] text-secondary-foreground">
                  Want ongoing help? {mentorshipPlan.sessions} monthly sessions of {mentorshipPlan.minutes} minutes each for {inr(mentorshipPlan.price)}: {mentorshipCall.monthly}{" "}
                  <Link href="/book-a-call" className="font-bold text-primary underline underline-offset-[3px]">Learn more</Link>
                </p>
              </section>
            )}

            {/* Upsell: related chapters (server prices) */}
            {!empty && <Recommendations meta={props.cartMeta} max={3} className="rounded-xl border border-border bg-card px-5.5 py-5" />}

            {/* 2 · Sign in (email + password, the existing login action) */}
            <section className={cx(card, !signedIn && !empty && "border-foreground")}>
              <div className="flex items-center gap-3 border-b border-border px-5.5 py-5">
                {stepDot(2, signedIn, step === 1)}
                <h2 className="text-[19px] font-extrabold tracking-[-0.02em]">{signedIn ? "Signed in" : "Sign in to pay"}</h2>
              </div>
              {signedIn && meta.user ? (
                <div className="flex animate-mf-rise items-center gap-3.5 px-5.5 py-4.5">
                  <span className="grid size-[42px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-brand-2 font-extrabold text-white">{meta.user.name.trim()[0]?.toUpperCase()}</span>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold">{meta.user.name}</div>
                    <div className="truncate text-[13px] text-muted-foreground">{meta.user.email}</div>
                  </div>
                  <span className="ml-auto shrink-0 rounded-md bg-ok/14 px-2 py-1 text-xs font-bold text-ok-strong">Signed in</span>
                </div>
              ) : (
                <InlineLogin next={`/checkout?mentorship=${mentor ? 1 : 0}`} />
              )}
            </section>

            {/* 3 · Payment */}
            <section className={cx(card, !signedIn && "opacity-55")}>
              <div className="flex items-center gap-3 px-5.5 py-5">
                {stepDot(3, false, step === 2)}
                <h2 className="text-[19px] font-extrabold tracking-[-0.02em]">Payment</h2>
              </div>
              <div className="px-5.5 pb-5.5">
                <p className="text-sm leading-[1.5] text-secondary-foreground">
                  {signedIn ? "You'll pay on Cashfree's secure page and come straight back here." : "Sign in above, then pay on Cashfree's secure page."}
                </p>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {["UPI", "Debit / credit card", "Netbanking"].map((m) => <span key={m} className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-bold">{m}</span>)}
                </div>
                {needPhone && (
                  <label className="mt-4.5 grid gap-1.5">
                    <span className="text-[13px] font-bold">Mobile number</span>
                    <span className="flex gap-2">
                      <span className="grid h-12 shrink-0 place-items-center rounded-lg border border-border bg-muted px-3.5 text-[15px] font-bold">+91</span>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="10-digit mobile"
                        className="h-12 min-w-0 flex-1 rounded-lg border border-input bg-card px-3.5 text-base tracking-[0.02em] outline-none focus:border-ring focus:ring-3 focus:ring-ring/25"
                      />
                    </span>
                    <span className="text-xs text-muted-foreground">Needed by the payment gateway for receipts. Saved to your profile.</span>
                  </label>
                )}
              </div>
            </section>
          </div>

          {/* Order summary */}
          <aside className="order-first w-full min-w-0 flex-[1_1_340px] min-[900px]:sticky min-[900px]:top-6 min-[900px]:order-last min-[900px]:max-w-[380px]">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_48px_-32px_rgb(80_20_0/0.4)]">
              <h2 className="hidden px-5.5 pt-5 text-[19px] font-extrabold tracking-[-0.02em] min-[900px]:block">Order summary</h2>
              <button
                type="button"
                onClick={() => setSummaryOpen((o) => !o)}
                aria-expanded={summaryOpen}
                aria-controls="order-summary"
                className="flex min-h-14 w-full items-center gap-3 px-5.5 py-3 text-left min-[900px]:hidden"
              >
                <span className="text-[17px] font-extrabold tracking-[-0.02em]">Order summary</span>
                <span className="ml-auto text-[17px] font-extrabold tracking-[-0.02em]">{inr(quote?.total ?? 0)}</span>
                <svg className={cx("size-4 shrink-0 transition-transform", summaryOpen && "rotate-180")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
              </button>
              <div id="order-summary" className={cx("min-[900px]:block", summaryOpen ? "block" : "hidden")}>
              <div className="grid gap-2.5 px-5.5 pt-3.5">
                {quote?.lines.map((l) => (
                  <div key={`${l.type}-${l.id}`} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-secondary-foreground">{l.title}</span>
                    <span className="shrink-0 font-bold">{inr(l.price)}</span>
                  </div>
                ))}
                {!!quote?.discount && (
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-secondary-foreground">Coupon{quote.coupon ? ` (${quote.coupon.code})` : ""}</span>
                    <span className="shrink-0 font-bold text-ok-strong">−{inr(quote.discount)}</span>
                  </div>
                )}
                {!!quote?.tax && (
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-secondary-foreground">GST (added at checkout)</span>
                    <span className="shrink-0 font-bold">{inr(quote.tax)}</span>
                  </div>
                )}
              </div>

              {props.couponsEnabled && (
                <div className="mx-5.5 mt-4 border-t border-border pt-4">
                  <CouponField
                    applied={quote?.coupon ?? null}
                    error={quote?.couponError ?? null}
                    onApply={(code) => setCoupon(code)}
                    onRemove={() => setCoupon(null)}
                  />
                </div>
              )}

              <div className="mx-5.5 mt-4 flex items-baseline justify-between gap-3 border-t border-border pt-4">
                <span className="text-base font-extrabold">Total</span>
                <span className="text-[34px] font-extrabold leading-none tracking-[-0.04em]">{inr(quote?.total ?? 0)}</span>
              </div>
              {saved > 0 && <div className="px-5.5 pt-1.5 text-right text-[13px] font-bold text-ok-strong">You save {inr(saved)}{mrpTotal > 0 && ` (${pctOff(quote!.total, mrpTotal)}%)`}</div>}

              <div className="px-5.5 pb-5.5 pt-4.5">
                {error && (
                  <p role="alert" className="mb-3 flex items-start gap-2 rounded-lg bg-bad/10 p-3 text-sm font-medium text-bad"><CircleAlert className="mt-0.5 size-4 shrink-0" />{error}</p>
                )}
                <button
                  type="button"
                  onClick={pay}
                  disabled={!canPay}
                  className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-lg bg-primary text-base font-bold text-primary-foreground shadow-cta transition hover:brightness-106 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
                >
                  {paying && <Loader2 className="size-4 animate-spin" />}
                  {payLabel}
                </button>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <LockIcon className="size-3" /> Payments secured by Cashfree ·{" "}
                  <Link href="/refund-policy" className="inline-flex min-h-11 items-center underline underline-offset-[3px]">Refund policy</Link>
                </div>
                <div className="mt-4.5 grid gap-3 px-1">
                  {[
                    "Your chapters unlock on your account as soon as the payment is confirmed",
                    "Watch on phone and laptop",
                    ...accessParts,
                    `Need help? WhatsApp ${formatPhone(meta.whatsapp)} or call ${supportPhone.display}`,
                  ].map((t) => (
                    <div key={t} className="flex gap-2.5 text-[13px] leading-[1.45] text-secondary-foreground">
                      <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-ok" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </div>
          </aside>
        </div>
        {!empty && (
          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-xs leading-[1.5] text-secondary-foreground min-[900px]:hidden">
            <LockIcon className="size-3 text-ok" /> Secure payment via Cashfree{accessParts.map((p) => ` · ${p}`).join("")} · Support{" "}
            <a href={supportPhone.href} className="inline-flex min-h-11 items-center font-bold underline underline-offset-[3px]">{supportPhone.display}</a> ·{" "}
            <a href={`mailto:${supportEmail}`} className="inline-flex min-h-11 items-center font-bold underline underline-offset-[3px]">{supportEmail}</a>
          </p>
        )}
      </main>

      {/* Phone: sticky total + pay bar */}
      {!empty && (
        <div style={{ bottom: kbOffset }} className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-3.5 border-t border-border bg-card px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_-18px_rgb(0_0_0/0.3)] min-[900px]:hidden">
          <div className="shrink-0">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-[22px] font-extrabold leading-[1.1] tracking-[-0.03em]">{inr(quote?.total ?? 0)}</div>
          </div>
          <button type="button" onClick={pay} disabled={!canPay} className="h-[50px] flex-1 rounded-lg bg-primary text-[15px] font-bold text-primary-foreground disabled:bg-muted disabled:text-muted-foreground">
            {paying ? "Opening payment…" : payLabel}
          </button>
        </div>
      )}
    </>
  );
}

// Email + password sign-in using the existing login server action; returns to checkout.
function InlineLogin({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, undefined);
  const field = "h-12 rounded-lg border border-input bg-card px-3.5 text-base outline-none focus:border-ring focus:ring-3 focus:ring-ring/25";
  return (
    <form action={action} className="px-5.5 pb-5.5 pt-5">
      <p className="mb-4 text-sm leading-[1.5] text-secondary-foreground">Your cart is saved. Sign in so we can unlock your chapters on your account right after you pay.</p>
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-3">
        <label className="grid gap-1.5">
          <span className="text-[13px] font-bold">Email</span>
          <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" className={field} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-bold">Password</span>
          <input name="password" type="password" autoComplete="current-password" required placeholder="Your password" className={field} />
        </label>
        {state?.error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-bad/10 px-3 py-2 text-sm font-medium text-bad"><CircleAlert className="mt-0.5 size-4 shrink-0" />{state.error}</p>}
        <button disabled={pending} className="h-12 rounded-lg bg-foreground text-[15px] font-bold text-white disabled:opacity-60">{pending ? "Signing in…" : "Continue"}</button>
        <span className="text-center text-xs text-muted-foreground">
          New here? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-bold text-primary">Create an account</Link>
        </span>
      </div>
    </form>
  );
}

// On phones the on-screen keyboard can cover a fixed bottom bar (iOS). Track the visual viewport
// and lift the bar by the part of the layout viewport the keyboard hides.
function useKeyboardOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setOffset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);
  return offset;
}
