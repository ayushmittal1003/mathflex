import Link from "next/link";
import { ADVANCED_MATHS, ADVANCED_PATTERN, MAIN_DATES, MAIN_MATHS, MAIN_PATTERN, SOURCES, UPDATED } from "@/lib/jee-exam";
import { Eyebrow, Mark } from "@/components/site/web/primitives";
import { Breadcrumbs } from "@/components/site/web/Breadcrumbs";
import { CtaBand } from "@/components/site/web/CtaBand";
import { button, container, cx, tone } from "@/components/site/web/ui";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "JEE 2027: Exam Dates, Pattern and Maths Syllabus",
  description: "JEE Main 2027 session dates, exam pattern, marking and shifts, how many times you can attempt, and the JEE Main and Advanced maths syllabus.",
  path: "/jee-exam",
});

const h2 = "text-[clamp(26px,3.4vw,40px)] font-extrabold leading-[1.08] tracking-[-0.04em]";
const card = "overflow-hidden rounded-xl border border-border bg-card";

function Rows({ rows }: { rows: { k: string; v: string }[] }) {
  return (
    <dl className={cx(card, "divide-y divide-border")}>
      {rows.map((r) => (
        <div key={r.k} className="grid gap-1 px-5 py-4 min-[640px]:grid-cols-[180px_1fr] min-[640px]:gap-6">
          <dt className="text-sm font-bold text-muted-foreground">{r.k}</dt>
          <dd className="text-[15px] leading-[1.55]">{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

// JEE 2027 guide. Facts and sources live in lib/jee-exam.ts; update them there when NTA or JAB post a notice.
export default function JeeExamPage() {
  return (
    <>
      <section className={cx(container.text, "pt-[calc(86px+28px)]")}>
        <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "JEE 2027 exam guide", path: "/jee-exam" }]} />
        <div className="mt-8 text-center">
          <Eyebrow dot="ok">Updated {UPDATED}</Eyebrow>
          <h1 className="mx-auto mt-5.5 max-w-[900px] text-[clamp(34px,6vw,76px)] font-extrabold leading-[1.05] tracking-[-0.045em] text-balance">
            JEE 2027, <Mark>explained</Mark>
          </h1>
          <p className="mx-auto mt-5 max-w-[640px] text-[17px] leading-[1.6] text-secondary-foreground text-pretty">
            When the exams are, how the paper works, how many times you can sit it, and the maths you need. From NTA&apos;s official JEE Main 2027 bulletin and the JEE Advanced website.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">By the Mathflex team</p>
        </div>
      </section>

      <div className={cx(container.text, "mt-14 grid gap-16 pb-6")}>
        <section aria-labelledby="attempts">
          <h2 id="attempts" className={h2}>How many times can you sit it?</h2>
          <div className="mt-6 grid gap-4 min-[760px]:grid-cols-2">
            <div className={cx(card, "p-5")}>
              <div className="text-sm font-bold uppercase tracking-[0.06em] text-primary">JEE Main</div>
              <p className="mt-2 text-[15px] leading-[1.6]"><b>Twice a year.</b> It runs in two sessions, January and April. You can sit one or both, and NTA uses your better score for the merit list.</p>
              <p className="mt-2 text-[15px] leading-[1.6] text-secondary-foreground">For 2027 you can apply if you passed Class 12 in 2025 or 2026, or are taking it in 2027. There&apos;s no age limit.</p>
            </div>
            <div className={cx(card, "p-5")}>
              <div className="text-sm font-bold uppercase tracking-[0.06em] text-primary">JEE Advanced</div>
              <p className="mt-2 text-[15px] leading-[1.6]"><b>Two attempts in total,</b> in two consecutive years. It&apos;s held once a year, and you first need a qualifying JEE Main rank.</p>
              <p className="mt-2 text-[15px] leading-[1.6] text-secondary-foreground">Age and Class 12 year conditions apply: check the JEE Advanced 2027 brochure when it&apos;s published.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="dates">
          <h2 id="dates" className={h2}>JEE Main 2027 dates</h2>
          <p className="mt-3 text-[15px] text-secondary-foreground">Official dates from NTA&apos;s 2027 bulletin. Each session has its own application window.</p>
          <div className="mt-6"><Rows rows={MAIN_DATES.map((d) => ({ k: d.what, v: d.when }))} /></div>
          <div className={cx(card, "mt-4 bg-muted/60 p-5")}>
            <div className="text-sm font-bold">JEE Advanced 2027</div>
            <p className="mt-1 text-[15px] leading-[1.6] text-secondary-foreground">Not announced yet. It&apos;s usually held in May: the 2026 exam was on 17 May 2026. Watch jeeadv.ac.in for the 2027 date.</p>
          </div>
        </section>

        <section aria-labelledby="pattern">
          <h2 id="pattern" className={h2}>JEE Main exam pattern</h2>
          <p className="mt-3 text-[15px] text-secondary-foreground">Paper 1 (B.E./B.Tech.). Each session runs over several days and shifts, and NTA turns raw marks into percentiles so every shift is compared fairly.</p>
          <div className="mt-6"><Rows rows={MAIN_PATTERN} /></div>
          <p className="mt-4 text-sm text-muted-foreground">
            Practise the same layout: exam mode in our <Link href="/practice" className="font-bold text-primary underline underline-offset-[3px]">practice question bank</Link> uses the JEE Main computer-based screen and marking.
          </p>
        </section>

        <section aria-labelledby="advanced">
          <h2 id="advanced" className={h2}>JEE Advanced exam pattern</h2>
          <p className="mt-3 text-[15px] text-secondary-foreground">From the 2026 exam, the latest held. The 2027 pattern will be in its brochure.</p>
          <div className="mt-6"><Rows rows={ADVANCED_PATTERN} /></div>
        </section>

        <section aria-labelledby="syllabus">
          <h2 id="syllabus" className={h2}>Maths syllabus</h2>
          <p className="mt-3 text-[15px] text-secondary-foreground">The units at a glance. The official documents list every topic under each one.</p>
          <div className="mt-6 grid gap-4 min-[760px]:grid-cols-2">
            {[
              { title: "JEE Main", items: MAIN_MATHS, href: SOURCES[1].href, link: "Full JEE Main syllabus (NTA)" },
              { title: "JEE Advanced", items: ADVANCED_MATHS, href: SOURCES[3].href, link: "Full JEE Advanced syllabus" },
            ].map((s) => (
              <div key={s.title} className={cx(card, "p-5")}>
                <h3 className="text-lg font-extrabold tracking-[-0.02em]">{s.title}</h3>
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[15px] leading-[1.5] marker:text-muted-foreground">
                  {s.items.map((t) => <li key={t}>{t}</li>)}
                </ol>
                <a href={s.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-[3px]">{s.link}</a>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Every unit is covered chapter by chapter on <Link href="/chapters" className="font-bold text-primary underline underline-offset-[3px]">our chapters page</Link>, with the highest-weightage chapters first.
          </p>
        </section>

        <section aria-labelledby="sources" className="border-t border-border pt-8">
          <h2 id="sources" className="text-lg font-extrabold">Sources</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {SOURCES.map((s) => (
              <li key={s.href}><a href={s.href} target="_blank" rel="noreferrer" className="text-secondary-foreground underline underline-offset-[3px] hover:text-primary">{s.label}</a></li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">Dates and rules can change. Always confirm on the official websites before you apply. Last checked {UPDATED}.</p>
        </section>
      </div>

      <CtaBand>
        <h2 className="mx-auto max-w-[760px] text-[clamp(28px,4.6vw,58px)] font-extrabold leading-[1.04] tracking-[-0.045em] text-balance">
          Start with the chapters that <Mark>count</Mark>
        </h2>
        <p className="mx-auto mt-4.5 max-w-[500px] text-[17px] leading-[1.55] text-secondary-foreground">Watch any chapter&apos;s free preview, then buy only what you need.</p>
        <div className="mt-7 cta-row">
          <Link href="/chapters" className={cx(button.md, tone.primary)}>Browse chapters</Link>
          <Link href="/courses" className={cx(button.md, tone.secondary)}>See full courses</Link>
        </div>
      </CtaBand>
    </>
  );
}
