import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { inr } from "@/lib/format";
import { bookCall, fillFaq, instructor, instructorNames } from "@/lib/site-content";
import { Caret, CheckIcon, Eyebrow, Mark, SectionHead } from "@/components/site/web/primitives";
import { WashHero, heroH1, heroLead } from "@/components/site/web/WashHero";
import { VideoFrame } from "@/components/site/web/VideoFrame";
import { FaqList } from "@/components/site/web/FaqList";
import { MentorSection } from "@/components/site/web/home/MentorSection";
import { button, cx, tone } from "@/components/site/web/ui";

export const metadata = { title: "Book a 1:1 call", alternates: { canonical: "/book-a-call" } };

// Book a call (dipankar-design/designs/Book a Call.dc.html). The call is the existing
// mentorship add-on: "Add to my order" opens checkout with it ticked (/checkout?mentorship=1),
// and after payment the team arranges the time, as today. There's no scheduling backend yet
// (Cal.com), so the design's calendar is replaced by a booking card; price and description
// come from settings.
export default async function BookACallPage() {
  const settings = await getSettings();
  const names = instructorNames(settings);
  const on = settings.features.mentorshipUpsell;
  const price = inr(settings.mentorshipPrice);
  const vars = { mentorShort: names.short, price, blurb: settings.mentorshipBlurb };
  const faqs = bookCall.faqs.map((f) => ({ q: f.q, a: fillFaq(f.a, vars) }));
  const cta = "/checkout?mentorship=1";

  if (!on) {
    return (
      <WashHero>
        <div className="px-6 pb-6 pt-10 text-center">
          <Eyebrow dot="gold" onWash>1:1 calls</Eyebrow>
          <h1 className={cx(heroH1, "mt-6")}>Calls are <Mark onWash>paused</Mark> right now</h1>
          <p className={cx(heroLead, "mt-5.5")}>We&apos;re not taking new 1:1 call bookings at the moment. Message us and we&apos;ll let you know when they open again.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noreferrer" className={cx(button.lg, tone.primary)}>WhatsApp us</a>
            <Link href="/chapters" className={cx(button.lg, tone.glass)}>Browse chapters</Link>
          </div>
        </div>
      </WashHero>
    );
  }

  return (
    <>
      <WashHero>
        <div className="px-6 pt-10 text-center">
          <Eyebrow dot="ok" onWash>1:1 call with {names.short} · {price}</Eyebrow>
          <h1 className={cx(heroH1, "mt-6")}>
            A plan for the rest of your prep, from <Mark onWash>{names.short}<Caret /></Mark>
          </h1>
          <p className={cx(heroLead, "mt-5.5 max-w-[580px]")}>
            A 1:1 video call with IIT Delhi alumnus {names.full}. Bring your scores and your doubts, and leave with a plan.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            <a href="#book" className={cx(button.md, tone.primary)}>Book your call</a>
            <a href="#what" className={cx(button.md, tone.glass)}>What you get</a>
          </div>
        </div>
        <VideoFrame videoId={instructor.introVideoId} caption="What happens on the call" sub={`${names.short} explains`} className="mx-auto mt-12 aspect-video w-[min(980px,calc(100%-48px))]" />
      </WashHero>

      <section id="what" className="scroll-mt-20 pb-22 pt-24">
        <SectionHead eyebrow="What you get" dot="brand-2" title={<>Walk in confused. Walk out with a <Mark>plan</Mark>.</>} lead={settings.mentorshipBlurb} />
        <div className="mx-auto mt-12 grid w-[min(1120px,calc(100%-48px))] grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5">
          {bookCall.gets.map((g, i) => (
            <div key={g.t} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative grid h-[200px] place-items-center overflow-hidden bg-[radial-gradient(80%_70%_at_50%_0%,color-mix(in_oklab,var(--brand-2)_14%,transparent),transparent_70%),var(--muted)] p-5">
                <GetVisual i={i} />
              </div>
              <div className="px-5.5 pb-6 pt-5">
                <div className="font-mono text-[13px] font-bold text-primary">0{i + 1}</div>
                <div className="mt-2 text-[19px] font-extrabold tracking-[-0.02em]">{g.t}</div>
                <div className="mt-1.5 text-[15px] leading-[1.55] text-secondary-foreground">{fillFaq(g.d, vars)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="book" className="scroll-mt-20 border-t border-border py-22">
        <SectionHead eyebrow="Book your call" title={<>Booked in <Mark>three</Mark> steps</>} lead="Add the call to your order, pay, and our team sets up a time with you on WhatsApp." />
        <div className="mx-auto mt-11 grid w-[min(1080px,calc(100%-48px))] overflow-hidden rounded-xl border border-border bg-card shadow-[0_30px_60px_-36px_rgb(80_20_0/0.45)] tablet:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="border-b border-border p-6 tablet:border-b-0 tablet:border-r">
            <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-primary to-brand-2 text-lg font-extrabold text-white">{names.full[0]}</span>
            <div className="mt-3.5 text-sm font-semibold text-muted-foreground">{names.full}</div>
            <div className="mt-0.5 text-[22px] font-extrabold tracking-[-0.025em]">{settings.mentorshipTitle}</div>
            <div className="mt-4.5 grid gap-2.5 text-sm text-secondary-foreground">
              <Detail icon="clock">{settings.mentorshipBlurb}</Detail>
              <Detail icon="video">1:1 video call</Detail>
              <Detail icon="globe">Timing set with you on WhatsApp (IST)</Detail>
              <div className="flex items-center gap-2.5 font-extrabold text-foreground"><span className="w-4 text-center">₹</span>{settings.mentorshipPrice.toLocaleString("en-IN")}</div>
            </div>
          </div>
          <div className="flex flex-col p-6">
            <ol className="grid gap-4">
              {bookCall.steps.map((s, i) => (
                <li key={s.t} className="flex gap-3.5">
                  <span className={cx("grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-extrabold", i === 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>{i + 1}</span>
                  <div>
                    <div className="text-base font-extrabold tracking-[-0.01em]">{s.t}</div>
                    <div className="mt-0.5 text-sm leading-[1.55] text-secondary-foreground">{fillFaq(s.d, vars)}</div>
                  </div>
                </li>
              ))}
            </ol>
            <Link href={cta} className="mt-6 flex h-[50px] items-center justify-center rounded-lg bg-primary text-[15px] font-bold text-primary-foreground shadow-cta transition hover:brightness-108">
              Add the call to my order · {price}
            </Link>
            <p className="mt-3 text-center text-xs text-muted-foreground">You can review your order and add chapters before paying.</p>
          </div>
        </div>
      </section>


      <div className="border-t border-border">
        <MentorSection mentorship={null} names={names} />
      </div>

      <section className="border-t border-border py-22">
        <div className="mx-auto w-[min(820px,calc(100%-48px))]">
          <h2 className="text-center text-[clamp(34px,4.2vw,54px)] font-extrabold leading-[1.04] tracking-[-0.045em]">Questions about the call</h2>
          <div className="mt-9"><FaqList items={faqs} /></div>
          <div className="mt-9 flex justify-center">
            <Link href={cta} className={cx(button.md, tone.primary)}>Book your call · {price}</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Detail({ icon, children }: { icon: "clock" | "video" | "globe"; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <svg className="mt-0.5 size-4 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {icon === "clock" && <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}
        {icon === "video" && <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3z" /></>}
        {icon === "globe" && <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>}
      </svg>
      <span>{children}</span>
    </div>
  );
}

// Small illustrative visuals for the "What you get" cards (neutral labels, example values).
function GetVisual({ i }: { i: number }) {
  if (i === 0) {
    const rows = [["Chapter A", 34, true], ["Chapter B", 78, false], ["Chapter C", 41, true], ["Chapter D", 82, false]] as const;
    return (
      <div className="grid w-full max-w-[240px] gap-2 rounded-[10px] bg-card p-3.5 shadow-[0_14px_30px_-18px_rgb(80_20_0/0.4)]">
        <div className="flex justify-between text-[11px] font-extrabold"><span>Your mock scores</span><span className="text-primary">2 weak</span></div>
        {rows.map(([t, v, weak]) => (
          <div key={t} className="flex items-center gap-2 text-[11px] font-semibold">
            <span className={cx("w-[70px] shrink-0 truncate", weak ? "text-foreground" : "text-muted-foreground")}>{t}</span>
            <span className="h-2 flex-1 rounded-full bg-muted"><span className={cx("block h-full rounded-full", weak ? "bg-primary" : "bg-[oklch(0.8_0.02_260)]")} style={{ width: `${v}%` }} /></span>
            <span className={cx("w-7 text-right font-extrabold", weak ? "text-primary" : "text-muted-foreground")}>{v}%</span>
          </div>
        ))}
      </div>
    );
  }
  if (i === 1) {
    const weeks = [["Week 1", "Weakest chapter", "done"], ["Week 2", "Next chapter", "now"], ["Week 3", "Revise + PYQs", ""], ["Week 4", "Full mock test", ""]] as const;
    return (
      <div className="grid w-full max-w-[240px] gap-1.5 drop-shadow-[0_14px_22px_rgb(80_20_0/0.18)]">
        {weeks.map(([w, t, st]) => (
          <div key={w} className={cx("flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-xs", st === "now" ? "border-primary/35 bg-selected" : "border-border bg-card")}>
            <span className={cx("grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] text-white", st === "done" ? "border-ok bg-ok" : st === "now" ? "border-primary bg-primary" : "border-border bg-card")}>
              {st === "done" && <CheckIcon className="size-2.5" strokeWidth={4} />}
            </span>
            <b className="w-12 shrink-0 whitespace-nowrap text-muted-foreground">{w}</b>
            <span className="truncate font-bold">{t}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4.5">
      <div className="relative size-[104px] rounded-full bg-[conic-gradient(var(--primary)_0_38%,var(--brand-2)_38%_70%,var(--xp)_70%_100%)] shadow-[0_14px_30px_-16px_rgb(80_20_0/0.5)]">
        <div className="absolute inset-4 grid place-items-center rounded-full bg-card text-center">
          <div><div className="text-lg font-black tracking-[-0.03em]">3h</div><div className="text-[9px] font-bold text-muted-foreground">PAPER</div></div>
        </div>
      </div>
      <div className="grid gap-2 text-[11px] font-bold">
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-primary" />Strong topics first</span>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-brand-2" />Then the rest</span>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-xp" />Review time</span>
      </div>
    </div>
  );
}
