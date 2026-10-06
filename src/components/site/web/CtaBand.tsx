import { cx } from "./ui";

// Closing call to action before the footer: a framed card on the hero's warm wash, so every
// page ends on the same soft gradient instead of a bare heading.
export function CtaBand({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className="px-4 pb-20 pt-16 tablet:pb-24 tablet:pt-20">
      <div className={cx("relative mx-auto max-w-[1240px] overflow-hidden rounded-2xl bg-wash px-6 py-16 text-center shadow-[0_30px_60px_-50px_rgb(80_20_0/0.5)] tablet:px-10 tablet:py-20", className)}>
        {children}
      </div>
    </section>
  );
}
