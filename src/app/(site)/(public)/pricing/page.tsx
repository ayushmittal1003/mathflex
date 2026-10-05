import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { inr } from "@/lib/format";
import { fillFaq, instructorNames, pricingFaqs } from "@/lib/site-content";
import { getInsideData, getPublicCoupon } from "@/components/site/web/data";
import { Caret, Eyebrow, Mark } from "@/components/site/web/primitives";
import { WashHero, heroH1, heroLead } from "@/components/site/web/WashHero";
import { FaqList } from "@/components/site/web/FaqList";
import { InsideMathflex } from "@/components/site/web/home/InsideMathflex";
import { PricingTiers, PriceBuilder, CopyCode, type BuilderChapter, type BuilderCourse } from "@/components/site/web/pricing/PricingParts";
import { button, cx, tone } from "@/components/site/web/ui";
import { CtaBand } from "@/components/site/web/CtaBand";

export const metadata = { title: "Pricing" };

// Pricing (dipankar-design/designs/Pricing.dc.html). Prices, courses, coupons, the call
// add-on and GST all come from admin-managed data and settings. The design's photo slots
// have no images, so the add-on cards are text-only.
export default async function PricingPage() {
  const settings = await getSettings();
  const [chapterRows, courseRows, coupon, inside] = await Promise.all([
    db.chapter.findMany({
      where: { isPublished: true },
      orderBy: [{ classLevel: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, slug: true, title: true, classLevel: true, price: true, parts: { where: { isFreePreview: true }, select: { id: true } } },
    }),
    db.course.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, title: true, subtitle: true, price: true, mrp: true, highlights: true, validityDays: true, chapters: { where: { chapter: { isPublished: true } }, select: { chapterId: true } } },
    }),
    getPublicCoupon(settings),
    getInsideData(settings),
  ]);

  const freeOn = settings.features.freePreviews;
  const chapters: BuilderChapter[] = chapterRows.map((c) => ({ id: c.id, slug: c.slug, title: c.title, classLevel: c.classLevel, price: c.price, free: freeOn && c.parts.length > 0 }));
  const courses: BuilderCourse[] = courseRows.map((c) => ({ ...c, chapterIds: c.chapters.map((x) => x.chapterId) }));
  const prices = chapters.map((c) => c.price);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const freeChapter = chapters.find((c) => c.free) ?? null;
  const names = instructorNames(settings);
  const mentorship = settings.features.mentorshipUpsell ? settings : null;

  const faqs = pricingFaqs
    .filter((f) => (f.needs === "free" ? !!freeChapter : f.needs === "gst" ? settings.gstPercent > 0 : true))
    .filter((f) => minPrice !== null || !f.a.includes("{minPrice}"))
    .map((f) => ({ q: f.q, a: fillFaq(f.a, { minPrice: inr(minPrice ?? 0), maxPrice: inr(maxPrice ?? 0), gstPercent: String(settings.gstPercent) }) }));

  return (
    <>
      <WashHero>
        <div className="px-6 pt-10 text-center">
          <Eyebrow dot="ok" onWash>No subscriptions · Pay once</Eyebrow>
          <h1 className={cx(heroH1, "mt-6")}>
            Pay only for what you <Mark onWash>need<Caret /></Mark>
          </h1>
          <p className={cx(heroLead, "mt-5.5 max-w-[580px]")}>
            {freeChapter ? "Start free with Part 1 of a chapter marked free. Then buy" : "Buy"} one chapter or a full course. You pay once, with no monthly fees.
          </p>
        </div>
        <PricingTiers courses={courses} minPrice={minPrice} maxPrice={maxPrice} freeChapter={freeChapter} />
      </WashHero>

      {chapters.length > 0 && <PriceBuilder chapters={chapters} courses={courses} coupon={coupon} />}

      <div>
        <InsideMathflex chapters={inside.chapters} leaders={inside.leaders} resources={inside.resources} eyebrow="Every paid chapter includes" />
      </div>

      <section className="py-16 tablet:py-20">
        <div className="px-6 text-center">
          <Eyebrow>Before you check out</Eyebrow>
          <h2 className="mx-auto mt-6 max-w-[860px] text-[clamp(38px,5.2vw,64px)] font-extrabold leading-[1.02] tracking-[-0.045em] text-balance">
            A few ways to get <Mark>more</Mark> for less.
          </h2>
        </div>
        <div className="mx-auto mt-14 grid w-[min(1180px,calc(100%-48px))] grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-x-7 gap-y-12">
          {mentorship && (
            <AddOn dot="primary" kicker="Add-on" title={`1:1 call with ${names.short}`}>
              <div className="mt-3 flex items-baseline gap-2"><span className="text-[32px] font-extrabold tracking-[-0.04em]">{inr(mentorship.mentorshipPrice)}</span><span className="text-sm text-muted-foreground">per call</span></div>
              <p className="mt-2.5 text-[15px] leading-[1.6] text-secondary-foreground">{mentorship.mentorshipBlurb}</p>
              <Link href="/book-a-call" className="mt-3.5 inline-flex text-sm font-bold text-primary">Book a call with {names.short} →</Link>
            </AddOn>
          )}
          {coupon && (
            <AddOn dot="ok" kicker="Offer" title={coupon.description || "Offer for new students"}>
              <CopyCode code={coupon.code} />
              <p className="mt-3 text-[15px] leading-[1.6] text-secondary-foreground">Enter it at checkout. Only one coupon can be used per order.</p>
            </AddOn>
          )}
          <AddOn dot="muted" kicker="Payment" title="Pay your way">
            <div className="mt-3.5 flex flex-wrap gap-2">
              {["UPI", "Debit / credit card", "Netbanking"].map((m) => <span key={m} className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-bold">{m}</span>)}
            </div>
            <p className="mt-3 text-[15px] leading-[1.6] text-secondary-foreground">
              Secure checkout through Cashfree. Access starts as soon as the payment goes through.{" "}
              <Link href="/refund-policy" className="font-semibold text-primary">Refund policy</Link>
            </p>
          </AddOn>
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="py-16 tablet:py-20">
          <div className="mx-auto w-[min(820px,calc(100%-48px))]">
            <h2 className="text-center text-[clamp(34px,4.2vw,54px)] font-extrabold leading-[1.04] tracking-[-0.045em]">Questions about pricing</h2>
            <div className="mt-9"><FaqList items={faqs} /></div>
          </div>
        </section>
      )}

      <CtaBand>
        <h2 className="mx-auto max-w-[820px] text-[clamp(36px,5vw,64px)] font-extrabold leading-[1.02] tracking-[-0.045em] text-balance">
          {freeChapter ? <>Start with <Mark>₹0</Mark>. Pay when you&apos;re sure.</> : <>Start with <Mark>one</Mark> chapter.</>}
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {freeChapter && <Link href={`/chapter/${freeChapter.slug}`} className={cx(button.md, tone.primaryFlat)}>Watch a free Part 1</Link>}
          <Link href="/chapters" className={cx(button.md, freeChapter ? tone.secondary : tone.primaryFlat)}>Browse chapters</Link>
        </div>
      </CtaBand>
    </>
  );
}

function AddOn({ dot, kicker, title, children }: { dot: "primary" | "ok" | "muted"; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col border-t-2 border-foreground pt-6">
      <div className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-muted px-3 py-1.5 text-[13px] font-semibold text-secondary-foreground">
        <span className={cx("size-1.5 rounded-full", dot === "primary" ? "bg-primary" : dot === "ok" ? "bg-ok" : "bg-muted-foreground")} />
        {kicker}
      </div>
      <h3 className="mt-4 text-[clamp(24px,2.4vw,30px)] font-extrabold leading-[1.1] tracking-[-0.03em]">{title}</h3>
      {children}
    </div>
  );
}
