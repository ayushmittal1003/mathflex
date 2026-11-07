"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { ArrowLeft, ArrowRight, BookOpenCheck, Clock3, GraduationCap, Loader2, Moon, RotateCcw, Sun, Sunrise, Target, Trophy } from "lucide-react";
import { submitEnquiry } from "@/app/actions/enquiry";
import { metaTrack, leadEventId } from "@/lib/meta-pixel";
import { track } from "@/lib/track";
import { CheckIcon } from "./primitives";
import { cx } from "./ui";

type ClassLevel = "11" | "12" | "DROPPER";
type Goal = "MAIN" | "ADVANCED" | "BOARDS";
type CallTime = "MORNING" | "AFTERNOON" | "EVENING" | "";

const CLASSES: { v: ClassLevel; t: string; d: string; icon: typeof GraduationCap }[] = [
  { v: "11", t: "Class 11", d: "Building the base", icon: BookOpenCheck },
  { v: "12", t: "Class 12", d: "Boards and JEE together", icon: GraduationCap },
  { v: "DROPPER", t: "Dropper", d: "One more focused attempt", icon: RotateCcw },
];
const GOALS: { v: Goal; t: string; d: string; icon: typeof Target }[] = [
  { v: "MAIN", t: "JEE Main", d: "NITs, IIITs and a strong percentile", icon: Target },
  { v: "ADVANCED", t: "JEE Main + Advanced", d: "Aiming for an IIT", icon: Trophy },
  { v: "BOARDS", t: "Boards first", d: "Strong school marks, JEE alongside", icon: BookOpenCheck },
];
const AREAS = ["Calculus", "Algebra", "Coordinate geometry", "Trigonometry", "Vectors & 3D", "Probability & statistics", "Not sure yet"];
const TIMES: { v: Exclude<CallTime, "">; t: string; d: string; icon: typeof Sun }[] = [
  { v: "MORNING", t: "Morning", d: "10am–1pm", icon: Sunrise },
  { v: "AFTERNOON", t: "Afternoon", d: "1pm–5pm", icon: Sun },
  { v: "EVENING", t: "Evening", d: "5pm–8pm", icon: Moon },
];
const STEPS = ["Your class", "Your goal", "Weak areas", "Your details"];

// Ad tags from the landing URL; the site tracker keeps the first page's tags for the session.
function readSource() {
  try {
    const q = new URLSearchParams(location.search);
    const entry = JSON.parse(sessionStorage.getItem("mf-entry") ?? "{}") as { source?: string; medium?: string; campaign?: string };
    const pick = (k: string) => q.get(k)?.slice(0, 150) || undefined;
    return {
      utmSource: pick("utm_source") ?? entry.source,
      utmMedium: pick("utm_medium") ?? entry.medium,
      utmCampaign: pick("utm_campaign") ?? entry.campaign,
      utmContent: pick("utm_content"),
      fbclid: q.get("fbclid")?.slice(0, 500) || undefined,
      landingPath: `${location.pathname}${location.search}`.slice(0, 300),
    };
  } catch {
    return {};
  }
}

// Four short steps, one question each: tapping a card moves on by itself, the last step asks for
// contact details. Saved as a lead for the team to call (Admin → Leads).
export function EnquiryForm({ promise, whatsapp }: { promise: string; whatsapp: string }) {
  const [step, setStep] = useState(0);
  const [classLevel, setClassLevel] = useState<ClassLevel | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [areas, setAreas] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [callTime, setCallTime] = useState<CallTime>("");
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [done, setDone] = useState(false);
  const [sending, start] = useTransition();
  const source = useRef<ReturnType<typeof readSource>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const started = useRef(false);
  const openedAt = useRef(0);

  useEffect(() => { source.current = readSource(); openedAt.current = Date.now(); }, []);
  // Move focus to each new question so keyboard and screen-reader users follow along.
  useEffect(() => { if (started.current) heading.current?.focus({ preventScroll: true }); }, [step, done]);

  const go = (n: number) => {
    started.current = true;
    if (n === 1 && step === 0) track("enquiry_start");
    setError(null);
    setStep(n);
  };
  const choose = <T,>(set: (v: T) => void, v: T, next: number) => { set(v); setTimeout(() => go(next), 180); };

  const phoneOk = /^[6-9]\d{9}$/.test(phone);
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const nameOk = name.trim().length >= 2;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nameOk) return setError({ text: "Enter your name.", field: "name" });
    if (!phoneOk) return setError({ text: "Enter a valid 10-digit mobile number.", field: "phone" });
    if (!emailOk) return setError({ text: "Enter a valid email address.", field: "email" });
    setError(null);
    start(async () => {
      const res = await submitEnquiry({ name, phone, email, classLevel, goal, weakAreas: areas, callTime, consent: true, elapsedMs: Math.max(0, Date.now() - openedAt.current), source: source.current }).catch(() => null);
      if (!res) return setError({ text: "Couldn't send. Check your connection and try again." });
      if (!res.ok) return setError({ text: res.error, field: res.field });
      metaTrack("Lead", { content_name: "Enquiry form", content_category: classLevel }, leadEventId(res.leadId));
      track("lead_submit", `${classLevel} · ${goal}`);
      started.current = true;
      setDone(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.45 }, colors: ["#FF2E63", "#FF8A3D", "#FACC15", "#8B5CF6"], disableForReducedMotion: true });
    });
  }

  const first = name.trim().split(/\s+/)[0];
  const optionCard = (on: boolean) =>
    cx(
      "group flex w-full items-center gap-4 rounded-xl border-2 px-4 py-4 text-left transition duration-200 ease-mf hover:-translate-y-0.5",
      on ? "border-primary bg-primary/6 shadow-[0_14px_30px_-20px_rgb(255_46_99/0.7)]" : "border-border bg-card hover:border-foreground/30",
    );
  const input = (bad: boolean) => cx("h-12 w-full min-w-0 rounded-lg border bg-card px-3.5 text-base outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/25", bad ? "border-bad" : "border-input");

  if (done) {
    return (
      <div className="animate-mf-rise text-center" aria-live="polite">
        <span className="mx-auto grid size-18 animate-mf-pop place-items-center rounded-full bg-ok text-white shadow-[0_0_0_10px_color-mix(in_oklab,var(--ok)_16%,transparent)]">
          <CheckIcon className="size-8" strokeWidth={3} />
        </span>
        <h2 ref={heading} tabIndex={-1} className="mt-6 text-[clamp(26px,3.4vw,34px)] font-extrabold leading-[1.1] tracking-[-0.035em] outline-none">
          You&apos;re in{first ? `, ${first}` : ""}!
        </h2>
        <p className="mx-auto mt-3 max-w-[380px] text-[15px] leading-[1.55] text-secondary-foreground">
          {promise} on <b className="text-foreground">+91 {phone.slice(0, 5)} {phone.slice(5)}</b>{callTime ? `, in the ${callTime.toLowerCase()}` : ""}. Keep your phone close.
        </p>
        <div className="mt-6 rounded-xl border border-border bg-muted/50 p-4 text-left">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">While you wait</p>
          <p className="mt-1.5 text-[15px] leading-[1.5]">Watch any chapter&apos;s free 3–4 minute preview. No sign-up needed.</p>
        </div>
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          <Link href="/#previews" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-4 text-[15px] font-bold text-primary-foreground shadow-cta hover:brightness-106">Watch a free preview</Link>
          <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi, I just filled the Mathflex enquiry form. My name is ${name.trim()}.`)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-card px-4 text-[15px] font-bold hover:bg-muted">
            WhatsApp us now
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-bold text-muted-foreground">Step {step + 1} of {STEPS.length} · {STEPS[step]}</span>
        {step > 0 && (
          <button type="button" onClick={() => go(step - 1)} className="inline-flex min-h-11 items-center gap-1 text-[13px] font-bold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Back
          </button>
        )}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5" aria-hidden>
        {STEPS.map((s, i) => (
          <span key={s} className="h-1.5 overflow-hidden rounded-full bg-muted">
            <span className={cx("block h-full rounded-full bg-gradient-to-r from-primary to-brand-2 transition-[width] duration-500 ease-mf", i <= step ? "w-full" : "w-0")} />
          </span>
        ))}
      </div>

      <div key={step} className="mt-6 animate-mf-rise">
        {step === 0 && (
          <fieldset>
            <legend className="contents"><h2 ref={heading} tabIndex={-1} className="text-[clamp(22px,2.6vw,28px)] font-extrabold leading-[1.15] tracking-[-0.03em] outline-none">Which class are you in?</h2></legend>
            <div className="mt-5 grid gap-2.5">
              {CLASSES.map((c) => (
                <button key={c.v} type="button" aria-pressed={classLevel === c.v} onClick={() => choose(setClassLevel, c.v, 1)} className={optionCard(classLevel === c.v)}>
                  <span className={cx("grid size-11 shrink-0 place-items-center rounded-lg transition-colors", classLevel === c.v ? "bg-primary text-white" : "bg-muted text-foreground group-hover:bg-foreground group-hover:text-card")}><c.icon className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-extrabold tracking-[-0.015em]">{c.t}</span>
                    <span className="block text-[13px] text-muted-foreground">{c.d}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset>
            <legend className="contents"><h2 ref={heading} tabIndex={-1} className="text-[clamp(22px,2.6vw,28px)] font-extrabold leading-[1.15] tracking-[-0.03em] outline-none">What are you aiming for?</h2></legend>
            <div className="mt-5 grid gap-2.5">
              {GOALS.map((g) => (
                <button key={g.v} type="button" aria-pressed={goal === g.v} onClick={() => choose(setGoal, g.v, 2)} className={optionCard(goal === g.v)}>
                  <span className={cx("grid size-11 shrink-0 place-items-center rounded-lg transition-colors", goal === g.v ? "bg-primary text-white" : "bg-muted text-foreground group-hover:bg-foreground group-hover:text-card")}><g.icon className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-extrabold tracking-[-0.015em]">{g.t}</span>
                    <span className="block text-[13px] text-muted-foreground">{g.d}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset>
            <legend className="contents"><h2 ref={heading} tabIndex={-1} className="text-[clamp(22px,2.6vw,28px)] font-extrabold leading-[1.15] tracking-[-0.03em] outline-none">Where do you lose the most marks?</h2></legend>
            <p className="mt-1.5 text-[15px] text-muted-foreground">Pick all that apply. It helps us prepare for your call.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {AREAS.map((a) => {
                const on = areas.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAreas((cur) => (a === "Not sure yet" ? (on ? [] : [a]) : on ? cur.filter((x) => x !== a) : [...cur.filter((x) => x !== "Not sure yet"), a]))}
                    className={cx("inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-[15px] font-bold transition duration-200 active:scale-95", on ? "border-primary bg-primary text-white" : "border-border bg-card hover:border-foreground/30")}
                  >
                    {on && <CheckIcon className="size-3.5" strokeWidth={3.5} />}
                    {a}
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => go(3)} className="mt-7 flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-foreground text-base font-bold text-card transition hover:brightness-125">
              {areas.length ? "Continue" : "Skip for now"} <ArrowRight className="size-4" />
            </button>
          </fieldset>
        )}

        {step === 3 && (
          <form onSubmit={submit} noValidate>
            <h2 ref={heading} tabIndex={-1} className="text-[clamp(22px,2.6vw,28px)] font-extrabold leading-[1.15] tracking-[-0.03em] outline-none">Where should we call you?</h2>
            <div className="mt-5 grid gap-3.5">
              <label className="grid gap-1.5">
                <span className="text-[13px] font-bold">Your name</span>
                <input value={name} onChange={(e) => { setName(e.target.value); setError(null); }} autoComplete="name" placeholder="e.g. Aarav Sharma" aria-invalid={error?.field === "name"} className={input(error?.field === "name")} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[13px] font-bold">Mobile number</span>
                <span className="flex gap-2">
                  <span className="grid h-12 shrink-0 place-items-center rounded-lg border border-border bg-muted px-3.5 text-[15px] font-bold">+91</span>
                  <input value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").replace(/^91(?=\d{10})/, "").slice(0, 10)); setError(null); }} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile" aria-invalid={error?.field === "phone"} className={cx(input(error?.field === "phone"), "flex-1 tracking-[0.02em]")} />
                  {phoneOk && <span className="grid size-12 shrink-0 animate-mf-pop place-items-center rounded-lg bg-ok/12 text-ok"><CheckIcon className="size-4" strokeWidth={3} /></span>}
                </span>
              </label>
              <label className="grid gap-1.5">
                <span className="text-[13px] font-bold">Email</span>
                <input value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={error?.field === "email"} className={input(error?.field === "email")} />
              </label>
              <div>
                <span className="flex items-center gap-1.5 text-[13px] font-bold"><Clock3 className="size-3.5" /> Best time to call <span className="font-medium text-muted-foreground">(optional)</span></span>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {TIMES.map((t) => (
                    <button key={t.v} type="button" aria-pressed={callTime === t.v} onClick={() => setCallTime(callTime === t.v ? "" : t.v)} className={cx("flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-1 transition", callTime === t.v ? "border-primary bg-primary/6" : "border-border bg-card hover:border-foreground/30")}>
                      <t.icon className={cx("size-4", callTime === t.v ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-[13px] font-bold">{t.t}</span>
                      <span className="text-[11px] text-muted-foreground">{t.d}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {error && <p role="alert" className="mt-4 rounded-lg bg-bad/10 p-3 text-sm font-semibold text-bad">{error.text}</p>}
            <button type="submit" disabled={sending} className="mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-lg bg-primary text-base font-bold text-primary-foreground shadow-cta transition hover:brightness-106 disabled:opacity-70">
              {sending ? <Loader2 className="size-4 animate-spin" /> : null}
              {sending ? "Sending…" : "Get my free plan"}
              {!sending && <ArrowRight className="size-4" />}
            </button>
            <p className="mt-3 text-center text-xs leading-[1.5] text-muted-foreground">
              By continuing you agree that Mathflex may call or WhatsApp you about your preparation. No spam. See our <Link href="/privacy" className="underline">privacy policy</Link>.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
