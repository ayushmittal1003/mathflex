import Link from "next/link";
import { inr } from "@/lib/format";
import { instructor } from "@/lib/site-content";
import { Eyebrow, Mark } from "../primitives";
import { VideoFrame } from "../VideoFrame";
import { button, cx, tone } from "../ui";

// 07 Meet the mentor: intro video (or "Video coming soon"), bio, credentials timeline and
// the 1:1 call upsell (details on /book-a-call; it's the existing mentorship add-on).
export function MentorSection({ mentorship, names }: { mentorship: { price: number } | null; names: { short: string; full: string } }) {
  return (
    <section id="mentor" className="py-22">
      <div className="mx-auto flex w-[min(1120px,calc(100%-48px))] flex-wrap items-stretch gap-x-12 gap-y-10">
        <VideoFrame
          videoId={instructor.introVideoId}
          caption={names.full}
          sub={instructor.title}
          className="min-h-[440px] min-w-0 flex-[1_1_340px] tablet:min-h-[560px]"
        />
        <div className="min-w-0 flex-[1_1_360px]">
          <Eyebrow>Your mentor</Eyebrow>
          <h2 className="mt-5.5 text-[clamp(36px,4.6vw,60px)] font-extrabold leading-[1.04] tracking-[-0.045em] text-balance">
            Learn from someone who&apos;s <Mark>been there</Mark>.
          </h2>
          <p className="mt-5 max-w-[520px] text-[17px] leading-[1.6] text-secondary-foreground text-pretty">
            {names.full} {instructor.bio}
          </p>
          <div className="mt-8">
            {instructor.credentials.map((c, i) => {
              const last = i === instructor.credentials.length - 1;
              return (
                <div key={c.org} className={cx("relative flex gap-4.5", !last && "pb-5.5")}>
                  {!last && <span aria-hidden className="absolute bottom-0 left-1.5 top-4 w-0.5 bg-border" />}
                  <span
                    aria-hidden
                    className={cx(
                      "mt-1 size-3.5 shrink-0 rounded-full border-[3px]",
                      c.current ? "border-[color-mix(in_oklab,var(--primary)_30%,var(--card))] bg-primary" : "border-foreground bg-card",
                    )}
                  />
                  <div>
                    <div className="text-[17px] font-extrabold tracking-[-0.015em]">{c.org}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{c.role}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {mentorship && (
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-border pt-6">
              <div className="flex-[1_1_220px]">
                <div className="text-base font-extrabold">Book a 1:1 call with {names.short}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">Plan your prep and fix your weak chapters. Add it at checkout.</div>
              </div>
              <Link href="/book-a-call" className={cx(button.lg, tone.dark)}>Book for {inr(mentorship.price)}</Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
