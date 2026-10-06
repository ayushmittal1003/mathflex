import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { inr } from "@/lib/format";
import { faqGroups, fillFaq, instructorNames } from "@/lib/site-content";
import { Eyebrow, Mark } from "@/components/site/web/primitives";
import { FaqBrowser } from "@/components/site/web/FaqBrowser";
import { button, cx, tone } from "@/components/site/web/ui";
import { CtaBand } from "@/components/site/web/CtaBand";

export const metadata = { title: "FAQs", alternates: { canonical: "/faq" } };

// FAQ (dipankar-design/designs/FAQ.dc.html). The approved answers in lib/site-content.ts,
// with settings filled in. The 1:1 call group only shows while the call add-on is on.
export default async function FaqPage() {
  const settings = await getSettings();
  const mindMaps = await db.resource.count({ where: { type: "MINDMAP", isPublished: true } });
  const names = instructorNames(settings);
  const vars = {
    supportEmail: settings.supportEmail,
    mentorShort: names.short,
    mentorshipBlurb: settings.mentorshipBlurb,
    mentorshipPrice: inr(settings.mentorshipPrice),
    notesKind: mindMaps > 0 ? "notes and mind maps" : "notes",
  };
  const groups = faqGroups
    .filter((g) => g.id !== "call" || settings.features.mentorshipUpsell)
    .map((g) => ({ id: g.id, title: fillFaq(g.title, vars), items: g.items.map((f) => ({ q: fillFaq(f.q, vars), a: fillFaq(f.a, vars) })) }));

  return (
    <>
      <section className="px-6 pt-[calc(86px+40px)] text-center">
        <Eyebrow dot="brand-2">Help centre</Eyebrow>
        <h1 className="mx-auto mt-5.5 max-w-[900px] text-[clamp(42px,6.4vw,84px)] font-extrabold leading-none tracking-[-0.045em] text-balance">
          How can we <Mark>help</Mark>?
        </h1>
      </section>
      <FaqBrowser groups={groups} />
      <CtaBand>
        <h2 className="mx-auto max-w-[760px] text-[clamp(34px,4.6vw,58px)] font-extrabold leading-[1.04] tracking-[-0.045em] text-balance">
          Still have a <Mark>question</Mark>?
        </h2>
        <p className="mx-auto mt-4.5 max-w-[500px] text-[17px] leading-[1.55] text-secondary-foreground">Write to us and a real person replies, usually within one working day.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          <Link href="/contact" className={cx(button.md, tone.primary)}>Contact us</Link>
          <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noreferrer" className={cx(button.md, tone.secondary)}>WhatsApp us</a>
        </div>
      </CtaBand>
    </>
  );
}
