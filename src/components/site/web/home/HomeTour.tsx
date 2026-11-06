"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { track } from "@/lib/track";

const DONE = "mf-tour-done";
const START = "mf-tour-start";
const PAD = 8;

// Each step lights up a real button on the page ([data-tour="…"] in SiteNav, HomeHero and ChatWidget).
// A step whose button isn't on screen for this visitor (e.g. "Log in" when signed in) is skipped.
const STEPS = [
  { target: "preview", title: "Watch a free preview", body: "Tap here to watch any chapter's first part free. No account needed." },
  { target: "chapters", title: "Find your chapter", body: "All chapters are here. Search one by name, or start with the highest-weightage ones." },
  { target: "cart", title: "Your cart", body: "Add only the chapters you need. Pay with your email and mobile number, and start learning straight away." },
  { target: "login", title: "Log in free", body: "Use Google or a one-time code on your mobile. Then My Learning shows your progress, streak, XP and badges." },
  { target: "chat", title: "Stuck on a doubt?", body: "Ask MathMate, our maths assistant, any question, any time." },
];

const visible = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
};
const find = (key: string) => [...document.querySelectorAll(`[data-tour="${key}"]`)].find(visible) as HTMLElement | undefined;

// Game-style walkthrough on the home page: the screen dims, one real button lights up in the brand red-orange and a
// tooltip says what it does. Tapping the lit button or "Next" moves on. It opens by itself on the first
// visit (remembered on this device) and again from "Take a quick tour".
export function HomeTour() {
  const [steps, setSteps] = useState<typeof STEPS>([]);
  const [i, setI] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const [cardH, setCardH] = useState(180);

  const start = useCallback(() => {
    const live = STEPS.filter((s) => find(s.target));
    if (!live.length) return;
    document.documentElement.dataset.tour = "on";
    track("tour_start");
    setSteps(live);
    setI(0);
  }, []);

  const end = useCallback((finished = false) => {
    track(finished ? "tour_complete" : "tour_skip");
    setI(-1);
    delete document.documentElement.dataset.tour;
    window.dispatchEvent(new Event("mf-tour-end"));
    try { localStorage.setItem(DONE, "1"); } catch {}
  }, []);

  useEffect(() => {
    window.addEventListener(START, start);
    let seen = true;
    try { seen = localStorage.getItem(DONE) === "1"; } catch {}
    const t = seen ? undefined : setTimeout(start, 900);
    return () => { window.removeEventListener(START, start); clearTimeout(t); };
  }, [start]);

  // Bring the lit button into view, then follow it while the page scrolls or resizes.
  useEffect(() => {
    if (i < 0 || !steps[i]) return;
    const el = find(steps[i].target);
    if (!el) return; // steps were checked when the tour started
    const r0 = el.getBoundingClientRect();
    if (getComputedStyle(el).position !== "fixed" && (r0.top < 80 || r0.bottom > innerHeight - 220)) el.scrollIntoView({ block: "center", behavior: "smooth" });
    let raf = 0;
    const track = () => { setRect(el.getBoundingClientRect()); raf = requestAnimationFrame(track); };
    track();
    next.current?.focus({ preventScroll: true });
    return () => cancelAnimationFrame(raf);
  }, [i, steps]);

  useLayoutEffect(() => { if (card.current) setCardH(card.current.offsetHeight); }, [i, rect?.width]);

  useEffect(() => {
    if (i < 0) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") end(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, end]);

  if (i < 0 || !rect || !steps[i]) return null;
  const step = steps[i];
  const last = i === steps.length - 1;
  const go = () => (last ? end(true) : setI(i + 1));

  // The spotlight hugs the button; the tooltip sits below it, or above when there's no room.
  const hole = { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 };
  const vw = typeof window === "undefined" ? 400 : window.innerWidth;
  const width = Math.min(340, vw - 24);
  const below = hole.top + hole.height + 14 + cardH < window.innerHeight - 8;
  const top = below ? hole.top + hole.height + 14 : Math.max(8, hole.top - 14 - cardH);
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), vw - width - 12);
  const arrow = Math.min(Math.max(18, rect.left + rect.width / 2 - left), width - 18);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body" className="fixed inset-0 z-[80] text-left">
      {/* Blocks the page while the tour is open; the dimming comes from the spotlight's shadow. */}
      <div className="absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none fixed rounded-xl transition-all duration-300 ease-out"
        style={{ ...hole, boxShadow: "0 0 0 3px var(--primary), 0 0 0 9px color-mix(in oklab, var(--brand-2) 35%, transparent), 0 0 34px 12px color-mix(in oklab, var(--primary) 50%, transparent), 0 0 0 9999px rgb(0 0 0 / 0.62)" }}
      >
        <span className="absolute inset-0 animate-ping rounded-xl ring-2 ring-brand-2/70" />
      </div>
      <button type="button" aria-label={`${step.title}: tap to continue`} onClick={go} className="fixed cursor-pointer rounded-xl" style={hole} />
      <div ref={card} className="fixed animate-mf-rise rounded-xl bg-card p-4.5 text-foreground shadow-[0_24px_60px_-12px_rgb(0_0_0/0.5)]" style={{ top, left, width }}>
        <span aria-hidden className={`absolute size-3.5 rotate-45 bg-card ${below ? "-top-1.5" : "-bottom-1.5"}`} style={{ left: arrow - 7 }} />
        <div className="text-xs font-bold uppercase tracking-[0.08em] text-primary">Step {i + 1} of {steps.length}</div>
        <h2 id="tour-title" className="mt-1 text-[17px] font-extrabold tracking-[-0.02em]">{step.title}</h2>
        <p id="tour-body" className="mt-1.5 text-sm leading-[1.5] text-secondary-foreground">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={() => end()} className="min-h-11 px-1 text-sm font-bold text-muted-foreground hover:text-foreground">Skip tour</button>
          <span className="ml-auto flex gap-2">
            {i > 0 && <button type="button" onClick={() => setI(i - 1)} className="min-h-11 rounded-lg border border-border px-3.5 text-sm font-bold hover:bg-muted">Back</button>}
            <button ref={next} type="button" onClick={go} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-cta hover:brightness-108">{last ? "Let's go" : "Next"}</button>
          </span>
        </div>
      </div>
    </div>
  );
}

// "Take a quick tour" under the hero buttons, to replay the walkthrough any time.
export function StartTourButton() {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(START))} className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-secondary-foreground underline underline-offset-[3px] hover:text-foreground">
      New here? Take a quick tour
    </button>
  );
}
