import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getPublicCoupon } from "@/components/site/web/data";
import { validity } from "@/lib/format";
import { buildMetadata } from "@/lib/seo/metadata";
import { instructor, instructorNames, mentorProfile } from "@/lib/site-content";
import { SiteLogo } from "@/components/site/web/SiteLogo";
import { CheckIcon, Marked } from "@/components/site/web/primitives";
import { MetaViewContent } from "@/components/site/web/MetaViewContent";
import { StartChapters, StartCourseCard, StartStickyBar, type StartChapter } from "@/components/site/web/start/StartChapters";

// Landing page for Instagram ads: built for a phone, one job (pick a chapter and pay). Out of
// search (seo.md §1) and without the site nav, so nothing pulls the visitor away.
export const metadata = buildMetadata({
  title: "JEE Maths, One Chapter at a Time",
  description: "Short JEE maths video lessons by an IIT Delhi alumnus, with PYQs after every part. Watch a free preview, then buy only the chapter you need.",
  path: "/start",
  noindex: true,
});

export default async function StartPage() {
  const settings = await getSettings();
  const freeOn = settings.features.freePreviews;
  const [rows, courses, pyqs, coupon] = await Promise.all([
    db.chapter.findMany({
      where: { isPublished: true },
      orderBy: [{ jeeWeightage: "desc" }, { sortOrder: "asc" }],
      select: { id: true, slug: true, title: true, classLevel: true, price: true, mrp: true, jeeWeightage: true, coverImage: true, coverFrom: true, coverTo: true, symbol: true, validityDays: true, parts: { orderBy: { order: "asc" }, select: { order: true, isFreePreview: true } } },
    }),
    db.course.findMany({ where: { isPublished: true }, select: { id: true, title: true, price: true, mrp: true, highlights: true, _count: { select: { chapters: true } } } }),
    db.question.groupBy({ by: ["chapterId"], where: { type: "PYQ", isPublished: true }, _count: { _all: true } }),
    getPublicCoupon(settings),
  ]);
  const pyqBy = new Map(pyqs.map((p) => [p.chapterId, p._count._all]));
  const chapters: StartChapter[] = rows
    .filter((c) => c.parts.length > 0)
    .map((c) => {
      const free = freeOn ? c.parts.find((p) => p.isFreePreview) : undefined;
      return {
        id: c.id, slug: c.slug, title: c.title, classLevel: c.classLevel, price: c.price, mrp: c.mrp, jeeWeightage: c.jeeWeightage,
        parts: c.parts.length, pyqs: pyqBy.get(c.id) ?? 0, cover: c.coverImage, coverFrom: c.coverFrom, coverTo: c.coverTo, symbol: c.symbol,
        previewHref: free ? `/learn/${c.slug}?part=${free.order}` : null,
      };
    });
  const minPrice = chapters.length ? Math.min(...chapters.map((c) => c.price)) : null;
  const best = [...courses].sort((a, b) => b._count.chapters - a._count.chapters)[0];
  const preview = chapters.find((c) => c.previewHref);
  const names = instructorNames(settings);
  const access = rows[0]?.validityDays ? validity(rows[0].validityDays) : null;
  const h = settings.home;
  const offer = coupon ? `${coupon.code}: ${coupon.description}` : null;

  return (
    <div className="min-h-dvh pb-24 sm:pb-10">
      <MetaViewContent id="start" name="Instagram landing" value={minPrice ?? 0} kind="chapter" />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 w-[min(720px,calc(100%-32px))] items-center justify-between">
          <Link href="/" aria-label="Mathflex home" className="tap relative inline-block"><SiteLogo className="h-[22px]" /></Link>
          <a href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent("Hi, I saw your Instagram ad and have a question about Mathflex.")}`} target="_blank" rel="noreferrer" className="text-[14px] font-bold text-secondary-foreground">Ask on WhatsApp</a>
        </div>
      </header>

      <main id="main" className="mx-auto w-[min(720px,calc(100%-32px))]">
        {/* The hook: one screen, one promise, one action. */}
        <section className="relative mt-4 overflow-hidden rounded-2xl bg-foreground px-5 pb-6 pt-5 text-white">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-primary/45 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-brand-2/30 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-bold">Class 11 &amp; 12 · JEE Main &amp; Advanced</span>
            <h1 className="mt-3.5 text-[clamp(28px,8vw,44px)] font-extrabold leading-[1.06] tracking-[-0.04em] [&_span]:text-foreground"><Marked text={h.adTitle} /></h1>
            <p className="mt-3 text-[15px] leading-[1.55] text-white/75">{h.adSubtitle}</p>
            {coupon && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-dashed border-white/35 bg-white/8 px-3 py-2.5">
                <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[13px] font-extrabold tracking-[0.05em] text-foreground">{coupon.code}</span>
                <span className="text-[13px] font-semibold leading-tight">{coupon.description}{coupon.minAmount > 0 ? "" : " · applied for you at checkout"}</span>
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {preview?.previewHref ? (
                <Link href={preview.previewHref} className="flex h-12 items-center justify-center rounded-lg bg-white text-[15px] font-bold text-foreground">▶ Free preview</Link>
              ) : <span />}
              <a href="#chapters" className="flex h-12 items-center justify-center rounded-lg bg-primary text-[15px] font-bold text-primary-foreground">Choose chapter</a>
            </div>
          </div>
        </section>

        {/* Why trust it, in one glance. */}
        <ul className="mt-4 grid grid-cols-2 gap-2 text-[13px] font-semibold">
          {[
            `${names.short}, ${mentorProfile(settings).title.replace(/\s*\(\d{4}\)$/, "")}`,
            `${instructor.studentsGuided} students guided`,
            "Free 3–4 min preview, no sign-up",
            access ? `${access} access, phone & laptop` : "Watch on phone & laptop",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2.5 leading-snug">
              <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-ok" strokeWidth={3.5} /> {t}
            </li>
          ))}
        </ul>

        <section id="chapters" className="scroll-mt-4 pt-7">
          <h2 className="text-[22px] font-extrabold tracking-[-0.03em]">Pick the chapter that&apos;s costing you marks</h2>
          <p className="mb-3 mt-1 text-[14px] text-muted-foreground">Highest JEE weightage first. Every chapter: short video parts, PYQs and DPPs after each part, notes.</p>
          <StartChapters chapters={chapters} coupon={coupon ? { code: coupon.code, minAmount: coupon.minAmount } : null} />
        </section>

        {best && (
          <section className="pt-7">
            <StartCourseCard course={{ id: best.id, title: best.title, price: best.price, mrp: best.mrp, chapters: best._count.chapters, highlights: best.highlights }} coupon={coupon ? { code: coupon.code, minAmount: coupon.minAmount } : null} />
          </section>
        )}

        <section className="pt-7">
          <h2 className="text-[20px] font-extrabold tracking-[-0.03em]">How it works</h2>
          <ol className="mt-3 grid gap-2">
            {[
              ["Pay once with UPI, card or netbanking", "No subscription. The chapter opens the moment you pay."],
              ["Watch short parts at your pace", "Rewatch any part as often as you like."],
              ["Solve PYQs right after each part", "Worked solutions for every question you get wrong."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3 rounded-xl border border-border bg-card p-3.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground text-[13px] font-extrabold text-card">{i + 1}</span>
                <span><b className="block text-[15px]">{t}</b><span className="text-[13px] text-muted-foreground">{d}</span></span>
              </li>
            ))}
          </ol>
        </section>

        <section className="pt-7 text-center">
          <p className="text-[15px] font-semibold">Not sure which chapter?</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <Link href="/enquiry" className="flex h-12 items-center justify-center rounded-lg border border-border bg-card text-[14px] font-bold">Get a free call</Link>
            <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center rounded-lg border border-border bg-card text-[14px] font-bold">WhatsApp us</a>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Secure payment · <Link href="/refund-policy" className="underline">Refund policy</Link> · <Link href="/" className="underline">Visit full website</Link></p>
        </section>
      </main>
      <StartStickyBar minPrice={minPrice} offer={offer} />
    </div>
  );
}
