import Link from "next/link";
import { LEVELS, getPracticeSet } from "@/lib/free-practice";
import { Eyebrow, Mark } from "@/components/site/web/primitives";
import { PracticeArena } from "@/components/site/web/free-practice/PracticeArena";
import { button, container, cx, tone } from "@/components/site/web/ui";

export const metadata = {
  title: "Free practice",
  description: "Free JEE maths practice questions, Easy to Hard, with instant answers and worked solutions.",
  alternates: { canonical: "/free-practice" },
};

// Free practice (Resources): public question sets by subject and level, checked in the
// browser. Questions come from lib/free-practice (placeholder set until a CMS is connected).
export default async function FreePracticePage() {
  const questions = await getPracticeSet("maths");
  const counts = LEVELS.map((l) => `${questions.filter((q) => q.level === l.key).length} ${l.label.toLowerCase()}`).join(" · ");

  return (
    <>
      <section className="px-6 pb-10 pt-[calc(86px+40px)] text-center">
        <Eyebrow dot="ok">Free practice</Eyebrow>
        <h1 className="mx-auto mt-5.5 max-w-[900px] text-[clamp(40px,6vw,80px)] font-extrabold leading-none tracking-[-0.045em] text-balance">
          Practise JEE maths, <Mark>free</Mark>
        </h1>
        <p className="mx-auto mt-5 max-w-[560px] text-[17px] leading-[1.55] text-secondary-foreground text-pretty">
          Pick a level, answer at your own pace and see the worked solution right after. No sign-up needed.
        </p>
        {questions.length > 0 && (
          <p className="mt-4 font-mono text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{questions.length} questions · {counts}</p>
        )}
      </section>

      <PracticeArena questions={questions} />

      <section className={cx(container.listing, "pb-28")}>
        <div className="flex flex-col items-start gap-6 rounded-2xl bg-wash p-8 tablet:flex-row tablet:items-center tablet:justify-between tablet:p-10">
          <div className="max-w-[620px]">
            <h2 className="text-[clamp(24px,2.8vw,32px)] font-extrabold leading-tight tracking-[-0.035em]">Want a full question bank for every chapter?</h2>
            <p className="mt-2 text-[16px] leading-[1.6] text-secondary-foreground">Each Mathflex chapter comes with DPPs and past JEE questions, marked like the real paper, with your progress saved.</p>
          </div>
          <Link href="/chapters" className={cx(button.lg, tone.primary)}>Browse chapters →</Link>
        </div>
      </section>
    </>
  );
}
