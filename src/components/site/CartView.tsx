"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Loader2 } from "lucide-react";
import { cart, useCart } from "./cart-store";
import { getQuote, placeOrder } from "@/app/actions/checkout";
import { login, type AuthState } from "@/app/actions/auth";
import { load } from "@cashfreepayments/cashfree-js";
import type { Quote } from "@/lib/pricing";
import { inr, pctOff } from "@/lib/format";
import { SiteLogo } from "./web/SiteLogo";
import { CheckIcon, LockIcon } from "./web/primitives";
import { cx } from "./web/ui";

// Display-only details for cart lines and suggestions (prices always come from getQuote).
export type CheckoutMeta = {
  chapters: Record<string, { title: string; symbol: string; coverFrom: string; coverTo: string; classLevel: number; parts: number; price: number; mrp: number }>;
  courses: { id: string; title: string; price: number; chapterIds: string[]; count: number }[];
  suggestions: string[]; // chapter ids, best first
  user: { name: string; email: string } | null;
  whatsapp: string;
};

export function CartView(props: {
  mentorship: { enabled: boolean; price: number; title: string; blurb: string; mentor: string };
  couponsEnabled: boolean;
  initialMentorship: boolean;
  loggedIn: boolean;
  meta: CheckoutMeta;
}) {
  const items = useCart();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [mentor, setMentor] = useState(props.initialMentorship);
  const [error, setError] = useState<string | null>(null);
  const [needPhone, setNeedPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [paying, startPay] = useTransition();
  const [loading, startLoad] = useTransition();

  useEffect(() => {
    startLoad(async () => setQuote(await getQuote(items, coupon, mentor)));
  }, [items, coupon, mentor]);

  const empty = items.length === 0 && !mentor;

  function pay() {
    setError(null);
    startPay(async () => {
      const res = await placeOrder(items, coupon, mentor, needPhone ? phone : undefined);
      if (!res.ok) {
        if (res.login) router.push(`/login?next=${encodeURIComponent("/cart" + (mentor ? "?mentorship=1" : ""))}`);
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
  const inCart = new Set(items.map((i) => i.id));
  const signedIn = props.loggedIn;
  const canPay = !paying && !loading && !!quote?.lines.length;
  const mrpTotal = quote?.lines.reduce((s, l) => s + l.mrp, 0) ?? 0;
  const saved = quote ? mrpTotal - quote.subtotal + quote.discount : 0;
  const step = empty ? 0 : signedIn ? 2 : 1;

  // Course upgrade hint: chapters in the cart that a single course already covers.
  const upgrade = (() => {
    const cartChapters = items.filter((i) => i.type === "CHAPTER").map((i) => i.id);
    if (!cartChapters.length) return null;
    const options = meta.courses
      .filter((c) => !inCart.has(c.id))
      .map((c) => {
        const covered = cartChapters.filter((id) => c.chapterIds.includes(id));
        const coveredPrice = covered.reduce((s, id) => s + (meta.chapters[id]?.price ?? 0), 0);
        return { c, covered, diff: c.price - coveredPrice };
      })
      .filter((o) => o.covered.length >= 2)
      .sort((a, b) => a.diff - b.diff);
    return options[0] ?? null;
  })();
  const applyUpgrade = () => {
    if (!upgrade) return;
    upgrade.covered.forEach((id) => cart.remove(id));
    cart.add({ type: "COURSE", id: upgrade.c.id });
  };
  const addOns = meta.suggestions.filter((id) => !inCart.has(id) && !meta.courses.some((c) => inCart.has(c.id) && c.chapterIds.includes(id))).slice(0, 3);

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
        <div className="mx-auto grid h-18 w-[min(1160px,calc(100%-48px))] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
          <Link href="/" className="justify-self-start" aria-label="Mathflex home"><SiteLogo className="h-[25px]" /></Link>
          <ol className="hidden items-center gap-2.5 tablet:flex" aria-label="Checkout steps">
            {["Cart", "Sign in", "Pay"].map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={label} className="flex items-center gap-2.5">
                  <span className={cx("flex items-center gap-2 text-[13px] font-bold", done || active ? "text-foreground" : "text-muted-foreground")} aria-current={active ? "step" : undefined}>
                    <span className={cx("grid size-5.5 place-items-center rounded-full text-[11px] font-extrabold", done ? "bg-ok text-white" : active ? "bg-foreground text-white" : "bg-muted text-muted-foreground")}>
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

      <main className="mx-auto w-[min(1160px,calc(100%-48px))] pb-28 pt-10 tablet:pb-20">
        <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
          <h1 className="text-[clamp(32px,4vw,48px)] font-extrabold leading-[1.05] tracking-[-0.04em]">Checkout</h1>
          <Link href="/chapters" className="text-sm font-bold text-primary">← Keep browsing</Link>
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
                      <span className={cx("rounded px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em]", l.type === "COURSE" ? "bg-primary text-white" : "bg-muted text-secondary-foreground")}>
                        {l.type === "COURSE" ? "Course" : "Chapter"}
                      </span>
                      <div className="mt-1.5 text-base font-bold tracking-[-0.015em]">{l.title}</div>
                      <div className="mt-0.5 text-[13px] text-muted-foreground">
                        {ch ? `Class ${ch.classLevel} · ${ch.parts} parts · DPPs, PYQs, notes` : course ? `${course.count} chapters` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[17px] font-extrabold tracking-[-0.02em]">{inr(l.price)}</div>
                      {l.mrp > l.price && <div className="text-xs text-muted-foreground line-through">{inr(l.mrp)}</div>}
                      <button type="button" onClick={() => cart.remove(l.id!)} className="mt-1.5 text-xs font-bold text-muted-foreground underline underline-offset-[3px] hover:text-bad">Remove</button>
                    </div>
                  </div>
                );
              })}
              {!!quote?.skipped.length && (
                <p className="mx-5.5 my-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">Removed from the bill because you already own them: {quote.skipped.join(", ")}</p>
              )}
              {empty && (
                <div className="px-5.5 py-12 text-center">
                  <div className="text-xl font-extrabold tracking-[-0.02em]">Your cart is empty</div>
                  <p className="mt-1.5 text-sm text-muted-foreground">Pick a chapter or a full course to get started.</p>
                  <div className="mt-4.5 flex flex-wrap justify-center gap-2">
                    <Link href="/chapters" className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-bold text-white">Browse chapters</Link>
                    <Link href="/courses" className="rounded-lg border border-border px-4 py-2.5 text-sm font-bold">See courses</Link>
                  </div>
                </div>
              )}
              {!empty && !loading && quote && lines.length === 0 && !mentor && (
                <p className="px-5.5 py-6 text-sm text-muted-foreground">Nothing left to pay for.</p>
              )}
              {upgrade && upgrade.diff < upgrade.c.price && (
                <div className="mx-5.5 my-4.5 flex flex-wrap items-center gap-x-4.5 gap-y-3.5 rounded-xl border-[1.5px] border-dashed border-primary/45 bg-[color-mix(in_oklab,var(--brand-2)_7%,var(--card))] px-4.5 py-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-primary to-brand-2 text-white">
                    <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                  </span>
                  <div className="min-w-0 flex-[1_1_240px]">
                    <div className="text-[15px] font-extrabold tracking-[-0.01em]">
                      {upgrade.diff > 0 ? `All of ${upgrade.c.title} for ${inr(upgrade.diff)} more` : `${upgrade.c.title} is ${inr(-upgrade.diff)} cheaper`}
                    </div>
                    <div className="mt-0.5 text-[13px] leading-[1.45] text-secondary-foreground">Swap these chapters for the full course and get all {upgrade.c.count} chapters.</div>
                  </div>
                  <button type="button" onClick={applyUpgrade} className="shrink-0 whitespace-nowrap rounded-lg bg-foreground px-4 py-2.5 text-sm font-bold text-white hover:brightness-130">
                    {upgrade.diff > 0 ? "Upgrade" : "Switch and save"}
                  </button>
                </div>
              )}
            </section>

            {/* Upsell: the existing mentorship add-on */}
            {props.mentorship.enabled && (
              <section className={card}>
                <div className="flex flex-wrap items-stretch">
                  <div className="relative grid min-h-[150px] flex-[0_0_100%] place-items-center bg-video-stripes text-white tablet:flex-[0_0_200px]">
                    <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_100%,color-mix(in_oklab,var(--primary)_35%,transparent),transparent_70%)]" />
                    <svg className="relative size-10 text-white/85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
                    </svg>
                  </div>
                  <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 px-5.5 py-5">
                    <span className="self-start rounded bg-foreground px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-white">Recommended</span>
                    <div>
                      <div className="text-lg font-extrabold tracking-[-0.02em]">{props.mentorship.title}</div>
                      <div className="mt-1 text-sm leading-[1.5] text-secondary-foreground">{props.mentorship.blurb}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMentor((m) => !m)}
                      aria-pressed={mentor}
                      className={cx("flex items-center gap-3 self-start rounded-[10px] border-[1.5px] py-2.5 pl-2.5 pr-3.5 text-foreground transition", mentor ? "border-primary bg-selected" : "border-border bg-card")}
                    >
                      <span className={cx("grid size-5.5 place-items-center rounded-md border-[1.5px] text-white transition-colors", mentor ? "border-primary bg-primary" : "border-border bg-card")}>
                        {mentor && <CheckIcon className="size-3" strokeWidth={3.5} />}
                      </span>
                      <span className="text-sm font-bold">{mentor ? "Added to your order" : "Add the call"}</span>
                      <span className="text-sm font-extrabold">{inr(props.mentorship.price)}</span>
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Upsell: more chapters (real catalog, highest JEE weightage first) */}
            {!empty && addOns.length > 0 && (
              <section className="rounded-xl border border-border bg-card px-5.5 py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
                  <h2 className="text-[17px] font-extrabold tracking-[-0.02em]">Students often add</h2>
                  <Link href="/chapters" className="text-[13px] font-bold text-primary">See all chapters →</Link>
                </div>
                <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-2.5">
                  {addOns.map((id) => {
                    const a = meta.chapters[id];
                    return (
                      <div key={id} className="flex animate-mf-rise items-center gap-3 rounded-[10px] border border-border p-3">
                        <span className={cx("grid size-11 shrink-0 place-items-center rounded-lg font-black text-white", a.symbol.length > 2 ? "text-xs" : "text-lg")} style={{ background: `linear-gradient(155deg, ${a.coverFrom}, ${a.coverTo})` }}>{a.symbol}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{a.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {inr(a.price)} {a.mrp > a.price && <span className="line-through">{inr(a.mrp)}</span>}
                          </span>
                        </span>
                        <button type="button" onClick={() => cart.add({ type: "CHAPTER", id })} className="h-[34px] shrink-0 rounded-lg border border-foreground bg-card px-3 text-[13px] font-bold text-foreground hover:bg-foreground hover:text-white">+ Add</button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

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
                  <span className="ml-auto shrink-0 rounded-md bg-ok/14 px-2 py-1 text-xs font-bold text-[oklch(0.5_0.16_149)]">Signed in</span>
                </div>
              ) : (
                <InlineLogin next={`/checkout${mentor ? "?mentorship=1" : ""}`} />
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
          <aside className="w-full min-w-0 flex-[1_1_340px] min-[900px]:sticky min-[900px]:top-6 min-[900px]:max-w-[380px]">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_48px_-32px_rgb(80_20_0/0.4)]">
              <h2 className="px-5.5 pt-5 text-[19px] font-extrabold tracking-[-0.02em]">Order summary</h2>
              <div className="grid gap-2.5 px-5.5 pt-3.5">
                {quote?.lines.map((l) => (
                  <div key={`${l.type}-${l.id}`} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-secondary-foreground">{l.title}</span>
                    <span className="shrink-0 font-bold">{inr(l.price)}</span>
                  </div>
                ))}
                {!!quote?.discount && (
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-secondary-foreground">{quote.coupon?.code ?? "Coupon"}</span>
                    <span className="shrink-0 font-bold text-[oklch(0.5_0.16_149)]">−{inr(quote.discount)}</span>
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
                  {quote?.coupon ? (
                    <div className="flex items-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-ok bg-ok/7 px-3 py-2.5">
                      <CheckIcon className="size-4 text-[oklch(0.5_0.16_149)]" strokeWidth={2.5} />
                      <span className="flex-1 text-[13px]"><b className="font-mono">{quote.coupon.code}</b> applied · {quote.coupon.message}</span>
                      <button type="button" onClick={() => { setCoupon(null); setCouponInput(""); }} className="text-xs font-bold text-muted-foreground underline underline-offset-[3px]">Remove</button>
                    </div>
                  ) : (
                    <>
                      <form onSubmit={(e) => { e.preventDefault(); setCoupon(couponInput.trim() || null); }} className="flex gap-2">
                        <input
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          placeholder="Coupon code"
                          aria-label="Coupon code"
                          className="h-[42px] min-w-0 flex-1 rounded-lg border border-input bg-card px-3 font-mono text-sm uppercase outline-none focus:border-ring"
                        />
                        <button className="h-[42px] shrink-0 rounded-lg border border-foreground bg-card px-3.5 text-[13px] font-bold">Apply</button>
                      </form>
                      {quote?.couponError && (
                        <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-destructive"><CircleAlert className="mt-px size-3.5 shrink-0" />{quote.couponError}</p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="mx-5.5 mt-4 flex items-baseline justify-between gap-3 border-t border-border pt-4">
                <span className="text-base font-extrabold">Total</span>
                <span className="text-[34px] font-extrabold leading-none tracking-[-0.04em]">{inr(quote?.total ?? 0)}</span>
              </div>
              {saved > 0 && <div className="px-5.5 pt-1.5 text-right text-[13px] font-bold text-[oklch(0.5_0.16_149)]">You save {inr(saved)}{mrpTotal > 0 && ` (${pctOff(quote!.total, mrpTotal)}%)`}</div>}

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
                  <Link href="/refund-policy" className="underline underline-offset-[3px]">Refund policy</Link>
                </div>
                <div className="mt-4.5 grid gap-3 px-1">
                  {[
                    "Your chapters unlock on your account as soon as the payment is confirmed",
                    "Watch on phone and laptop",
                    `Need help? WhatsApp us on +${meta.whatsapp}`,
                  ].map((t) => (
                    <div key={t} className="flex gap-2.5 text-[13px] leading-[1.45] text-secondary-foreground">
                      <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-ok" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Phone: sticky total + pay bar */}
      {!empty && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-3.5 border-t border-border bg-card px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_-18px_rgb(0_0_0/0.3)] min-[900px]:hidden">
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
