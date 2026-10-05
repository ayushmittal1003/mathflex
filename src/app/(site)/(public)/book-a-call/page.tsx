import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { inr } from "@/lib/format";
import { bookCall, fillFaq, instructor, instructorNames } from "@/lib/site-content";
import { Caret, CheckIcon, Eyebrow, Mark, SectionHead } from "@/components/site/web/primitives";
import { DiagnosisVisual, PlanVisual, StrategyVisual } from "@/components/site/web/book-call/CallVisuals";
import { WashHero, heroH1, heroLead } from "@/components/site/web/WashHero";
import { VideoFrame } from "@/components/site/web/VideoFrame";
import { FaqList } from "@/components/site/web/FaqList";
import { MentorSection } from "@/components/site/web/home/MentorSection";
import { button, cx, tone } from "@/components/site/web/ui";

export const metadata = { title: "Book a 1:1 call", alternates: { canonical: "/book-a-call" } };

// Soft warm tints behind the illustrations and the portrait (body sections, not the hero wash).
const TINT = "radial-gradient(80% 70% at 50% 0%, color-mix(in oklab, var(--brand-2) 16%, transparent), transparent 70%), var(--muted)";
const PORTRAIT_TINT =
  "radial-gradient(90% 80% at 50% 0%, color-mix(in oklab, var(--brand-2) 24%, transparent), transparent 70%), radial-gradient(60% 60% at 100% 100%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 70%), var(--muted)";

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
  // Real chapter names for the illustrations (highest JEE weightage first).
  const sample = on ? (await db.chapter.findMany({ where: { isPublished: true }, orderBy: [{ jeeWeightage: "desc" }], take: 4, select: { title: true } })).map((c) => c.title) : [];

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
              <div className="relative grid h-[300px] place-items-center px-6" style={{ background: TINT }}>
                {i === 0 ? <DiagnosisVisual chapters={sample} /> : i === 1 ? <PlanVisual chapters={sample} /> : <StrategyVisual />}
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

      <section id="book" className="scroll-mt-20 py-16 tablet:py-20">
        <SectionHead eyebrow="Book your call" title={<>Booked in <Mark>three</Mark> steps</>} lead="Add the call to your order, pay, and our team sets up a time with you on WhatsApp." />
        <div className="mx-auto mt-11 grid w-[min(1080px,calc(100%-48px))] overflow-hidden rounded-xl border border-border bg-card shadow-[0_30px_60px_-36px_rgb(80_20_0/0.45)] tablet:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="flex flex-col border-b border-border p-6 tablet:border-b-0 tablet:border-r tablet:p-7">
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg" style={{ background: PORTRAIT_TINT }}>
              {instructor.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- static portrait from public/
                <img src={instructor.photo} alt={names.full} className="absolute inset-0 size-full object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <span className="mx-auto grid size-24 place-items-center rounded-full bg-gradient-to-br from-primary to-brand-2 text-[34px] font-extrabold tracking-[-0.03em] text-white shadow-[0_0_0_8px_rgb(255_255_255/0.75),0_20px_40px_-16px_rgb(120_40_0/0.45)]">
                      {names.full.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </span>
                    <span className="mt-4 block text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Photo coming soon</span>
                  </div>
                </div>
              )}
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-card/90 px-2 py-1 text-[11px] font-bold backdrop-blur">
                <span className="size-1.5 rounded-full bg-ok" />1:1 with {names.short}
              </span>
            </div>
            <div className="mt-5">
              <div className="text-[22px] font-extrabold leading-tight tracking-[-0.025em]">{names.full}</div>
              <div className="mt-1 text-sm text-muted-foreground">{instructor.title} · {instructor.studentsGuided} JEE aspirants guided</div>
            </div>
            <dl className="mt-5 grid border-t border-border">
              <Detail icon="clock" label="The call">{settings.mentorshipBlurb}</Detail>
              <Detail icon="video" label="Format">1:1 video call</Detail>
              <Detail icon="globe" label="Scheduling">Set with you on WhatsApp (IST)</Detail>
            </dl>
            <div className="mt-auto flex items-baseline justify-between gap-3 border-t border-border pt-4">
              <span className="text-sm font-bold text-secondary-foreground">Price</span>
              <span className="text-[28px] font-extrabold leading-none tracking-[-0.035em]">{price}</span>
            </div>
          </div>
          <div className="flex flex-col p-6 tablet:p-7">
            <div className="mb-5 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">How booking works</div>
            <ol className="grid gap-5">
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
            <Link href={cta} className="mt-7 flex h-[50px] items-center justify-center rounded-lg bg-primary text-[15px] font-bold text-primary-foreground shadow-cta transition hover:brightness-108">
              Add the call to my order · {price}
            </Link>
            <p className="mt-3 text-center text-xs text-muted-foreground">You can review your order and add chapters before paying.</p>
            <div className="mt-auto pt-7">
              <div className="rounded-lg bg-muted px-4.5 py-4">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Bring to the call</div>
                <ul className="mt-3 grid gap-2">
                  {["Your recent test scores", "The chapters you find hardest", "Questions about your plan"].map((t) => (
                    <li key={t} className="flex items-center gap-2.5 text-sm font-semibold">
                      <CheckIcon className="size-3.5 shrink-0 text-ok" strokeWidth={3.5} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>


      <div>
        <MentorSection mentorship={null} names={names} />
      </div>

      <section className="py-16 tablet:py-20">
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

function Detail({ icon, label, children }: { icon: "clock" | "video" | "globe"; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-border py-3.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {icon === "clock" && <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}
          {icon === "video" && <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3z" /></>}
          {icon === "globe" && <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>}
        </svg>
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-sm leading-[1.5] text-foreground">{children}</dd>
      </div>
    </div>
  );
}
