import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { levelFromXp } from "@/lib/gamification";
import { reached, rewardProgress } from "@/lib/rewards";
import { Eyebrow, Mark } from "@/components/site/web/primitives";
import { ClaimReward } from "@/components/site/web/ClaimReward";
import { button, container, cx, tone } from "@/components/site/web/ui";
import { privateMetadata } from "@/lib/seo/metadata";

export const metadata = privateMetadata("Streaks, XP and rewards");

const card = "rounded-xl border border-border bg-card";
const h2 = "text-[clamp(24px,3.2vw,36px)] font-extrabold leading-[1.1] tracking-[-0.035em]";
const TIER_TONE: Record<string, string> = { BRONZE: "bg-[#B4713D]", SILVER: "bg-[#8A94A6]", GOLD: "bg-[#D4A017]" };

// How streaks, XP, levels, badges and milestone rewards work, with the student's own progress.
// Every number here comes from settings and the real XP rules in lib/gamification.ts and actions/learn.ts.
export default async function RewardsPage() {
  const [user, settings, badges] = await Promise.all([getCurrentUser(), getSettings(), db.badge.findMany({ orderBy: { code: "asc" } })]);
  const [progress, claims, earned] = user
    ? await Promise.all([
        rewardProgress(user.id),
        db.rewardClaim.findMany({ where: { userId: user.id } }),
        db.userBadge.findMany({ where: { userId: user.id }, select: { badgeId: true } }),
      ])
    : [null, [], []];
  const earnedSet = new Set(earned.map((b) => b.badgeId));
  const x = settings.xp;
  const lvl = user ? levelFromXp(user.xp) : null;
  const level2 = levelFromXp(0).levelSize;

  return (
    <div className={cx(container.text, "pb-24 pt-[calc(86px+36px)]")}>
      <div className="text-center">
        <Eyebrow dot="ok">Streaks, XP &amp; rewards</Eyebrow>
        <h1 className="mx-auto mt-5.5 max-w-[860px] text-[clamp(34px,6vw,72px)] font-extrabold leading-[1.05] tracking-[-0.045em] text-balance">
          Show up daily. <Mark>Earn</Mark> real rewards.
        </h1>
        <p className="mx-auto mt-5 max-w-[620px] text-[17px] leading-[1.6] text-secondary-foreground text-pretty">
          Every part you watch and every question you get right earns XP and keeps your streak alive. Reach a milestone and the Mathflex team sends you a reward.
        </p>
        {user && lvl && (
          <div className="mx-auto mt-7 grid max-w-[560px] grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border text-center">
            {[[`${user.streak}`, "day streak", `best ${user.bestStreak}`], [user.xp.toLocaleString("en-IN"), "XP", `Level ${lvl.level} · ${lvl.title}`], [`${earnedSet.size}/${badges.length}`, "badges", "earned"]].map(([v, l, s]) => (
              <div key={l} className="bg-card px-3 py-4">
                <div className="text-2xl font-extrabold tabular-nums tracking-[-0.03em]">{v}</div>
                <div className="text-xs font-bold text-muted-foreground">{l}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{s}</div>
              </div>
            ))}
          </div>
        )}
        {!user && (
          <div className="mt-7 cta-row">
            <Link href="/login?next=/rewards" className={cx(button.md, tone.primary)}>Log in to track your progress</Link>
          </div>
        )}
      </div>

      <section className="mt-16" aria-labelledby="milestones">
        <h2 id="milestones" className={h2}>Milestone rewards</h2>
        <p className="mt-2 text-[15px] leading-[1.55] text-secondary-foreground">Reach all three targets in a tier to unlock it. Each tier can be claimed once, and the Mathflex team arranges your reward by hand.</p>
        <div className="mt-6 grid gap-4 min-[860px]:grid-cols-3">
          {settings.rewards.tiers.map((t) => {
            const claim = claims.find((c) => c.tier === t.key);
            const done = progress ? reached(t, progress) : false;
            return (
              <div key={t.key} className={cx(card, "flex flex-col p-5", done && "border-ok shadow-[0_0_0_3px_color-mix(in_oklab,var(--ok)_18%,transparent)]")}>
                <div className="flex items-center gap-2.5">
                  <span className={cx("size-4 rounded-full", TIER_TONE[t.key] ?? "bg-muted")} aria-hidden />
                  <h3 className="text-xl font-extrabold tracking-[-0.02em]">{t.name}</h3>
                </div>
                <p className="mt-2 text-sm leading-[1.5] text-secondary-foreground"><b className="text-foreground">Reward:</b> {t.reward}</p>
                <ul className="mt-4 grid gap-3">
                  <Target label="Parts watched to the end" have={progress?.parts} need={t.parts} />
                  <Target label="Questions answered correctly" have={progress?.correct} need={t.correct} />
                  <Target label="Best daily streak (days)" have={progress?.streak} need={t.streak} />
                </ul>
                <div className="mt-auto pt-5">
                  {!user ? null : claim ? (
                    <p className="rounded-lg bg-muted px-3.5 py-3 text-sm font-bold">{claim.status === "SENT" ? "Reward sent 🎉" : claim.status === "DECLINED" ? "Not approved. Contact support." : "Claimed. We'll contact you soon."}</p>
                  ) : done ? (
                    <ClaimReward tier={t.key} askShoutout={/shout-out/i.test(t.reward)} />
                  ) : (
                    <p className="text-xs text-muted-foreground">Keep going: all three bars must be full.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-16" aria-labelledby="streak">
        <h2 id="streak" className={h2}>How your streak works</h2>
        <ul className={cx(card, "mt-6 divide-y divide-border")}>
          {[
            ["What counts", "Any day you earn XP: finish watching a part, get a question right for the first time, finish a practice set or complete a chapter."],
            ["When a day ends", "Days follow Indian time (IST) and reset at midnight."],
            ["Keeping it", "Do something that earns XP every day and your streak goes up by one."],
            ["Missing a day", `Your streak restarts at 1 the next time you earn XP. Your best streak is kept, and that's what counts for rewards.`],
            ["Daily bonus", `+${x.dailyStreakBonus} XP the first time each day you finish a part or get a question right.`],
          ].map(([k, v]) => (
            <li key={k} className="grid gap-1 px-5 py-4 min-[640px]:grid-cols-[170px_1fr] min-[640px]:gap-6">
              <span className="text-sm font-bold text-muted-foreground">{k}</span>
              <span className="text-[15px] leading-[1.55]">{v}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16" aria-labelledby="xp">
        <h2 id="xp" className={h2}>How you earn XP</h2>
        <ul className={cx(card, "mt-6 divide-y divide-border")}>
          {[
            ["Finish watching a part", `+${x.perPartVideo} XP`],
            ["Answer a question correctly (first time only)", `+${x.perCorrect} XP`],
            ["Finish a part's practice set", `+${x.perPracticeSet} XP`],
            ["Complete a whole chapter", `+${x.perChapter} XP`],
            ["First XP of the day", `+${x.dailyStreakBonus} XP bonus`],
          ].map(([k, v]) => (
            <li key={k} className="flex items-center justify-between gap-4 px-5 py-4 text-[15px]">
              <span>{k}</span>
              <b className="shrink-0 text-xp">{v}</b>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm leading-[1.55] text-muted-foreground">
          A part counts as watched when you reach the end of the video. Retrying a question you got wrong earns no XP, so the leaderboard stays fair. Levels: {level2.toLocaleString("en-IN")} XP takes you to Level 2, and each level after needs 20% more.
        </p>
      </section>

      {badges.length > 0 && (
        <section className="mt-16" aria-labelledby="badges">
          <h2 id="badges" className={h2}>Badges</h2>
          <div className="mt-6 grid gap-3 min-[600px]:grid-cols-2">
            {badges.map((b) => (
              <div key={b.id} className={cx(card, "flex items-center gap-3.5 p-4", user && !earnedSet.has(b.id) && "opacity-60")}>
                <span className="text-2xl" aria-hidden>{b.emoji}</span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold">{b.name}{user && earnedSet.has(b.id) && <span className="ml-2 text-xs font-bold text-ok-strong">Earned</span>}</span>
                  <span className="block text-sm text-muted-foreground">{b.description}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-16 cta-row">
        <Link href={user ? "/my-learning" : "/chapters"} className={cx(button.md, tone.primary)}>{user ? "Back to My Learning" : "Browse chapters"}</Link>
        <Link href="/leaderboard" className={cx(button.md, tone.secondary)}>See the leaderboard</Link>
      </div>
    </div>
  );
}

function Target({ label, have, need }: { label: string; have?: number; need: number }) {
  const pct = have === undefined ? 0 : Math.min(100, Math.round((have / need) * 100));
  return (
    <li>
      <div className="flex justify-between gap-3 text-[13px]">
        <span className="font-semibold">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{have === undefined ? need.toLocaleString("en-IN") : `${Math.min(have, need).toLocaleString("en-IN")} / ${need.toLocaleString("en-IN")}`}</span>
      </div>
      {have !== undefined && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={need} aria-valuenow={Math.min(have, need)}>
          <div className={cx("h-full rounded-full", pct >= 100 ? "bg-ok" : "bg-primary")} style={{ width: `${pct}%` }} />
        </div>
      )}
    </li>
  );
}
