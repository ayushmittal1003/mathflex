"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { inr } from "@/lib/format";
import { cart } from "../../cart-store";
import { BuyButton } from "../BuyButton";
import { CheckIcon, Mark, SectionHead } from "../primitives";
import { useToast } from "../Toast";
import { cx } from "../ui";

export type BuilderChapter = { id: string; slug: string; title: string; classLevel: number; price: number; free: boolean };
export type BuilderCourse = { id: string; slug: string; title: string; subtitle: string; price: number; mrp: number; highlights: string[]; validityDays: number; chapterIds: string[] };

// Hero tiers: Free (when any chapter has a free Part 1), single chapter, then every course.
// The course with the most chapters is the dark "Best value" card.
export function PricingTiers({ courses, minPrice, maxPrice, freeChapter }: { courses: BuilderCourse[]; minPrice: number | null; maxPrice: number | null; freeChapter: BuilderChapter | null }) {
  const best = courses.length > 1 ? [...courses].sort((a, b) => b.chapterIds.length - a.chapterIds.length)[0].id : null;
  type Tier = { key: string; kicker: string; name: string; from?: string; price: string; mrp?: string; note: string; feats: string[]; best?: boolean; cta: React.ReactNode };
  const btn = (dark: boolean, first: boolean) => cx("flex w-full justify-center rounded-lg border p-3.5 text-[15px] font-bold transition hover:brightness-108", dark ? "border-primary bg-primary text-white" : first ? "border-border bg-card text-foreground" : "border-foreground bg-foreground text-white");

  const tiers: Tier[] = [
    ...(freeChapter ? [{ key: "free", kicker: "Free", name: "Part 1 of a chapter", price: "₹0", note: "No card, no sign-up. Just press play.", feats: ["Part 1 of every chapter marked free", "The same player as paid chapters"], cta: <Link href="/chapters" className={btn(false, true)}>Watch free</Link> }] : []),
    ...(minPrice !== null ? [{ key: "chapter", kicker: "One chapter", name: "Single chapter", from: minPrice !== maxPrice ? "from" : undefined, price: inr(minPrice), note: minPrice !== maxPrice ? `${inr(minPrice)}–${inr(maxPrice!)}, depending on the chapter.` : "Every chapter, one price.", feats: ["Every part of the chapter", "DPPs and PYQs with solutions", "Notes for the chapter"], cta: <Link href="/chapters" className={btn(false, !freeChapter)}>Pick a chapter</Link> }] : []),
    ...courses.map((c) => ({
      key: c.id,
      kicker: "Full course",
      name: c.title,
      price: inr(c.price),
      mrp: c.mrp > c.price ? inr(c.mrp) : undefined,
      note: c.subtitle || `All ${c.chapterIds.length} chapters.`,
      feats: [`All ${c.chapterIds.length} chapters, every part`, ...c.highlights, `${c.validityDays} days of access`],
      best: c.id === best,
      cta: <BuyButton item={{ type: "COURSE", id: c.id }} className={btn(c.id === best, false)}>Get {c.title}</BuyButton>,
    })),
  ];

  return (
    <div className="mx-auto mt-14 grid w-[min(1240px,calc(100%-48px))] grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] items-stretch gap-4">
      {tiers.map((t, i) => (
        <div
          key={t.key}
          className={cx(
            "relative flex animate-mf-rise flex-col rounded-xl border px-6 py-6.5",
            t.best ? "border-foreground bg-foreground text-white shadow-[0_40px_70px_-30px_rgb(80_20_0/0.6)] tablet:-translate-y-3.5" : "border-border bg-card shadow-[0_20px_44px_-30px_rgb(80_20_0/0.4)]",
          )}
          style={{ animationDelay: `${i * 70}ms` }}
        >
          {t.best && <span className="absolute -top-3 left-6 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-white">Best value</span>}
          <div className={cx("text-[13px] font-bold uppercase tracking-[0.08em]", t.best ? "text-white/68" : "text-muted-foreground")}>{t.kicker}</div>
          <div className="mt-2 text-[21px] font-extrabold tracking-[-0.02em]">{t.name}</div>
          <div className="mt-4.5 flex min-h-13 flex-wrap items-baseline gap-x-2 gap-y-1">
            {t.from && <span className={cx("text-[15px] font-semibold", t.best ? "text-white/68" : "text-muted-foreground")}>{t.from}</span>}
            <span className="text-[44px] font-extrabold leading-none tracking-[-0.045em]">{t.price}</span>
            {t.mrp && <span className={cx("text-[15px] line-through", t.best ? "text-white/68" : "text-muted-foreground")}>{t.mrp}</span>}
          </div>
          <div className={cx("mt-2 min-h-9 text-[13px]", t.best ? "text-white/68" : "text-muted-foreground")}>{t.note}</div>
          <div className={cx("my-4.5 h-px", t.best ? "bg-white/18" : "bg-border")} />
          <div className="grid gap-2.5">
            {t.feats.map((f) => (
              <div key={f} className="flex gap-2.5 text-sm leading-[1.4]">
                <CheckIcon className={cx("mt-0.5 size-[15px] shrink-0", t.best ? "text-[oklch(0.8_0.15_60)]" : "text-ok")} />
                <span>{f}</span>
              </div>
            ))}
          </div>
          <span className="min-h-6 flex-1" />
          {t.cta}
        </div>
      ))}
    </div>
  );
}

// "Build your own": pick chapters, see the total, and get told when a course is cheaper.
// Only a suggestion: the real price is recomputed on the server at checkout.
export function PriceBuilder({ chapters, courses, coupon }: { chapters: BuilderChapter[]; courses: BuilderCourse[]; coupon: { code: string; description: string } | null }) {
  const classes = [...new Set(chapters.map((c) => c.classLevel))].sort();
  const [cls, setCls] = useState(classes[0]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const router = useRouter();
  const toast = useToast();
  const list = chapters.filter((c) => c.classLevel === cls);
  const picked = chapters.filter((c) => sel.has(c.id));
  const subtotal = picked.reduce((s, c) => s + c.price, 0);

  // Cheapest of: chapters alone, or one course plus the picked chapters it doesn't cover.
  const plan = useMemo(() => {
    let bestPlan: { course: BuilderCourse | null; total: number; rest: BuilderChapter[] } = { course: null, total: subtotal, rest: picked };
    for (const c of courses) {
      const rest = picked.filter((p) => !c.chapterIds.includes(p.id));
      const total = c.price + rest.reduce((s, p) => s + p.price, 0);
      if (picked.length && total < bestPlan.total && rest.length < picked.length) bestPlan = { course: c, total, rest };
    }
    return bestPlan;
  }, [courses, picked, subtotal]);

  const n = picked.length;
  const toggle = (id: string) => setSel((s) => { const t = new Set(s); if (t.has(id)) t.delete(id); else t.add(id); return t; });
  const tip = !n
    ? { title: "Nothing picked yet", body: "Tap chapters to see your price.", tone: "text-white" }
    : plan.course
      ? { title: `Take ${plan.course.title} instead`, body: `You'd get every chapter in it and save ${inr(subtotal - plan.total)}.`, tone: "text-[oklch(0.8_0.15_60)]" }
      : { title: "Buying chapters is cheapest", body: `A full course would cost more for ${n} chapter${n === 1 ? "" : "s"}.`, tone: "text-[oklch(0.8_0.15_60)]" };

  const addAll = () => {
    if (!n) return;
    if (plan.course) cart.add({ type: "COURSE", id: plan.course.id });
    plan.rest.forEach((c) => cart.add({ type: "CHAPTER", id: c.id }));
    toast(`Added to cart · ${inr(plan.total)}`, { label: "View cart", href: "/checkout" });
    router.prefetch("/checkout");
  };

  return (
    <section id="builder" className="pb-22 pt-24">
      <SectionHead
        eyebrow="Build your own"
        dot="brand-2"
        title={<>Pick your chapters. We&apos;ll find the <Mark>best price</Mark>.</>}
        lead={courses.length ? "Tap the chapters you need. If a full course works out cheaper, we'll tell you." : "Tap the chapters you need to see your total."}
      />
      <div className="mx-auto mt-12 flex w-[min(1180px,calc(100%-48px))] flex-wrap items-start gap-x-10 gap-y-8">
        <div className="min-w-0 flex-[1_1_520px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {classes.length > 1 ? (
              <div className="inline-flex gap-0.5 rounded-lg bg-foreground p-1">
                {classes.map((k) => (
                  <button key={k} type="button" onClick={() => setCls(k)} aria-pressed={k === cls} className={cx("whitespace-nowrap rounded-md px-4 py-2 text-sm font-bold", k === cls ? "bg-card text-foreground" : "text-white/75 hover:text-white")}>Class {k}</button>
                ))}
              </div>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={() => setSel((s) => new Set([...s, ...list.map((c) => c.id)]))} className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-bold">Select all</button>
              <button type="button" onClick={() => setSel(new Set())} className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-bold">Clear</button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))] gap-2.5">
            {list.map((c) => {
              const on = sel.has(c.id);
              return (
                <button key={c.id} type="button" onClick={() => toggle(c.id)} aria-pressed={on} className={cx("flex h-16 items-center gap-3 rounded-xl border-[1.5px] px-3.5 text-left text-foreground transition-colors", on ? "border-primary bg-selected" : "border-border bg-card")}>
                  <span className={cx("grid size-5.5 shrink-0 place-items-center rounded-md border-[1.5px] text-white transition-colors", on ? "border-primary bg-primary" : "border-border bg-card")}>
                    {on && <CheckIcon className="size-3" strokeWidth={3.5} />}
                  </span>
                  <span className="line-clamp-2 min-w-0 flex-1 text-sm font-bold leading-[1.3]">{c.title}</span>
                  <span className="shrink-0 text-sm font-extrabold">{inr(c.price)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="w-full min-w-0 flex-[1_1_320px] min-[900px]:sticky min-[900px]:top-[90px] min-[900px]:max-w-[380px]">
          <div className="overflow-hidden rounded-xl border-[6px] border-foreground bg-foreground text-white shadow-[0_40px_70px_-34px_rgb(80_20_0/0.55)]">
            <div className="px-5.5 pb-4.5 pt-5.5">
              <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-white/60">Your selection</div>
              <div className="mt-2.5 flex items-baseline justify-between gap-3">
                <span className="text-[15px] text-white/80">{n} chapter{n === 1 ? "" : "s"}</span>
                <span className={cx("text-[15px] font-bold text-white/80", plan.course && "line-through")}>{inr(subtotal)}</span>
              </div>
              <div className="mt-3.5 flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-bold">You pay</span>
                <span className="text-[44px] font-extrabold leading-none tracking-[-0.045em]">{inr(plan.total)}</span>
              </div>
            </div>
            <div className="min-h-19 border-t border-white/12 bg-white/7 px-5.5 py-4 text-sm leading-[1.5]">
              <div className={cx("font-bold", tip.tone)}>{tip.title}</div>
              <div className="mt-0.5 text-white/72">{tip.body}</div>
            </div>
            <div className="px-5.5 pb-5.5 pt-4.5">
              <button type="button" onClick={addAll} disabled={!n} className={cx("w-full rounded-lg p-3.5 text-[15px] font-bold text-white", n ? "bg-primary hover:brightness-108" : "cursor-default bg-white/18 opacity-70")}>
                {!n ? "Pick a chapter" : plan.course ? `Add ${plan.course.title}${plan.rest.length ? ` + ${plan.rest.length} chapter${plan.rest.length === 1 ? "" : "s"}` : ""} to cart` : `Add ${n} chapter${n === 1 ? "" : "s"} to cart`}
              </button>
              {coupon && (
                <div className="mt-3 text-center text-xs text-white/60">
                  New here? <b className="font-mono text-white">{coupon.code}</b>{coupon.description && ` · ${coupon.description}`}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

// Dashed coupon code with a copy button (the code itself comes from admin).
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        try { void navigator.clipboard?.writeText(code); } catch {}
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="mt-3.5 flex items-center gap-3.5 self-start rounded-lg border-[1.5px] border-dashed border-foreground bg-card py-2.5 pl-4 pr-3"
    >
      <span className="font-mono text-[19px] font-bold tracking-[0.04em] text-foreground">{code}</span>
      <span className="rounded-md bg-foreground px-2.5 py-1.5 text-xs font-bold text-card">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
