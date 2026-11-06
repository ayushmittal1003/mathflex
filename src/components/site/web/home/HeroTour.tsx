"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cx } from "../ui";

const SEEN = "mf-tour-seen";

// What a new visitor does first, from watching a free part to buying. Every step is something the
// site really offers today; update the copy here if what's free changes.
const STEPS = [
  {
    chip: "Watch free",
    title: "Watch a free preview",
    body: "Every chapter's first part is free to watch. No account needed: open any chapter and press play.",
    cta: { label: "See the previews", href: "#previews" },
  },
  {
    chip: "Log in free",
    title: "Log in in seconds",
    body: "Use Google or your mobile number with a one-time code. No password and no card.",
    cta: { label: "Log in free", href: "/login" },
  },
  {
    chip: "Your free dashboard",
    title: "What's free after you log in",
    body: "My Learning tracks your streak, XP, badges and weekly leaderboard rank. You can keep watching free previews, try free practice sets and ask MathMate, our maths chatbot, any doubt.",
    cta: { label: "Try free practice", href: "/free-practice" },
  },
  {
    chip: "Unlock a chapter",
    title: "Unlock only what you need",
    body: "Buy one chapter (3 months) or a full course. You get every part, DPPs, PYQs with solutions, notes and the timed JEE-style exam mode, unlocked right after you pay.",
    cta: { label: "Browse chapters", href: "/chapters" },
  },
];

// Home hero only: four tappable steps with a green glow. Tapping one opens its card underneath.
// The glow stops once the visitor has opened a step, remembered on this device.
export function HeroTour() {
  const [open, setOpen] = useState<number | null>(null);
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    try {
      // Read after mount: the server can't see this device's storage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeen(localStorage.getItem(SEEN) === "1");
    } catch {}
  }, []);

  const show = (i: number | null) => {
    setOpen(i);
    if (i !== null && !seen) {
      setSeen(true);
      try { localStorage.setItem(SEEN, "1"); } catch {}
    }
  };
  const step = open !== null ? STEPS[open] : null;

  return (
    <div className="mx-auto mt-8 w-[min(760px,100%)]">
      <div className="text-[13px] font-bold text-secondary-foreground">New here? Start in 4 steps</div>
      <div className="mt-3 flex flex-wrap justify-center gap-2.5" role="group" aria-label="Getting started">
        {STEPS.map((s, i) => (
          <button
            key={s.chip}
            type="button"
            onClick={() => show(open === i ? null : i)}
            aria-expanded={open === i}
            aria-controls="hero-tour-card"
            className={cx(
              "inline-flex min-h-11 items-center gap-2 rounded-full border bg-card py-1.5 pl-1.5 pr-3.5 text-sm font-bold text-foreground transition",
              open === i ? "border-ok shadow-[0_0_0_4px_color-mix(in_oklab,var(--ok)_28%,transparent),0_10px_28px_-6px_color-mix(in_oklab,var(--ok)_65%,transparent)]" : "border-ok/40 shadow-[0_0_0_3px_color-mix(in_oklab,var(--ok)_16%,transparent),0_8px_22px_-8px_color-mix(in_oklab,var(--ok)_55%,transparent)] hover:border-ok",
              !seen && open === null && "animate-pulse",
            )}
          >
            <span className="grid size-7 place-items-center rounded-full bg-ok text-[13px] font-extrabold text-white">{i + 1}</span>
            {s.chip}
          </button>
        ))}
      </div>

      {step && open !== null && (
        <div id="hero-tour-card" role="region" aria-label={`Step ${open + 1}: ${step.title}`} className="relative mt-4 animate-mf-rise rounded-xl border border-ok/50 bg-card p-5 text-left shadow-[0_0_0_4px_color-mix(in_oklab,var(--ok)_14%,transparent),0_24px_48px_-24px_rgb(0_80_30/0.4)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-ok-strong">Step {open + 1} of {STEPS.length}</div>
              <h2 className="mt-1 text-lg font-extrabold tracking-[-0.02em]">{step.title}</h2>
            </div>
            <button type="button" onClick={() => show(null)} aria-label="Close guide" className="tap relative grid size-8 shrink-0 place-items-center rounded-full bg-muted text-lg leading-none text-muted-foreground hover:text-foreground">×</button>
          </div>
          <p className="mt-2 text-[15px] leading-[1.55] text-secondary-foreground">{step.body}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href={step.cta.href} className="inline-flex min-h-11 items-center rounded-lg bg-ok px-4 text-sm font-bold text-white hover:brightness-108">{step.cta.label}</Link>
            <span className="ml-auto flex gap-2">
              {open > 0 && <button type="button" onClick={() => show(open - 1)} className="min-h-11 rounded-lg border border-border px-3.5 text-sm font-bold hover:bg-muted">Back</button>}
              {open < STEPS.length - 1 ? (
                <button type="button" onClick={() => show(open + 1)} className="min-h-11 rounded-lg bg-foreground px-3.5 text-sm font-bold text-white hover:brightness-130">Next step</button>
              ) : (
                <button type="button" onClick={() => show(null)} className="min-h-11 rounded-lg bg-foreground px-3.5 text-sm font-bold text-white hover:brightness-130">Got it</button>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
