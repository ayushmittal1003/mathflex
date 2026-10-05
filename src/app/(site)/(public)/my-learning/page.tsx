import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { getAccessibleChapterIds } from "@/lib/access";
import { levelFromXp } from "@/lib/gamification";
import { activitySeries } from "@/lib/analytics";
import { requestNow } from "@/lib/time";
import { isStaff } from "@/lib/permissions";
import { duration } from "@/lib/format";
import { Eyebrow, Mark, PlayIcon, posterBg } from "@/components/site/web/primitives";
import { ChapterCard } from "@/components/site/web/ChapterCard";
import { button, container, cx, tone } from "@/components/site/web/ui";

export const metadata = { title: "My Learning" };

const DAY = 86_400_000;

// My Learning: where students land after logging in. Same data as before (entitlements,
// part progress, attempts, XP, badges, bookmarks); nothing new is stored.
export default async function MyLearning() {
  const user = await requireUser("/my-learning");
  const owned = await getAccessibleChapterIds(user.id);
  const ownedIds = [...owned];
  const now = requestNow();
  const [catalog, series, badges, earned, attempts, bookmarks, ownedQuestionCount, rankAbove, settings, ents, parts, last, doneRows, freeParts] = await Promise.all([
    getCatalog(user.id),
    activitySeries(user.id),
    db.badge.findMany({ orderBy: { code: "asc" } }),
    db.userBadge.findMany({ where: { userId: user.id }, select: { badgeId: true } }),
    db.attempt.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { questionId: true, isCorrect: true, selected: true } }),
    db.bookmark.findMany({ where: { userId: user.id }, include: { question: { include: { chapter: { select: { title: true, slug: true } }, part: { select: { order: true } } } } }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.question.count({ where: { chapterId: { in: ownedIds }, isPublished: true } }),
    db.user.count({ where: { xp: { gt: user.xp }, role: "STUDENT" } }),
    getSettings(),
    db.entitlement.findMany({ where: { userId: user.id, expiresAt: { gt: new Date(now) } }, select: { chapterId: true, expiresAt: true, course: { select: { chapters: { select: { chapterId: true } } } } } }),
    db.part.findMany({ where: { chapterId: { in: ownedIds } }, orderBy: { order: "asc" }, select: { id: true, chapterId: true, order: true, title: true, durationSec: true } }),
    db.partProgress.findFirst({ where: { userId: user.id, part: { chapterId: { in: ownedIds } } }, orderBy: { updatedAt: "desc" }, select: { part: { select: { chapterId: true } } } }),
    db.partProgress.findMany({ where: { userId: user.id, videoDone: true, practiceDone: true }, select: { partId: true } }),
    db.part.findMany({ where: { isFreePreview: true }, select: { chapterId: true } }),
  ]);
  const f = settings.features;

  // Practice summary (latest attempt per question decides correct / incorrect).
  const latest = new Map<string, { isCorrect: boolean; skipped: boolean }>();
  for (const a of attempts) if (!latest.has(a.questionId)) latest.set(a.questionId, { isCorrect: a.isCorrect, skipped: a.selected === null });
  const correct = [...latest.values()].filter((a) => a.isCorrect).length;
  const incorrect = [...latest.values()].filter((a) => !a.isCorrect && !a.skipped).length;
  const answered = correct + incorrect;
  const unattempted = Math.max(0, ownedQuestionCount - answered);
  const accuracy = answered ? Math.round((correct / answered) * 100) : null;

  // Access left per chapter (direct purchase or through a course; the later expiry wins).
  const expiry = new Map<string, number>();
  for (const e of ents) {
    const ids = e.chapterId ? [e.chapterId] : e.course?.chapters.map((c) => c.chapterId) ?? [];
    for (const id of ids) expiry.set(id, Math.max(expiry.get(id) ?? 0, e.expiresAt.getTime()));
  }

  // Resume point per owned chapter: the first part not yet fully done.
  const allDone = new Set(doneRows.map((p) => p.partId));
  const partsBy = new Map<string, typeof parts>();
  for (const p of parts) partsBy.set(p.chapterId, [...(partsBy.get(p.chapterId) ?? []), p]);

  const freeIds = new Set(f.freePreviews ? freeParts.map((p) => p.chapterId) : []);
  const mine = catalog
    .filter((c) => c.owned)
    .map((c) => {
      const ps = partsBy.get(c.id) ?? [];
      const next = ps.find((p) => !allDone.has(p.id));
      const daysLeft = expiry.has(c.id) ? Math.ceil((expiry.get(c.id)! - now) / DAY) : null;
      return { ...c, next, doneCount: ps.filter((p) => allDone.has(p.id)).length, daysLeft };
    });
  const lastChapterId = last?.part.chapterId;
  const resume = mine.find((c) => c.id === lastChapterId && c.next) ?? mine.find((c) => c.next && c.doneCount > 0) ?? mine.find((c) => c.next);
  const expiring = mine.filter((c) => c.daysLeft !== null && c.daysLeft <= 30);

  const suggestions = catalog
    .filter((c) => !c.owned && (mine.length || freeIds.has(c.id)))
    .sort((a, b) => Number(freeIds.has(b.id)) - Number(freeIds.has(a.id)) || Number(b.isTrending) - Number(a.isTrending) || b.jeeWeightage - a.jeeWeightage)
    .slice(0, 3)
    .map((c) => ({ ...c, free: freeIds.has(c.id) }));

  const lvl = levelFromXp(user.xp);
  const earnedSet = new Set(earned.map((e) => e.badgeId));
  const first = user.name.trim().split(" ")[0] || "there";
  const week = series.daily.slice(-7);
  const weekXp = week.reduce((s, d) => s + d.xp, 0);
  const weekQ = week.reduce((s, d) => s + d.questions, 0);
  const peak = Math.max(1, ...series.daily.map((d) => d.xp));

  const card = "rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-38px_rgb(80_20_0/0.4)]";
  const h2 = "text-[clamp(24px,2.6vw,30px)] font-extrabold leading-tight tracking-[-0.035em]";

  return (
    <div className={cx(container.listing, "pb-28 pt-[calc(86px+36px)]")}>
      {isStaff(user.role) && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted px-5 py-3.5 text-[15px] font-semibold">
          <span>You&apos;re signed in as a team member.</span>
          <Link href="/admin" className={cx(button.sm, tone.dark)}>Open admin panel →</Link>
        </div>
      )}

      {/* Greeting + level */}
      <section className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div className="min-w-0">
          <Eyebrow dot="ok">My Learning</Eyebrow>
          <h1 className="mt-5 text-[clamp(38px,5.4vw,68px)] font-extrabold leading-[1.02] tracking-[-0.045em]">
            Welcome back, <Mark>{first}</Mark>
          </h1>
          <p className="mt-4 max-w-[560px] text-[17px] leading-[1.55] text-secondary-foreground">
            {user.streak > 0 ? `You're on a ${user.streak}-day streak. Keep it going today.` : mine.length ? "Watch a part or solve a question today to start a streak." : "Start with a free Part 1, no payment needed."}
          </p>
        </div>
        <div className={cx(card, "w-full max-w-[400px] p-5")}>
          <div className="flex items-center gap-4">
            <span className="grid size-14 flex-none place-items-center rounded-xl bg-gradient-to-br from-primary to-brand-2 text-2xl font-black text-white">{lvl.level}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Level {lvl.level} · {lvl.title}</span>
              <span className="mt-2 block h-2 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-gradient-to-r from-primary to-brand-2" style={{ width: `${(lvl.intoLevel / lvl.levelSize) * 100}%` }} />
              </span>
              <span className="mt-1.5 block text-[13px] text-muted-foreground">{(lvl.levelSize - lvl.intoLevel).toLocaleString("en-IN")} XP to Level {lvl.level + 1}</span>
            </span>
          </div>
          {f.leaderboard && (
            <Link href="/leaderboard" className="mt-4 flex items-center justify-between rounded-lg bg-muted px-3.5 py-2.5 text-sm font-bold transition hover:bg-border">
              <span>Leaderboard rank <span className="text-primary">#{rankAbove + 1}</span></span>
              <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="mt-8 grid grid-cols-2 gap-3 min-[700px]:grid-cols-3 min-[1100px]:grid-cols-6" aria-label="Your stats">
        <Stat icon="⚡" label="Total XP" value={user.xp.toLocaleString("en-IN")} sub={`Level ${lvl.level}`} />
        <Stat icon="✨" label="XP earned" value={`+${weekXp.toLocaleString("en-IN")}`} sub="this week" />
        <Stat icon="🔥" label="Day streak" value={`${user.streak}`} sub={`Best ${user.bestStreak}`} />
        <Stat icon="🎯" label="Accuracy" value={accuracy === null ? "–" : `${accuracy}%`} sub={`${answered} answered`} />
        <Stat icon="🏅" label="Badges" value={`${earnedSet.size}`} sub={`of ${badges.length}`} />
        <Stat icon="❓" label="Questions" value={`${ownedQuestionCount}`} sub={mine.length ? `in your ${mine.length === 1 ? "chapter" : `${mine.length} chapters`}` : "buy a chapter to unlock"} />
      </section>

      {/* Continue learning */}
      {resume?.next && (
        <section className="mt-12">
          <Link href={`/learn/${resume.slug}?part=${resume.next.order}`} className={cx(card, "group grid overflow-hidden text-foreground transition duration-300 ease-mf hover:-translate-y-0.5 min-[860px]:grid-cols-[1.1fr_1fr]")}>
            <span className="relative block aspect-[16/9] overflow-hidden text-white min-[860px]:aspect-auto min-[860px]:min-h-[280px]" style={posterBg(resume.coverFrom, resume.coverTo)}>
              <span className={cx("absolute right-[6%] top-1/2 -translate-y-1/2 whitespace-nowrap font-black leading-none tracking-[-0.05em] text-white/20", resume.symbol.length > 2 ? "text-[110px]" : "text-[200px]")}>{resume.symbol}</span>
              <span className="absolute inset-0 bg-[linear-gradient(transparent_40%,rgb(0_0_0/0.5))]" />
              <span className="absolute left-4 top-4 rounded-md bg-white px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-black">Continue learning</span>
              <span className="absolute left-1/2 top-1/2 grid size-[72px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-primary shadow-[0_0_0_12px_rgb(255_255_255/0.16)] transition group-hover:scale-[1.06]">
                <PlayIcon className="size-6" />
              </span>
            </span>
            <span className="flex flex-col justify-center p-6 tablet:p-9">
              <span className="text-sm font-semibold text-muted-foreground">Class {resume.classLevel} · Part {resume.next.order} of {resume.partsCount}</span>
              <span className="mt-2 block text-[clamp(28px,3.2vw,40px)] font-extrabold leading-[1.08] tracking-[-0.04em]">{resume.title}</span>
              <span className="mt-2 block text-[17px] text-secondary-foreground">
                Next: <b className="text-foreground">{resume.next.title}</b>{resume.next.durationSec > 0 && ` · ${duration(resume.next.durationSec)}`}
              </span>
              <span className="mt-6 block">
                <span className="mb-2 flex justify-between text-sm font-semibold"><span>Progress</span><span>{resume.doneCount}/{resume.partsCount} parts</span></span>
                <span className="block h-2 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${(resume.doneCount / Math.max(1, resume.partsCount)) * 100}%` }} />
                </span>
              </span>
              <span className={cx(button.md, tone.primary, "mt-7 self-start")}>
                <PlayIcon /> {resume.doneCount ? `Continue Part ${resume.next.order}` : "Start Part 1"}
              </span>
            </span>
          </Link>
        </section>
      )}

      {/* Plans running out */}
      {expiring.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gold/12 px-5 py-4">
          <span className="text-[15px] font-semibold">
            {expiring.length === 1 ? `${expiring[0].title}: access ends in ${expiring[0].daysLeft} day${expiring[0].daysLeft === 1 ? "" : "s"}.` : `Access to ${expiring.length} chapters ends within 30 days.`}
          </span>
          <Link href="/profile#plans" className={cx(button.sm, tone.dark)}>Renew</Link>
        </div>
      )}

      {/* My chapters */}
      <section className="mt-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className={h2}>{mine.length ? "My chapters" : "Start with a free Part 1"}</h2>
          <Link href="/chapters" className="text-sm font-bold text-primary hover:underline">All chapters →</Link>
        </div>
        {mine.length ? (
          <div className="grid gap-5 min-[600px]:grid-cols-2 min-[1000px]:grid-cols-3">
            {mine.map((c, i) => {
              const pct = c.doneCount / Math.max(1, c.partsCount);
              const href = c.next ? `/learn/${c.slug}?part=${c.next.order}` : `/learn/${c.slug}`;
              return (
                <div key={c.id} className={cx(card, "flex animate-mf-rise flex-col overflow-hidden transition duration-300 ease-mf hover:-translate-y-1")} style={{ animationDelay: `${Math.min(i, 9) * 40}ms` }}>
                  <Link href={href} className="group relative block aspect-video overflow-hidden text-white" style={posterBg(c.coverFrom, c.coverTo)}>
                    <span className={cx("absolute right-[6%] top-1/2 -translate-y-1/2 whitespace-nowrap font-black leading-none tracking-[-0.05em] text-white/22", c.symbol.length > 2 ? "text-[64px]" : "text-[110px]")}>{c.symbol}</span>
                    <span className="absolute inset-0 bg-[linear-gradient(transparent_45%,rgb(0_0_0/0.45))]" />
                    <span className="absolute left-3 top-3 flex gap-1.5">
                      <span className="rounded-md bg-white/92 px-2 py-1 text-[11px] font-extrabold text-black">Class {c.classLevel}</span>
                      {pct === 1 ? (
                        <span className="rounded-md bg-ok px-2 py-1 text-[11px] font-extrabold">Completed</span>
                      ) : c.id === resume?.id ? (
                        <span className="rounded-md bg-primary px-2 py-1 text-[11px] font-extrabold">Continue here</span>
                      ) : null}
                    </span>
                    <span className="absolute bottom-3 left-3 grid size-11 place-items-center rounded-full bg-white text-primary opacity-0 shadow-[0_0_0_8px_rgb(255_255_255/0.18)] transition group-hover:opacity-100">
                      <PlayIcon className="size-4" />
                    </span>
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <Link href={`/chapter/${c.slug}`} className="text-lg font-extrabold leading-tight tracking-[-0.02em] text-foreground hover:text-primary">{c.title}</Link>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-semibold text-muted-foreground">
                      <span>{c.partsCount} parts</span>
                      {c.durationSec > 0 && <span>{duration(c.durationSec)}</span>}
                      {c.jeeWeightage > 0 && <span className="text-[oklch(0.5_0.17_47)]">{c.jeeWeightage}% of JEE</span>}
                    </div>
                    <div className="mt-4 flex justify-between text-[13px] font-semibold"><span>{c.doneCount}/{c.partsCount} parts done</span><span>{Math.round(pct * 100)}%</span></div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cx("h-full rounded-full", pct === 1 ? "bg-ok" : "bg-primary")} style={{ width: `${pct * 100}%` }} /></div>
                    {c.daysLeft !== null && (
                      <div className={cx("mt-3 text-[13px] font-semibold", c.daysLeft <= 30 ? "text-[color-mix(in_oklab,var(--gold)_55%,black)]" : "text-muted-foreground")}>
                        {c.daysLeft} days of access left
                      </div>
                    )}
                    <div className="mt-auto flex gap-2 pt-5">
                      <Link href={href} className={cx(button.sm, tone.primaryFlat, "flex-1")}>{pct === 1 ? "Rewatch" : c.doneCount ? `Continue · Part ${c.next?.order}` : "Start Part 1"}</Link>
                      {f.practice && <Link href={`/practice/${c.slug}`} className={cx(button.sm, tone.secondary)}>Practice</Link>}
                    </div>
                  </div>
                </div>
              );
            })}
            <Link href="/chapters" className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-6 text-center text-foreground transition hover:border-primary/50 hover:bg-selected">
              <span className="grid size-12 place-items-center rounded-full bg-muted text-2xl font-bold">+</span>
              <span className="text-lg font-extrabold tracking-[-0.02em]">Add a chapter</span>
              <span className="max-w-[240px] text-sm text-muted-foreground">Pick the next chapter you&apos;re stuck on, or save with a complete course.</span>
            </Link>
          </div>
        ) : suggestions.length ? (
          <>
            <p className="-mt-2 mb-6 max-w-[620px] text-[15px] leading-[1.6] text-secondary-foreground">Every chapter below has a free first part. Watch it, try the practice set and earn XP. Buy the chapter when you&apos;re ready for the rest.</p>
            <div className="grid gap-5 min-[600px]:grid-cols-2 min-[1000px]:grid-cols-3">
              {suggestions.map((c, i) => <ChapterCard key={c.id} c={c} index={i} />)}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/50 px-6 py-12 text-center">
            <div className="text-xl font-extrabold tracking-[-0.02em]">No chapters yet</div>
            <Link href="/chapters" className={cx(button.md, tone.primary, "mt-5")}>Browse chapters</Link>
          </div>
        )}
      </section>

      {/* This week + practice */}
      <section className="mt-16 grid gap-5 min-[900px]:grid-cols-[1.4fr_1fr]">
        <div className={cx(card, "p-6")}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-[-0.025em]">Your last 2 weeks</h2>
              <p className="mt-1 text-sm text-muted-foreground">This week: {weekXp.toLocaleString("en-IN")} XP · {weekQ} question{weekQ === 1 ? "" : "s"}</p>
            </div>
          </div>
          <div className="mt-6 flex h-36 items-end gap-1.5" role="img" aria-label={`XP earned per day over the last 14 days, ${weekXp} this week`}>
            {series.daily.map((d, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${d.full}: ${d.xp} XP · ${d.questions} questions`}>
                <div className={cx("w-full rounded-t-md", d.xp ? "bg-gradient-to-t from-primary to-brand-2" : "bg-muted")} style={{ height: d.xp ? `${Math.max(6, (d.xp / peak) * 100)}%` : "4px" }} />
                <span className={cx("text-[11px] font-semibold", i === series.daily.length - 1 ? "text-foreground" : "text-muted-foreground")}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={cx(card, "flex flex-col p-6")}>
          <h2 className="text-xl font-extrabold tracking-[-0.025em]">Practice</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {ownedQuestionCount ? `${ownedQuestionCount} questions in your chapters` : "Questions from your chapters show up here"}
          </p>
          {ownedQuestionCount + answered > 0 ? (
            <>
              <div className="mt-5 flex h-3 gap-[2px] overflow-hidden rounded-full bg-muted" role="img" aria-label={`${correct} correct, ${incorrect} incorrect, ${unattempted} not tried`}>
                {correct > 0 && <div className="bg-ok" style={{ width: `${(correct / (answered + unattempted)) * 100}%` }} />}
                {incorrect > 0 && <div className="bg-bad" style={{ width: `${(incorrect / (answered + unattempted)) * 100}%` }} />}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Tile value={`${correct}`} label="Correct" tone="text-ok" />
                <Tile value={`${incorrect}`} label="Wrong" tone="text-bad" />
                <Tile value={accuracy === null ? "–" : `${accuracy}%`} label="Accuracy" />
              </div>
              {f.practice && mine.length > 0 && <Link href="/practice" className={cx(button.sm, tone.secondary, "mt-auto w-full")}>Open question bank →</Link>}
            </>
          ) : (
            <Link href="/free-practice" className={cx(button.sm, tone.secondary, "mt-6 self-start")}>Try free practice →</Link>
          )}
        </div>
      </section>

      {/* Badges */}
      {badges.length > 0 && (
        <section className="mt-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className={h2}>Badges</h2>
            <span className="text-sm font-semibold text-muted-foreground">{earnedSet.size} of {badges.length} earned</span>
          </div>
          <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {[...badges].sort((a, b) => Number(earnedSet.has(b.id)) - Number(earnedSet.has(a.id))).map((b) => {
              const has = earnedSet.has(b.id);
              return (
                <div key={b.id} className={cx(card, "w-[168px] flex-none p-4 text-center", !has && "opacity-55 grayscale")}>
                  <div className="mx-auto grid size-14 place-items-center rounded-full text-[28px]" style={{ background: has ? `${b.color}26` : "var(--muted)" }}>{b.emoji}</div>
                  <div className="mt-3 text-sm font-extrabold">{b.name}</div>
                  <div className="mt-1 text-xs leading-snug text-muted-foreground">{b.description}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Bookmarks */}
      {bookmarks.length > 0 && (
        <section className="mt-16">
          <h2 className={cx(h2, "mb-6")}>Saved questions</h2>
          <div className="grid gap-3 min-[760px]:grid-cols-2">
            {bookmarks.map(({ question: q }) => (
              <Link key={q.id} href={`/learn/${q.chapter.slug}?part=${q.part?.order ?? 1}`} className={cx(card, "block p-5 text-foreground transition hover:-translate-y-0.5 hover:border-foreground/30")}>
                <span className="text-xs font-bold text-muted-foreground">{q.chapter.title} · {q.type}</span>
                <span className="mt-1.5 line-clamp-2 block font-semibold leading-snug">{q.prompt}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* More chapters */}
      {mine.length > 0 && suggestions.length > 0 && (
        <section className="mt-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className={h2}>Add your next chapter</h2>
            <Link href="/courses" className="text-sm font-bold text-primary hover:underline">Complete courses →</Link>
          </div>
          <div className="grid gap-5 min-[600px]:grid-cols-2 min-[1000px]:grid-cols-3">
            {suggestions.map((c, i) => <ChapterCard key={c.id} c={c} index={i} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function Tile({ value, label, tone: t }: { value: string; label: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-muted px-2 py-2.5">
      <div className={cx("text-lg font-extrabold tracking-[-0.03em]", t)}>{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_20px_40px_-34px_rgb(80_20_0/0.4)]">
      <div className="flex items-center gap-2 text-[13px] font-bold text-muted-foreground"><span aria-hidden>{icon}</span>{label}</div>
      <div className="mt-2 text-[26px] font-extrabold leading-none tracking-[-0.04em]">{value}</div>
      <div className="mt-1.5 text-xs font-semibold text-muted-foreground">{sub}</div>
    </div>
  );
}
