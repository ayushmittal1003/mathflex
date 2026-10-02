import Link from "next/link";
import { Flame, Zap, Target, Trophy, Bookmark, Lock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { getAccessibleChapterIds } from "@/lib/access";
import { levelFromXp } from "@/lib/gamification";
import { activitySeries } from "@/lib/analytics";
import { ActivityChart } from "@/components/site/ActivityChart";
import { ChapterPoster } from "@/components/site/ChapterCard";

export const metadata = { title: "My Learning" };

export default async function MyLearning() {
  const user = await requireUser("/my-learning");
  const owned = await getAccessibleChapterIds(user.id);
  const [catalog, series, badges, earned, attempts, bookmarks, ownedQuestionCount, rankAbove, settings] = await Promise.all([
    getCatalog(user.id),
    activitySeries(user.id),
    db.badge.findMany({ orderBy: { code: "asc" } }),
    db.userBadge.findMany({ where: { userId: user.id }, include: { badge: true } }),
    db.attempt.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { questionId: true, isCorrect: true, selected: true } }),
    db.bookmark.findMany({ where: { userId: user.id }, include: { question: { include: { chapter: { select: { title: true, slug: true } }, part: { select: { order: true } } } } }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.question.count({ where: { chapterId: { in: [...owned] }, isPublished: true } }),
    db.user.count({ where: { xp: { gt: user.xp }, role: "STUDENT" } }),
    getSettings(),
  ]);

  // Latest attempt per question decides correct / incorrect.
  const latest = new Map<string, { isCorrect: boolean; skipped: boolean }>();
  for (const a of attempts) if (!latest.has(a.questionId)) latest.set(a.questionId, { isCorrect: a.isCorrect, skipped: a.selected === null });
  const correct = [...latest.values()].filter((a) => a.isCorrect).length;
  const incorrect = [...latest.values()].filter((a) => !a.isCorrect && !a.skipped).length;
  const unattempted = Math.max(0, ownedQuestionCount - correct - incorrect);
  const totalQ = correct + incorrect + unattempted;
  const accuracy = correct + incorrect ? Math.round((correct / (correct + incorrect)) * 100) : 0;

  const lvl = levelFromXp(user.xp);
  const mine = catalog.filter((c) => c.owned);
  const earnedByBadge = new Map<string, number>();
  for (const e of earned) earnedByBadge.set(e.badgeId, (earnedByBadge.get(e.badgeId) ?? 0) + 1);

  return (
    <div className="mx-auto max-w-[1500px] px-4 pt-[calc(var(--nav-h)+2rem)] md:px-8">
      {/* Player card */}
      <section className="relative overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-16 font-display text-[16rem] font-extrabold leading-none text-white/10">{lvl.level}</div>
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <LevelRing pct={lvl.intoLevel / lvl.levelSize} level={lvl.level} />
          <div className="flex-1">
            <p className="text-sm font-bold uppercase tracking-widest opacity-80">Level {lvl.level} · {lvl.title}</p>
            <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Hey {user.name.split(" ")[0]} 👋</h1>
            <p className="mt-1 opacity-90">{lvl.levelSize - lvl.intoLevel} XP to Level {lvl.level + 1}. {user.streak > 0 ? `You're on a ${user.streak}-day streak — don't break it!` : "Solve one question today to start a streak."}</p>
          </div>
          <Link href="/leaderboard" className="flex items-center gap-2 self-start rounded-2xl bg-black/20 px-4 py-3 font-bold backdrop-blur sm:self-center">
            <Trophy className="size-5" /> Rank #{rankAbove + 1}
          </Link>
        </div>
      </section>

      {/* Stat tiles */}
      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Zap} color="text-xp" label="Total XP" value={user.xp.toLocaleString("en-IN")} />
        <Stat icon={Flame} color="text-brand-2" label="Day streak" value={`${user.streak}`} sub={`Best ${user.bestStreak}`} />
        <Stat icon={Target} color="text-ok" label="Accuracy" value={`${accuracy}%`} sub={`${correct + incorrect} answered`} />
        <Stat icon={Trophy} color="text-gold" label="Badges" value={`${earned.length}`} sub={`of ${badges.length} types`} />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <ActivityChart {...series} />
        <div className="card p-5">
          <h3 className="font-bold">Questions in your chapters</h3>
          <p className="text-sm text-muted-foreground">{totalQ} total across {owned.size} chapter{owned.size === 1 ? "" : "s"}</p>
          {totalQ > 0 ? (
            <>
              <div className="mt-6 flex h-4 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`${correct} correct, ${incorrect} incorrect, ${unattempted} unattempted`}>
                {correct > 0 && <div className="bg-ok" style={{ width: `${(correct / totalQ) * 100}%` }} />}
                {incorrect > 0 && <div className="bg-bad" style={{ width: `${(incorrect / totalQ) * 100}%` }} />}
                {unattempted > 0 && <div className="bg-surface-2" style={{ width: `${(unattempted / totalQ) * 100}%` }} />}
              </div>
              <ul className="mt-5 space-y-3 text-sm">
                <Legend swatch="bg-ok" label="Correct" value={correct} total={totalQ} />
                <Legend swatch="bg-bad" label="Incorrect" value={incorrect} total={totalQ} />
                <Legend swatch="bg-surface-2 ring-1 ring-border" label="Unattempted" value={unattempted} total={totalQ} />
              </ul>
            </>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">Buy a chapter to start practising.</p>
          )}
          {totalQ > 0 && settings.features.practice && (
            <Link href="/practice" className="btn btn-ghost mt-5 w-full !py-2 text-sm"><Target className="size-4" /> Open practice analytics</Link>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-extrabold">My chapters</h2>
        {mine.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 [&>a]:!w-full">
            {mine.map((c) => <ChapterPoster key={c.id} c={c} />)}
          </div>
        ) : (
          <div className="card mt-4 p-8 text-center">
            <p className="font-bold">Nothing here yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Every chapter has a free preview. Start one now.</p>
            <Link href="/browse" className="btn btn-primary mt-4">Browse chapters</Link>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-extrabold">Badges</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {badges.map((b) => {
            const n = earnedByBadge.get(b.id) ?? 0;
            return (
              <div key={b.id} className={`card p-4 text-center ${n ? "" : "opacity-50 grayscale"}`}>
                <div className="relative mx-auto grid size-14 place-items-center rounded-full text-3xl" style={{ background: n ? `${b.color}25` : undefined }}>
                  {b.emoji}
                  {!n && <Lock className="absolute -bottom-1 -right-1 size-5 rounded-full bg-card p-1 text-muted-foreground" />}
                  {n > 1 && <span className="absolute -right-1 -top-1 rounded-full bg-foreground px-1.5 text-xs font-bold text-background">×{n}</span>}
                </div>
                <p className="mt-2 text-sm font-bold">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold"><Bookmark className="size-6" /> Bookmarked questions</h2>
        {bookmarks.length ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {bookmarks.map(({ question: q }) => (
              <li key={q.id}>
                <Link href={`/learn/${q.chapter.slug}?part=${q.part?.order ?? 1}`} className="card block p-4 hover:border-primary">
                  <p className="text-xs font-bold text-muted-foreground">{q.chapter.title} · {q.type}</p>
                  <p className="mt-1 line-clamp-2 font-semibold">{q.prompt}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Tap the bookmark icon on any question to save it for revision.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, color, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; color: string; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <Icon className={`size-6 ${color}`} />
      <p className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">{value}</p>
      <p className="text-sm text-muted-foreground">{label}{sub ? ` · ${sub}` : ""}</p>
    </div>
  );
}

function Legend({ swatch, label, value, total }: { swatch: string; label: string; value: number; total: number }) {
  return (
    <li className="flex items-center gap-3">
      <span className={`size-3 rounded-sm ${swatch}`} />
      <span className="flex-1">{label}</span>
      <span className="font-bold">{value}</span>
      <span className="w-10 text-right text-muted-foreground">{Math.round((value / total) * 100)}%</span>
    </li>
  );
}

function LevelRing({ pct, level }: { pct: number; level: number }) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0" role="img" aria-label={`Level ${level}, ${Math.round(pct * 100)}% to next`}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth="8" />
      <circle cx="44" cy="44" r={r} fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 44 44)" />
      <text x="44" y="52" textAnchor="middle" fill="white" fontSize="24" fontWeight="800">{level}</text>
    </svg>
  );
}
