import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { inr } from "@/lib/format";
import { buildMetadata } from "@/lib/seo/metadata";
import { instructor, instructorNames, mentorProfile } from "@/lib/site-content";
import { EnquiryForm } from "@/components/site/web/EnquiryForm";
import { SiteLogo } from "@/components/site/web/SiteLogo";
import { CheckIcon, Marked } from "@/components/site/web/primitives";

// Landing page for paid ads, so it stays out of search results (seo.md §1) and has no site nav.
export const metadata = buildMetadata({
  title: "Free JEE Maths Guidance Call",
  description: "Tell us your class and weak chapters. An IIT Delhi alumnus's team calls you with a free chapter-wise JEE maths plan.",
  path: "/enquiry",
  noindex: true,
});

export default async function EnquiryPage() {
  const settings = await getSettings();
  const e = settings.enquiry;
  const names = instructorNames(settings);
  const min = await db.chapter.aggregate({ where: { isPublished: true }, _min: { price: true }, _count: true });
  const points = [
    `A free call with ${names.short}'s team, ${mentorProfile(settings).title.replace(/\s*\(\d{4}\)$/, "")}`,
    "A chapter-wise plan for the topics costing you marks",
    `Free 3–4 minute preview of every chapter${min._min.price ? `, full chapters from ${inr(min._min.price)}` : ""}`,
  ];
  const proof = (
    <>
      <ul className="mt-7 grid gap-3.5">
        {points.map((p) => (
          <li key={p} className="flex gap-3 text-[15px] leading-[1.5]">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary"><CheckIcon className="size-3.5" strokeWidth={3.5} /></span>
            {p}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex items-center gap-3.5 border-t border-white/12 pt-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-brand-2 text-[15px] font-black">{names.full.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
        <span className="text-sm leading-[1.45] text-white/80">
          <b className="block text-[15px] text-white">{instructor.studentsGuided} JEE aspirants guided</b>
          by {names.full}, {instructor.credentialShort}
        </span>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-[min(1160px,calc(100%-32px))] items-center justify-between gap-4">
          <Link href="/" className="tap relative inline-block" aria-label="Mathflex home"><SiteLogo className="h-[24px]" /></Link>
          <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-secondary-foreground hover:text-foreground">WhatsApp us</a>
        </div>
      </header>

      <main id="main" className="mx-auto grid w-[min(1160px,calc(100%-32px))] items-start gap-6 py-6 tablet:py-12 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,460px)] min-[900px]:gap-12">
        {/* Why fill it in */}
        <section className="relative overflow-hidden rounded-2xl bg-foreground px-5 py-6 text-white tablet:px-10 tablet:py-12 min-[900px]:sticky min-[900px]:top-8">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/40 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 size-72 rounded-full bg-brand-2/30 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-bold">
              <span className="size-1.5 animate-pulse rounded-full bg-ok" /> {e.eyebrow}
            </span>
            <h1 className="mt-4 text-[clamp(28px,4.4vw,52px)] tablet:mt-5 font-extrabold leading-[1.04] tracking-[-0.045em] text-balance [&_span]:text-foreground">
              <Marked text={e.title} />
            </h1>
            <p className="mt-3 max-w-[520px] text-[15px] leading-[1.55] text-white/75 tablet:mt-4 tablet:text-[16px]">{e.subtitle}</p>
            {/* Phones: the form comes straight after the heading; these points move below it. */}
            <div className="max-[899px]:hidden">{proof}</div>
          </div>
        </section>

        {/* The form */}
        <section aria-label="Enquiry form" className="rounded-2xl border border-border bg-card p-5 shadow-[0_30px_60px_-36px_rgb(80_20_0/0.45)] tablet:p-7">
          {e.enabled ? (
            <EnquiryForm promise={e.promise} whatsapp={settings.whatsappNumber} />
          ) : (
            <div className="py-8 text-center">
              <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Talk to us on WhatsApp</h2>
              <p className="mt-2 text-[15px] text-secondary-foreground">Our enquiry form is paused. Message us and a real person replies.</p>
              <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-12 items-center rounded-lg bg-primary px-5 font-bold text-primary-foreground">WhatsApp us</a>
            </div>
          )}
        </section>
        <section aria-label="Why Mathflex" className="rounded-2xl bg-foreground px-5 pb-6 pt-1 text-white min-[900px]:hidden">{proof}</section>
      </main>
    </div>
  );
}
