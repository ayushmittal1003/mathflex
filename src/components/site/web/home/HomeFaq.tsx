import { Eyebrow, Mark } from "../primitives";
import { FaqList } from "../FaqList";

// 11 FAQ: sticky heading on the left, accordion on the right with the WhatsApp line after it. Copy from site-content.ts.
export function HomeFaq({ faqs, whatsapp }: { faqs: { q: string; a: string }[]; whatsapp: string }) {
  return (
    <section id="faq" className="scroll-mt-6 py-9 tablet:py-14">
      <div className="mx-auto flex w-[min(1120px,calc(100%-var(--gutter)*2))] flex-wrap items-start gap-x-18 gap-y-10">
        <div className="min-w-0 flex-[1_1_300px] tablet:sticky tablet:top-8">
          <Eyebrow dot="xp">FAQ</Eyebrow>
          <h2 className="mt-5.5 text-[clamp(28px,4.6vw,60px)] font-extrabold leading-[1.04] tracking-[-0.045em] text-balance">
            Questions, <Mark>answered</Mark>.
          </h2>
        </div>
        <div className="min-w-0 flex-[1.6_1_440px]">
          <FaqList items={faqs} />
          {/* After the questions, so students read the answers first. */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-border bg-card px-5 py-4">
            <p className="text-[15px] leading-[1.5] text-secondary-foreground">Still stuck on something? Message us and a real person replies.</p>
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[15px] font-bold text-primary hover:brightness-90">
              Chat on WhatsApp →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
