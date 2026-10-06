import Link from "next/link";
import { instructor } from "@/lib/site-content";
import { Eyebrow, Mark } from "../primitives";
import { VideoFrame } from "../VideoFrame";
import { button, cx, tone } from "../ui";

// 07 Meet the mentor: a 16:9 intro video (or "Video coming soon"), bio, the IIT Delhi
// credential and the 1:1 call card (details on /book-a-call; it's the mentorship add-on).
export function MentorSection({ mentorship, names }: { mentorship: { price: number } | null /* null hides the call card */; names: { short: string; full: string } }) {
  return (
    <section id="mentor" className="py-22">
      <div className="mx-auto grid w-[min(1120px,calc(100%-48px))] items-center gap-x-14 gap-y-10 min-[960px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <VideoFrame videoId={instructor.introVideoId} caption={names.full} sub={instructor.title} className="aspect-video w-full" />
        <div className="min-w-0">
          <Eyebrow>Your mentor</Eyebrow>
          <h2 className="mt-5.5 text-[clamp(34px,4.2vw,54px)] font-extrabold leading-[1.04] tracking-[-0.045em] text-balance">
            Learn from someone who&apos;s <Mark>been there</Mark>.
          </h2>
          <p className="mt-5 max-w-[520px] text-[17px] leading-[1.6] text-secondary-foreground text-pretty">
            {names.full} {instructor.bio}
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {instructor.credentials.map((c) => (
              <div key={c.org} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-[0_10px_24px_-20px_rgb(80_20_0/0.5)]">
                <span aria-hidden className="grid size-10 place-items-center rounded-lg bg-foreground text-[13px] font-black text-white">IIT</span>
                <span>
                  <span className="block text-[16px] font-extrabold tracking-[-0.015em]">{c.org}</span>
                  <span className="block text-[13px] text-muted-foreground">{c.role}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {mentorship && (
        <div className="mx-auto mt-12 w-[min(1120px,calc(100%-48px))]">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-5 rounded-2xl bg-wash px-6 py-7 tablet:px-9">
            <span aria-hidden className="grid size-14 flex-none place-items-center rounded-full bg-gradient-to-br from-primary to-brand-2 text-2xl text-white shadow-[0_14px_30px_-14px_rgb(255_46_99/0.6)]">☎</span>
            <div className="min-w-0 flex-[1_1_280px]">
              <div className="text-[clamp(20px,2.2vw,26px)] font-extrabold tracking-[-0.03em]">Book a 1:1 call with {names.short}</div>
              <div className="mt-1 text-[15px] leading-[1.55] text-secondary-foreground">Plan your prep and fix your weak chapters, one on one.</div>
            </div>
            <Link href="/book-a-call" className={cx(button.lg, tone.primary)}>Book a call</Link>
          </div>
        </div>
      )}
    </section>
  );
}
