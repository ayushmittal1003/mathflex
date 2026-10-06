import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getAccessibleChapterIds } from "@/lib/access";
import { practiceAnalytics } from "@/lib/qbank";
import { accuracyOf, fmtTime, strengthOf, DIFFICULTY_LABEL, FORMAT_LABEL, type Strength } from "@/lib/grading";
import { PracticeTrend } from "@/components/site/web/practice/PracticeTrend";
import { Eyebrow, Mark, posterBg } from "@/components/site/web/primitives";
import { button, container, cx, tone } from "@/components/site/web/ui";

export const metadata = { title: "Practice" };

const STRENGTH: Record<Strength, { label: string; cls: string }> = {
  strong: { label: "Strong", cls: "bg-ok/12 text-ok" },
  weak: { label: "Needs work", cls: "bg-bad/10 text-bad" },
  building: { label: "Building", cls: "bg-gold/18 text-[color-mix(in_oklab,var(--gold)_55%,black)]" },
  new: { label: "Not started", cls: "bg-muted text-muted-foreground" },
};
const card = "rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-38px_rgb(80_20_0/0.4)]";
const h2 = "text-[clamp(24px,2.6vw,30px)] font-extrabold leading-tight tracking-[-0.035em]";

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

  const tiles = [
    { label: "Solved", value: `${o.attempted}`, sub: `of ${o.total} questions` },
    { label: "Accuracy", value: o.attempted ? `${acc}%` : "–", sub: "on first attempts" },
    { label: "JEE marks", value: o.attempted ? `${o.marks}` : "–", sub: o.attempted ? `of ${o.maxMarks} · ${Math.round((o.marks / o.maxMarks) * 100)}%` : "no attempts yet" },
    { label: "Avg time / question", value: o.attempted ? fmtTime(o.timeMs / o.attempted) : "–", sub: "JEE pace ≈ 2m 00s" },
    { label: "Today", value: `${a.today}`, sub: `questions · ${user.streak}-day streak` },
  ];

  return (
    <div className={cx(container.listing, "pb-28 pt-[calc(86px+36px)]")}>
      <section className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div>
          <Eyebrow dot="ok">Question bank</Eyebrow>
          <h1 className="mt-5 text-[clamp(36px,4.6vw,56px)] font-extrabold leading-[1.04] tracking-[-0.045em]">
            <Mark>Practice</Mark> like the real paper
          </h1>
          <p className="mt-3 max-w-[560px] text-[17px] leading-[1.55] text-secondary-foreground">
            JEE-style questions for every chapter you own, marked +{settings.marking.correct} / {settings.marking.wrong} like the real exam.
          </p>
        </div>
        {next && (
          <Link href={`/practice/${next.c.slug}?status=new`} className={cx(button.md, tone.primary)}>Continue: {next.c.title} →</Link>
        )}
      </section>

      {!mine.length ? (
        <div className="mt-10 rounded-2xl bg-wash px-6 py-14 text-center tablet:py-16">
          <div className="text-[clamp(24px,2.6vw,30px)] font-extrabold tracking-[-0.035em]">Unlock a chapter to start practising</div>
          <p className="mx-auto mt-2 max-w-[460px] text-[15px] leading-[1.6] text-secondary-foreground">Every chapter comes with its own question bank of DPPs and past-year JEE questions.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link href="/chapters" className={cx(button.md, tone.primary)}>Browse chapters</Link>
            <Link href="/free-practice" className={cx(button.md, tone.secondary)}>Try free practice</Link>
          </div>
        </div>
      ) : (
        <>
          {/* Headline numbers */}
          <section className={cx(card, "mt-8 grid grid-cols-2 overflow-hidden min-[1000px]:grid-cols-5")} aria-label="Your numbers">
            {tiles.map((t, i) => (
              <div key={t.label} className={cx("p-5 tablet:p-6", i > 0 && "min-[1000px]:border-l min-[1000px]:border-border", i % 2 === 1 && "border-l border-border", i > 1 && "border-t border-border min-[1000px]:border-t-0", i === 4 && "col-span-2 min-[1000px]:col-span-1")}>
                <div className="text-[13px] font-bold text-muted-foreground">{t.label}</div>
                <div className="mt-2 text-[30px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{t.value}</div>
                <div className="mt-2 text-xs font-semibold text-muted-foreground">{t.sub}</div>
              </div>
            ))}
          </section>

          <section className="mt-5 grid gap-5 min-[1000px]:grid-cols-[1.6fr_1fr]">
            <PracticeTrend data={a.trend} />
            <div className={cx(card, "p-6")}>
              <h3 className="text-xl font-extrabold tracking-[-0.025em]">Accuracy by level</h3>
              <p className="mt-1 text-sm text-muted-foreground">First attempts, by question difficulty</p>
              <ul className="mt-6 space-y-4">
                {a.byDifficulty.map((d) => <Meter key={d.level} label={DIFFICULTY_LABEL[d.level]} t={d} />)}
              </ul>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {a.byType.map((t) => (
                  <div key={t.type} className="rounded-lg bg-muted px-4 py-3">
                    <p className="text-xs font-bold text-muted-foreground">{t.type === "PYQ" ? "Past-year (PYQ)" : "Practice (DPP)"}</p>
                    <p className="mt-1 text-xl font-extrabold tracking-[-0.03em]">{t.attempted ? `${accuracyOf(t)}%` : "–"}</p>
                    <p className="text-xs text-muted-foreground">{t.attempted} attempted</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Topics */}
          <section className="mt-5 grid gap-5 min-[760px]:grid-cols-2">
            <TopicList title="Weak topics" dot="bg-bad" empty="No weak spots yet. Topics show up here after 3+ attempts under 60% accuracy." topics={a.weakTopics} chapterTitle={chapterTitle} />
            <TopicList title="Strong topics" dot="bg-ok" empty="Score 80%+ on a topic (3+ attempts) to see it here." topics={a.strongTopics} chapterTitle={chapterTitle} />
          </section>

          {/* Chapter-wise */}
          <section className="mt-16">
            <h2 className={h2}>Chapter-wise performance</h2>
            <div className="mt-6 grid gap-4 min-[760px]:grid-cols-2 min-[1100px]:grid-cols-3">
              {mine.map((c) => {
                const t = a.byChapter.get(c.id) ?? { total: c._count.questions, attempted: 0, correct: 0, marks: 0, maxMarks: 0, timeMs: 0, mistakes: 0 };
                const s = STRENGTH[strengthOf(t)];
                const pct = t.total ? t.attempted / t.total : 0;
                return (
                  <div key={c.id} className={cx(card, "flex flex-col p-5")}>
                    <div className="flex items-center gap-3.5">
                      <span className={cx("grid size-12 shrink-0 place-items-center rounded-xl font-black text-white", c.symbol.length > 2 ? "text-xs" : "text-lg")} style={posterBg(c.coverFrom, c.coverTo)}>{c.symbol}</span>
                      <span className="min-w-0 flex-1">
                        <Link href={`/practice/${c.slug}`} className="block truncate text-[17px] font-extrabold tracking-[-0.02em] text-foreground hover:text-primary">{c.title}</Link>
                        <span className="text-xs font-semibold text-muted-foreground">Class {c.classLevel}</span>
                      </span>
                      <span className={cx("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", s.cls)}>{s.label}</span>
                    </div>
                    <div className="mt-5 flex justify-between text-[13px] font-semibold"><span>{t.attempted}/{t.total} attempted</span><span className="text-muted-foreground">{Math.round(pct * 100)}%</span></div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${t.attempted} of ${t.total} attempted`}>
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct * 100}%` }} />
                    </div>
                    <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <Mini label="Accuracy" value={t.attempted ? `${accuracyOf(t)}%` : "–"} />
                      <Mini label="Marks" value={t.attempted ? `${t.marks}/${t.maxMarks}` : "–"} />
                      <Mini label="Avg time" value={t.attempted ? fmtTime(t.timeMs / t.attempted) : "–"} />
                    </dl>
                    <div className="mt-auto flex gap-2 pt-5">
                      <Link href={`/practice/${c.slug}`} className={cx(button.sm, tone.primaryFlat, "flex-1")}>Practice</Link>
                      {t.mistakes > 0 && <Link href={`/practice/${c.slug}?status=mistakes`} className={cx(button.sm, tone.secondary)}>↺ Retry {t.mistakes}</Link>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {a.byFormat.some((f) => f.format !== "SINGLE" && f.total > 0) && (
            <section className="mt-5 grid grid-cols-1 gap-4 min-[600px]:grid-cols-3">
              {a.byFormat.filter((f) => f.total > 0).map((f) => (
                <div key={f.format} className={cx(card, "p-5")}>
                  <p className="text-sm font-bold text-muted-foreground">{FORMAT_LABEL[f.format]}</p>
                  <p className="mt-1 text-2xl font-extrabold tracking-[-0.03em]">{f.attempted ? `${accuracyOf(f)}%` : "–"}</p>
                  <p className="text-xs text-muted-foreground">{f.attempted}/{f.total} attempted · {f.marks} marks</p>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {locked.length > 0 && (
        <section className="mt-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className={h2}>Unlock more question banks</h2>
            <Link href="/chapters" className="text-sm font-bold text-primary hover:underline">All chapters →</Link>
          </div>
          <div className="grid gap-3 min-[600px]:grid-cols-2 min-[1000px]:grid-cols-4">
            {locked.map((c) => (
              <Link key={c.id} href={`/chapter/${c.slug}`} className={cx(card, "flex items-center gap-3.5 p-4 text-foreground transition hover:-translate-y-0.5")}>
                <span className={cx("grid size-11 shrink-0 place-items-center rounded-xl font-black text-white", c.symbol.length > 2 ? "text-[11px]" : "text-base")} style={posterBg(c.coverFrom, c.coverTo)}>{c.symbol}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{c.title}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{c._count.questions} questions</span>
                </span>
                <span aria-hidden className="text-muted-foreground">🔒</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted px-2 py-2.5">
      <dd className="text-[15px] font-extrabold tabular-nums tracking-[-0.02em]">{value}</dd>
      <dt className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground">{label}</dt>
    </div>
  );
}

function Meter({ label, t }: { label: string; t: { attempted: number; correct: number; total: number } }) {
  const acc = accuracyOf(t);
  return (
    <li>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-bold">{label}</span>
        <span className="tabular-nums"><b>{t.attempted ? `${acc}%` : "–"}</b> <span className="text-muted-foreground">· {t.attempted}/{t.total}</span></span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${label}: ${acc}% accuracy`}>
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-brand-2" style={{ width: `${t.attempted ? acc : 0}%` }} />
      </div>
    </li>
  );
}

function TopicList({ title, dot, empty, topics, chapterTitle }: {
  title: string; dot: string; empty: string;
  topics: { topic: string; chapterId: string; attempted: number; correct: number }[];
  chapterTitle: Map<string, { slug: string; title: string }>;
}) {
  return (
    <div className={cx(card, "p-6")}>
      <h3 className="flex items-center gap-2.5 text-xl font-extrabold tracking-[-0.025em]"><span className={cx("size-2.5 rounded-full", dot)} /> {title}</h3>
      {topics.length ? (
        <ul className="mt-4 grid gap-1 text-sm">
          {topics.map((t) => {
            const c = chapterTitle.get(t.chapterId);
            return (
              <li key={`${t.chapterId}-${t.topic}`}>
                <Link href={c ? `/practice/${c.slug}?topic=${encodeURIComponent(t.topic)}` : "#"} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-muted">
                  <span className="min-w-0 flex-1"><span className="font-bold">{t.topic}</span><span className="block truncate text-xs text-muted-foreground">{c?.title}</span></span>
                  <span className="tabular-nums text-muted-foreground">{t.correct}/{t.attempted}</span>
                  <span className="w-11 text-right font-extrabold tabular-nums">{accuracyOf(t)}%</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-[1.6] text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
