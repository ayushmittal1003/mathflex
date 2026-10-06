import { Eyebrow, Mark } from "../primitives";
import { FaqList } from "../FaqList";

// 11 FAQ: sticky intro on the left, accordion on the right. Copy from site-content.ts.
export function HomeFaq({ faqs, whatsapp }: { faqs: { q: string; a: string }[]; whatsapp: string }) {
  return (
    <section id="faq" className="scroll-mt-6 py-22">
      <div className="mx-auto flex w-[min(1120px,calc(100%-48px))] flex-wrap items-start gap-x-18 gap-y-10">
        <div className="min-w-0 flex-[1_1_300px] tablet:sticky tablet:top-8">
          <Eyebrow dot="xp">FAQ</Eyebrow>
          <h2 className="mt-5.5 text-[clamp(36px,4.6vw,60px)] font-extrabold leading-[1.04] tracking-[-0.045em] text-balance">
            Questions, <Mark>answered</Mark>.
          </h2>
          <p className="mt-4.5 max-w-[340px] text-base leading-[1.55] text-secondary-foreground">Still stuck on something? Message us and a real person replies.</p>
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="mt-5.5 inline-flex text-[15px] font-bold text-primary hover:brightness-90">
            Chat on WhatsApp →
          </a>
        </div>
        <div className="min-w-0 flex-[1.6_1_440px]">
          <FaqList items={faqs} />
        </div>
      </div>
    </section>
  );
}
