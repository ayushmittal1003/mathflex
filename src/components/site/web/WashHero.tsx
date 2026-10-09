import { cx } from "./ui";

// Framed wash hero (design.md §3.1): 16px frame, 12px radius, warm gradient. The site nav
// floats over its top 86px, so content starts below that.
export function WashHero({ children, className, peek = false }: { children: React.ReactNode; className?: string; peek?: boolean }) {
  return (
    <div className="px-4 pt-4">
      <section className={cx("relative overflow-hidden rounded-xl bg-wash pt-[86px]", !peek && "pb-16 tablet:pb-20", className)}>{children}</section>
    </div>
  );
}

// Hero H1 sizes from the designs (clamp ranges vary slightly by page).
export const heroH1 = "mx-auto max-w-[1000px] text-[clamp(44px,7vw,88px)] font-extrabold leading-none tracking-[-0.045em] text-balance";
export const heroLead = "mx-auto max-w-[560px] text-[17px] leading-[1.55] text-secondary-foreground text-pretty";
// Split-section and block headings.
export const splitH2 = "text-[clamp(34px,4.2vw,54px)] font-extrabold leading-[1.04] tracking-[-0.045em] text-balance";
export const blockH2 = "text-[clamp(26px,3vw,38px)] font-extrabold leading-[1.2] tracking-[-0.035em] text-balance";
