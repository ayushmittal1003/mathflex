import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { hasChapterAccess } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import { questionStatuses, type QuestionStatus } from "@/lib/qbank";
import { accuracyOf, fmtTime, FORMAT_LABEL } from "@/lib/grading";
import { PracticePlayer, type PracticeQuestion } from "@/components/practice/PracticePlayer";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await db.chapter.findUnique({ where: { slug }, select: { title: true } });
  return { title: c ? `${c.title} · Practice` : "Practice" };
}

type Search = { status?: string; difficulty?: string; type?: string; format?: string; topic?: string };

const STATUS_FILTERS: [string, string][] = [["all", "All"], ["new", "Unattempted"], ["mistakes", "Mistakes"], ["bookmarked", "Bookmarked"], ["solved", "Solved"]];

export default async function ChapterPractice({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Search> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/practice/${slug}`);
  const settings = await getSettings();
  if (!settings.features.practice) notFound();
  const chapter = await db.chapter.findUnique({ where: { slug }, select: { id: true, slug: true, title: true, classLevel: true, coverFrom: true, coverTo: true } });
  if (!chapter) notFound();
  if (!(await hasChapterAccess(user.id, chapter.id))) redirect(`/chapter/${slug}`);

  const [questions, bookmarks] = await Promise.all([
    db.question.findMany({ where: { chapterId: chapter.id, isPublished: true }, orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }] }),
    db.bookmark.findMany({ where: { userId: user.id, question: { chapterId: chapter.id } }, select: { questionId: true } }),
  ]);
  const rows = await questionStatuses(user.id, questions, settings.marking);
  const marked = new Set(bookmarks.map((b) => b.questionId));

  // Chapter summary (first attempts), independent of the filters.
  const firsts = rows.filter((r) => r.first);
  const correct = firsts.filter((r) => r.first!.g.isCorrect).length;
  const marks = firsts.reduce((s, r) => s + r.first!.g.marks, 0);
  const avgTime = firsts.length ? firsts.reduce((s, r) => s + Math.min(r.first!.a.timeMs, 600_000), 0) / firsts.length : 0;
  const solved = rows.filter((r) => r.status === "correct").length;
  const mistakes = rows.filter((r) => r.status === "incorrect" || r.status === "partial").length;

  const status = sp.status ?? "all";
  const matchStatus = (s: QuestionStatus, id: string) =>
    status === "new" ? s === "new" || s === "skipped"
    : status === "mistakes" ? s === "incorrect" || s === "partial"
    : status === "solved" ? s === "correct"
    : status === "bookmarked" ? marked.has(id)
    : true;
  const shown = rows.filter(({ q, status: s }) =>
    matchStatus(s, q.id) &&
    (!sp.difficulty || q.difficulty === Number(sp.difficulty)) &&
    (!sp.type || q.type === sp.type) &&
    (!sp.format || q.format === sp.format) &&
    (!sp.topic || q.topic?.toLowerCase() === sp.topic.toLowerCase()),
  );
  // Retrying mistakes or skipped ones starts clean: hide the old answer and key until they answer again.
  const fresh = status === "mistakes" || status === "new";
  const player: PracticeQuestion[] = shown.map(({ q, latest }) => {
    const prior = fresh ? null : latest;
    return {
      id: q.id, type: q.type, format: q.format, exam: q.exam, year: q.year, difficulty: q.difficulty, topic: q.topic,
      prompt: q.prompt, options: q.options, bookmarked: marked.has(q.id),
      prior: prior
        ? {
            answer: { selected: prior.a.selected, selectedMany: prior.a.selectedMany, numericValue: prior.a.numericValue },
            result: { ...prior.g, solution: q.solution, key: { correctIndex: q.correctIndex, correctIndices: q.correctIndices, numericAnswer: q.numericAnswer, tolerance: q.tolerance } },
          }
        : null,
    };
  });

  const topics = [...new Set(questions.map((q) => q.topic).filter((t): t is string => !!t))].sort();
  const formats = [...new Set(questions.map((q) => q.format))];
  const href = (patch: Partial<Search>) => {
    const next = { ...sp, ...patch };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v && v !== "all") as [string, string][]);
    return `/practice/${slug}${qs.size ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-[calc(var(--nav-h)+1.5rem)] md:px-8">
      <Link href="/practice" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"><ChevronLeft className="size-4" /> Practice dashboard</Link>
      <header className="mt-3 overflow-hidden rounded-3xl p-5 text-white sm:p-6" style={{ background: `linear-gradient(135deg, ${chapter.coverFrom}, ${chapter.coverTo})` }}>
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">Class {chapter.classLevel} · Question bank</p>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{chapter.title}</h1>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HeroStat label="Solved" value={`${solved}/${questions.length}`} />
          <HeroStat label="Accuracy" value={firsts.length ? `${accuracyOf({ attempted: firsts.length, correct })}%` : "–"} />
          <HeroStat label="Marks" value={firsts.length ? `${marks}/${firsts.length * settings.marking.correct}` : "–"} />
          <HeroStat label="Avg time" value={firsts.length ? fmtTime(avgTime) : "–"} />
        </dl>
      </header>

      <nav className="mt-5 space-y-3" aria-label="Filters">
        <Chips>
          {STATUS_FILTERS.map(([k, label]) => (
            <Chip key={k} href={href({ status: k })} active={status === k}>
              {label}{k === "mistakes" && mistakes ? ` (${mistakes})` : ""}
            </Chip>
          ))}
        </Chips>
        <Chips>
          <Chip href={href({ difficulty: undefined })} active={!sp.difficulty}>Any level</Chip>
          {["1", "2", "3"].map((d) => <Chip key={d} href={href({ difficulty: d })} active={sp.difficulty === d}>{["", "Easy", "Medium", "Hard"][+d]}</Chip>)}
          <span className="mx-1 w-px self-stretch bg-border" />
          <Chip href={href({ type: undefined })} active={!sp.type}>DPP + PYQ</Chip>
          <Chip href={href({ type: "PYQ" })} active={sp.type === "PYQ"}>PYQs only</Chip>
          {formats.length > 1 && (
            <>
              <span className="mx-1 w-px self-stretch bg-border" />
              <Chip href={href({ format: undefined })} active={!sp.format}>All formats</Chip>
              {formats.map((f) => <Chip key={f} href={href({ format: f })} active={sp.format === f}>{FORMAT_LABEL[f]}</Chip>)}
            </>
          )}
        </Chips>
        {topics.length > 0 && (
          <Chips>
            <Chip href={href({ topic: undefined })} active={!sp.topic}>All topics</Chip>
            {topics.map((t) => <Chip key={t} href={href({ topic: t })} active={sp.topic?.toLowerCase() === t.toLowerCase()}>{t}</Chip>)}
          </Chips>
        )}
      </nav>

      <div className="mt-6">
        {questions.length ? (
          <PracticePlayer key={JSON.stringify(sp)} questions={player} sound={settings.features.celebrationSound} />
        ) : (
          <div className="card p-10 text-center text-muted-foreground">Questions for this chapter are on the way.</div>
        )}
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/20 px-3 py-2.5 backdrop-blur">
      <dt className="text-xs font-semibold opacity-80">{label}</dt>
      <dd className="font-display text-lg font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}

function Chips({ children }: { children: React.ReactNode }) {
  return <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">{children}</div>;
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} scroll={false} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${active ? "bg-foreground text-background" : "bg-surface-2 text-muted-foreground hover:text-foreground"}`}>
      {children}
    </Link>
  );
}
