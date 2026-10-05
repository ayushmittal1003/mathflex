import Link from "next/link";
import { Eyebrow, Mark } from "@/components/site/web/primitives";
import { button, cx, tone } from "@/components/site/web/ui";

export const metadata = { title: "Blog", alternates: { canonical: "/blog" } };

// Placeholder until the blog has a backend (posts managed in admin). Uses the Blog design's
// plain white header; no sample articles are shown.
export default function BlogPage() {
  return (
    <section className="px-6 pb-28 pt-[calc(86px+56px)] text-center">
      <Eyebrow dot="brand-2">Mathflex Blog</Eyebrow>
      <h1 className="mx-auto mt-5.5 max-w-[900px] text-[clamp(42px,6.4vw,84px)] font-extrabold leading-none tracking-[-0.045em] text-balance">
        Study smarter for <Mark>JEE</Mark>
      </h1>
      <p className="mx-auto mt-5 max-w-[540px] text-[17px] leading-[1.55] text-secondary-foreground text-pretty">
        Chapter guides, exam strategy and study tips are on the way. Until then, start with a chapter or find answers in our help centre.
      </p>
      <div className="mx-auto mt-10 max-w-[560px] rounded-xl border border-dashed border-border bg-muted/50 px-6 py-10">
        <div className="text-xl font-extrabold tracking-[-0.02em]">First articles coming soon</div>
        <p className="mt-2 text-sm text-muted-foreground">We&apos;ll post them here.</p>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-2.5">
        <Link href="/chapters" className={cx(button.md, tone.primary)}>Browse chapters</Link>
        <Link href="/faq" className={cx(button.md, tone.secondary)}>Help centre</Link>
      </div>
    </section>
  );
}
