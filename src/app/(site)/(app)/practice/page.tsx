import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Flame, Lock, RotateCcw, Target, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getAccessibleChapterIds } from "@/lib/access";
import { practiceAnalytics } from "@/lib/qbank";
import { accuracyOf, fmtTime, strengthOf, DIFFICULTY_LABEL, FORMAT_LABEL, type Strength } from "@/lib/grading";
import { PracticeTrend } from "@/components/practice/PracticeTrend";

export const metadata = { title: "Practice" };

const STRENGTH: Record<Strength, { label: string; cls: string }> = {
  strong: { label: "Strong", cls: "bg-ok/15 text-ok" },
  weak: { label: "Needs work", cls: "bg-bad/10 text-bad" },
  building: { label: "Building", cls: "bg-gold/15 text-gold" },
  new: { label: "Not started", cls: "bg-surface-2 text-muted-foreground" },
};

export default async function PracticeDashboard() {
  const user = await requireUser("/practice");
  const settings = await getSettings();
  if (!settings.features.practice) notFound();
  const owned = await getAccessibleChapterIds(user.id);
  const [a, chapters] = await Promise.all([
    practiceAnalytics(user.id, owned, settings.marking),
    db.chapter.findMany({
      where: { OR: [{ isPublished: true }, { id: { in: [...owned] } }] },
      orderBy: [{ classLevel: "asc" }, { sortOrder: "asc" }],
      select: { id: true, slug: true, title: true, classLevel: true, coverFrom: true, coverTo: true, symbol: true, _count: { select: { questions: { where: { isPublished: true } } } } },
    }),
  ]);
  const mine = chapters.filter((c) => owned.has(c.id));
  const locked = chapters.filter((c) => !owned.has(c.id) && c._count.questions > 0);
  const o = a.overall;
  const acc = accuracyOf(o);
  const chapterTitle = new Map(chapters.map((c) => [c.id, c]));
  // Pick up where the student is weakest, else the least-practised chapter.
  const next = [...mine]
    .map((c) => ({ c, t: a.byChapter.get(c.id) }))
    .filter(({ t }) => t && t.total > t.attempted)
    .sort((x, y) => (strengthOf(x.t!) === "weak" ? -1 : 0) - (strengthOf(y.t!) === "weak" ? -1 : 0) || x.t!.attempted / x.t!.total - y.t!.attempted / y.t!.total)[0];

  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-16 pt-[calc(var(--nav-h)+2rem)] md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Question bank</p>
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Practice</h1>
          <p className="mt-1 text-muted-foreground">JEE-style questions for every chapter you own, marked +{settings.marking.correct} / {settings.marking.wrong} like the real paper.</p>
        </div>
        {next && (
          <Link href={`/practice/${next.c.slug}?status=new`} className="btn btn-primary">
            <Target className="size-4" /> Continue: {next.c.title}
          </Link>
        )}
      </div>

      {!mine.length ? (
        <div className="card mt-8 p-10 text-center">
          <p className="font-bold">Unlock a chapter to start practising</p>
          <p className="mt-1 text-sm text-muted-foreground">Every chapter comes with its own question bank of DPPs and past-year JEE questions.</p>
          <Link href="/browse" className="btn btn-primary mt-4">Browse chapters</Link>
        </div>
      ) : (
        <>
          {/* Headline numbers */}
          <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Tile icon={Target} tone="text-primary" label="Solved" value={`${o.attempted}`} sub={`of ${o.total} questions`} />
            <Tile icon={TrendingUp} tone="text-ok" label="Accuracy" value={o.attempted ? `${acc}%` : "–"} sub="on first attempts" />
            <Tile icon={Trophy} tone="text-gold" label="JEE marks" value={o.attempted ? `${o.marks}` : "–"} sub={o.attempted ? `of ${o.maxMarks} · ${Math.round((o.marks / o.maxMarks) * 100)}%` : "no attempts yet"} />
            <Tile icon={Clock} tone="text-xp" label="Avg time / question" value={o.attempted ? fmtTime(o.timeMs / o.attempted) : "–"} sub="JEE pace ≈ 2m 00s" />
            <Tile icon={Flame} tone="text-brand-2" label="Today" value={`${a.today}`} sub={`questions · ${user.streak}-day streak`} className="col-span-2 lg:col-span-1" />
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            <PracticeTrend data={a.trend} />
            <div className="card p-5">
              <h3 className="font-bold">Accuracy by level</h3>
              <p className="text-sm text-muted-foreground">First attempts, by question difficulty</p>
              <ul className="mt-5 space-y-4">
                {a.byDifficulty.map((d) => <Meter key={d.level} label={DIFFICULTY_LABEL[d.level]} t={d} />)}
              </ul>
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                {a.byType.map((t) => (
                  <div key={t.type}>
                    <p className="text-muted-foreground">{t.type === "PYQ" ? "Past-year (PYQ)" : "Practice (DPP)"}</p>
                    <p className="font-display text-xl font-extrabold">{t.attempted ? `${accuracyOf(t)}%` : "–"}</p>
                    <p className="text-xs text-muted-foreground">{t.attempted} attempted</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Topics */}
          <section className="mt-5 grid gap-5 md:grid-cols-2">
            <TopicList title="Weak topics" icon={TrendingDown} empty="No weak spots yet. Topics show up here after 3+ attempts under 60% accuracy." topics={a.weakTopics} chapterTitle={chapterTitle} tone="text-bad" />
            <TopicList title="Strong topics" icon={TrendingUp} empty="Score 80%+ on a topic (3+ attempts) to see it here." topics={a.strongTopics} chapterTitle={chapterTitle} tone="text-ok" />
          </section>

          {/* Chapter-wise */}
          <section className="mt-10">
            <h2 className="font-display text-2xl font-extrabold">Chapter-wise performance</h2>
            <div className="card mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Chapter</th>
                    <th className="px-4 py-3 font-semibold">Progress</th>
                    <th className="px-4 py-3 font-semibold">Accuracy</th>
                    <th className="px-4 py-3 font-semibold">Marks</th>
                    <th className="px-4 py-3 font-semibold">Avg time</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mine.map((c) => {
                    const t = a.byChapter.get(c.id) ?? { total: c._count.questions, attempted: 0, correct: 0, marks: 0, maxMarks: 0, timeMs: 0, mistakes: 0 };
                    const s = STRENGTH[strengthOf(t)];
                    const pct = t.total ? t.attempted / t.total : 0;
                    return (
                      <tr key={c.id} className="hover:bg-surface-2/60">
                        <td className="px-4 py-3">
                          <Link href={`/practice/${c.slug}`} className="flex items-center gap-3 font-semibold hover:text-primary">
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg font-display text-sm font-extrabold text-white" style={{ background: `linear-gradient(135deg, ${c.coverFrom}, ${c.coverTo})` }}>{c.symbol.slice(0, 3)}</span>
                            <span>{c.title}<span className="block text-xs font-normal text-muted-foreground">Class {c.classLevel}</span></span>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${t.attempted} of ${t.total} attempted`}>
                              <div className="h-full rounded-full bg-primary" style={{ width: `${pct * 100}%` }} />
                            </div>
                            <span className="tabular-nums text-muted-foreground">{t.attempted}/{t.total}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold tabular-nums">{t.attempted ? `${accuracyOf(t)}%` : "–"}</td>
                        <td className="px-4 py-3 tabular-nums">{t.attempted ? `${t.marks}/${t.maxMarks}` : "–"}</td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">{t.attempted ? fmtTime(t.timeMs / t.attempted) : "–"}</td>
                        <td className="px-4 py-3"><span className={`rounded-md px-2 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {t.mistakes > 0 && (
                              <Link href={`/practice/${c.slug}?status=mistakes`} className="btn btn-ghost !px-3 !py-1.5 text-xs"><RotateCcw className="size-3.5" /> Retry {t.mistakes}</Link>
                            )}
                            <Link href={`/practice/${c.slug}`} className="btn btn-primary !px-3 !py-1.5 text-xs">Practice</Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {a.byFormat.some((f) => f.format !== "SINGLE" && f.total > 0) && (
            <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {a.byFormat.filter((f) => f.total > 0).map((f) => (
                <div key={f.format} className="card p-4">
                  <p className="text-sm text-muted-foreground">{FORMAT_LABEL[f.format]}</p>
                  <p className="font-display text-2xl font-extrabold">{f.attempted ? `${accuracyOf(f)}%` : "–"}</p>
                  <p className="text-xs text-muted-foreground">{f.attempted}/{f.total} attempted · {f.marks} marks</p>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {locked.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-extrabold">Unlock more question banks</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {locked.map((c) => (
              <Link key={c.id} href={`/chapter/${c.slug}`} className="card flex items-center gap-3 p-4 hover:border-primary">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl font-display font-extrabold text-white" style={{ background: `linear-gradient(135deg, ${c.coverFrom}, ${c.coverTo})` }}>{c.symbol.slice(0, 3)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.title}</span>
                  <span className="text-xs text-muted-foreground">{c._count.questions} questions</span>
                </span>
                <Lock className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Tile({ icon: Icon, tone, label, value, sub, className = "" }: { icon: React.ComponentType<{ className?: string }>; tone: string; label: string; value: string; sub: string; className?: string }) {
  return (
    <div className={`card p-4 sm:p-5 ${className}`}>
      <Icon className={`size-5 ${tone}`} />
      <p className="mt-3 font-display text-2xl font-extrabold tabular-nums sm:text-3xl">{value}</p>
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function Meter({ label, t }: { label: string; t: { attempted: number; correct: number; total: number } }) {
  const acc = accuracyOf(t);
  return (
    <li>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums"><b>{t.attempted ? `${acc}%` : "–"}</b> <span className="text-muted-foreground">· {t.attempted}/{t.total}</span></span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${label}: ${acc}% accuracy`}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${t.attempted ? acc : 0}%` }} />
      </div>
    </li>
  );
}

function TopicList({ title, icon: Icon, empty, topics, chapterTitle, tone }: {
  title: string; icon: React.ComponentType<{ className?: string }>; empty: string; tone: string;
  topics: { topic: string; chapterId: string; attempted: number; correct: number }[];
  chapterTitle: Map<string, { slug: string; title: string }>;
}) {
  return (
    <div className="card p-5">
      <h3 className="flex items-center gap-2 font-bold"><Icon className={`size-5 ${tone}`} /> {title}</h3>
      {topics.length ? (
        <ul className="mt-3 divide-y divide-border text-sm">
          {topics.map((t) => {
            const c = chapterTitle.get(t.chapterId);
            return (
              <li key={`${t.chapterId}-${t.topic}`}>
                <Link href={c ? `/practice/${c.slug}?topic=${encodeURIComponent(t.topic)}` : "#"} className="flex items-center gap-3 py-2.5 hover:text-primary">
                  <span className="min-w-0 flex-1"><span className="font-semibold">{t.topic}</span><span className="block truncate text-xs text-muted-foreground">{c?.title}</span></span>
                  <span className="tabular-nums text-muted-foreground">{t.correct}/{t.attempted}</span>
                  <span className="w-11 text-right font-bold tabular-nums">{accuracyOf(t)}%</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
