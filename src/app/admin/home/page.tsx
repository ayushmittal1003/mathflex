import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPublicCoupon } from "@/components/site/web/data";
import { comparison } from "@/lib/site-content";
import { Card, Field, PageHeader, SubmitButton, Toggle } from "@/components/admin/ui";
import { saveHomeContent } from "../actions";

export const metadata = { title: "Home page" };

const SECTIONS: [keyof Awaited<ReturnType<typeof getSettings>>["home"]["sections"], string, string][] = [
  ["previews", "Try a chapter before you buy", "Chapter previews with the chapter list"],
  ["problem", "The real cost", "Coaching price against Mathflex"],
  ["how", "How a chapter works", "The four steps with the demo"],
  ["inside", "Everything for a chapter, in one place", "My Learning dashboard preview"],
  ["mentor", "Your mentor", "Karan's video, bio and the Book a call card"],
  ["compare", "Why Mathflex", "Comparison table"],
  ["pricing", "Pricing", "Chapter and course cards with the coupon"],
  ["faq", "FAQ", "Questions, with Chat on WhatsApp after them"],
  ["finalCta", "Final call to action", "The closing banner above the footer"],
];

const FAQ_SLOTS = 12;

// Everything on the home page that changes often, editable without a deploy.
export default async function HomeContentPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireStaff("banners");
  const [s, { saved }] = await Promise.all([getSettings(), searchParams]);
  const h = s.home;
  const [shown, coupons] = await Promise.all([
    getPublicCoupon(s),
    db.coupon.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" }, select: { code: true, isPublic: true }, take: 30 }),
  ]);
  const faqs = [...h.faqs, ...Array.from({ length: Math.max(0, FAQ_SLOTS - h.faqs.length) }, () => ({ q: "", a: "" }))].slice(0, FAQ_SLOTS);

  return (
    <form action={saveHomeContent} className="max-w-4xl space-y-6">
      <PageHeader
        title="Home page"
        subtitle="Show or hide sections and edit the text. Live as soon as you save, no deploy needed. Wrap words in *stars* to highlight them in a heading."
        action={<div className="flex items-center gap-2"><Link href="/" target="_blank" className="text-sm font-semibold text-muted hover:text-brand">View home ↗</Link><SubmitButton>Save</SubmitButton></div>}
      />
      {saved && <p className="rounded-xl bg-ok/10 p-3 text-sm font-semibold text-ok">Saved. The home page is updated.</p>}

      <Card title="Sections">
        <div className="grid gap-1 sm:grid-cols-2">
          {SECTIONS.map(([k, label, hint]) => <Toggle key={k} name={`sections.${k}`} label={label} hint={hint} defaultChecked={h.sections[k]} />)}
        </div>
      </Card>

      <Card title="Header, offer and checkout">
        <div className="grid gap-4 sm:grid-cols-2">
          <Toggle name="bookCallInHeader" label="“Book a call” button next to Log in" hint={s.features.mentorshipUpsell ? "On every page of the website" : "Needs Mentorship upsell switched on in Settings"} defaultChecked={h.bookCallInHeader} />
          <Toggle name="callPreticked" label="Tick the 1:1 call by default at checkout" hint="Off is recommended: students add it themselves, so nobody is surprised by the total" defaultChecked={h.callPreticked} />
          <Field label="Coupon under the pricing cards and at checkout" hint={`Empty = the newest active public coupon. Showing now: ${shown ? `${shown.code} · ${shown.description}` : "none"}`}>
            <input name="featuredCoupon" list="coupon-codes" defaultValue={h.featuredCoupon} placeholder="e.g. WELCOME10" className="input font-mono uppercase" />
            <datalist id="coupon-codes">{coupons.map((c) => <option key={c.code} value={c.code}>{c.isPublic ? "public" : "private"}</option>)}</datalist>
          </Field>
        </div>
      </Card>

      <Card title="Instagram ad page (/start)" action={<Link href="/start" target="_blank" className="text-sm font-semibold text-brand">Open ↗</Link>}>
        <div className="grid gap-4">
          <Field label="Headline" hint="Wrap words in *stars* to highlight them"><input name="adTitle" defaultValue={h.adTitle} className="input" /></Field>
          <Field label="Line under the headline"><textarea name="adSubtitle" rows={2} defaultValue={h.adSubtitle} className="input" /></Field>
        </div>
      </Card>

      <Card title="Your mentor">
        <div className="grid gap-4">
          <Field label="Credential" hint="Shown on the credential card and under Karan's name across the site"><input name="mentorTitle" defaultValue={h.mentorTitle} className="input" /></Field>
          <Field label="Bio" hint="Follows his name, e.g. “Karan Mittal is an IIT Delhi alumnus…”"><textarea name="mentorBio" rows={4} defaultValue={h.mentorBio} className="input" /></Field>
        </div>
      </Card>

      <Card title="The real cost">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Small label above the heading"><input name="problemEyebrow" defaultValue={h.problemEyebrow} className="input" /></Field>
          <Field label="Heading"><input name="problemTitle" defaultValue={h.problemTitle} className="input" /></Field>
          <Field label="Line under the heading" className="sm:col-span-2"><input name="problemLead" defaultValue={h.problemLead} className="input" /></Field>
          <Field label="Competitor"><input name="coachingName" defaultValue={h.coachingName} className="input" /></Field>
          <Field label="Competitor price per year (₹)"><input name="coachingPrice" type="number" min={1} defaultValue={h.coachingPrice} className="input" /></Field>
          <Field label="Competitor note" className="sm:col-span-2"><input name="coachingNote" defaultValue={h.coachingNote} className="input" /></Field>
          <Field label="Closing line" hint="{percent} = full Mathflex syllabus as a share of one coaching year. {fullPrice} and {minPrice} also work." className="sm:col-span-2"><input name="problemConclusion" defaultValue={h.problemConclusion} className="input" /></Field>
        </div>
      </Card>

      <Card title="How a chapter works">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Heading"><input name="howTitle" defaultValue={h.howTitle} className="input" /></Field>
          <Field label="Line under the heading"><input name="howLead" defaultValue={h.howLead} className="input" /></Field>
        </div>
      </Card>

      <Card title="Why Mathflex (comparison table)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First line (smaller, grey)"><input name="compareKicker" defaultValue={h.compareKicker} className="input" /></Field>
          <Field label="Second line (large)"><input name="compareTitle" defaultValue={h.compareTitle} className="input" /></Field>
          <div>
            <p className="mb-1 text-sm font-semibold">Columns</p>
            {comparison.columns.map((c) => <Toggle key={c.key} name={`compareColumns.${c.key}`} label={c.label} defaultChecked={h.compareColumns[c.key as keyof typeof h.compareColumns]} />)}
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold">Rows</p>
            {comparison.rows.map((r) => <Toggle key={r.key} name={`compareRows.${r.key}`} label={r.label} defaultChecked={h.compareRows[r.key as keyof typeof h.compareRows]} />)}
          </div>
        </div>
      </Card>

      <Card title="FAQs on the home page" action={<span className="text-xs text-muted">Leave a question empty to remove it</span>}>
        <p className="mb-4 text-xs text-muted">
          In answers: start a line with “- ” for a bullet, wrap **words** in double stars for bold, and write [label](/path) for a link. A blank line starts a new paragraph. {"{supportEmail}"}, {"{mentorShort}"} and {"{mentorshipPrice}"} are filled in.
        </p>
        <div className="space-y-4">
          {faqs.map((f, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-border p-3">
              <input name={`faq.${i}.q`} defaultValue={f.q} placeholder={`Question ${i + 1}`} className="input font-semibold" />
              <textarea name={`faq.${i}.a`} defaultValue={f.a} rows={f.a.includes("\n") ? 6 : 3} placeholder="Answer" className="input" />
            </div>
          ))}
        </div>
      </Card>
      <SubmitButton>Save</SubmitButton>
    </form>
  );
}
