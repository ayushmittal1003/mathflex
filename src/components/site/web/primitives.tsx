import { cx } from "./ui";

// Signature type patterns from dipankar-design/design.md §2–3.

type Dot = "primary" | "brand-2" | "gold" | "ok" | "xp";
const dotClass: Record<Dot, string> = { primary: "bg-primary", "brand-2": "bg-brand-2", gold: "bg-gold", ok: "bg-ok", xp: "bg-xp" };

export function Eyebrow({ children, dot = "primary", onWash = false }: { children: React.ReactNode; dot?: Dot; onWash?: boolean }) {
  return (
    <div
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold text-secondary-foreground",
        onWash ? "border-white/90 bg-white/70" : "border-border bg-muted",
      )}
    >
      <span className={cx("size-1.5 rounded-full", dotClass[dot])} aria-hidden />
      {children}
    </div>
  );
}

// Blinking caret after the highlighted word in hero headings.
export function Caret() {
  return <span aria-hidden className="ml-1.5 inline-block h-[0.82em] w-1 animate-mf-blink bg-primary align-[-0.04em]" />;
}

// One key word per heading sits in this box: white on the wash, warm tint on white sections.
export function Mark({ children, onWash = false, pointer = false }: { children: React.ReactNode; onWash?: boolean; pointer?: boolean }) {
  return (
    <span className={cx("relative inline-block px-3 pb-1 shadow-highlight", onWash ? "bg-card px-3.5 pb-1.5" : "bg-highlight")}>
      {children}
      {pointer && (
        <span
          aria-hidden
          className="absolute -right-1.5 -top-4 size-0 border-x-[9px] border-t-[13px] border-x-transparent border-t-primary"
        />
      )}
    </span>
  );
}

// Centred section header: eyebrow → H2 → lead.
export function SectionHead({ eyebrow, dot, title, lead, className }: { eyebrow: string; dot?: Dot; title: React.ReactNode; lead?: React.ReactNode; className?: string }) {
  return (
    <div className={cx("px-6 text-center", className)}>
      <Eyebrow dot={dot}>{eyebrow}</Eyebrow>
      <h2 className="mx-auto mt-6 max-w-[960px] text-[clamp(40px,5.6vw,72px)] font-extrabold leading-[1.02] tracking-[-0.045em] text-balance">{title}</h2>
      {lead && <p className="mx-auto mt-5.5 max-w-[580px] text-[17px] leading-[1.55] text-secondary-foreground text-pretty">{lead}</p>}
    </div>
  );
}

export function CheckIcon({ className = "size-4", strokeWidth = 3 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function PlayIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path d="M7 4v16l13-8z" fill="currentColor" />
    </svg>
  );
}

export function LockIcon({ className = "size-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

// Chapter poster art: the DB gradient (admin-managed) drawn at 155deg with a faded symbol.
export function posterBg(from: string, to: string) {
  return { background: `linear-gradient(155deg, ${from}, ${to})` };
}
