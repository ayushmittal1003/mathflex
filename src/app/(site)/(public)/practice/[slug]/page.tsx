import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { hasChapterAccess } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import { questionStatuses, type QuestionStatus } from "@/lib/qbank";
import { accuracyOf, fmtTime, FORMAT_LABEL } from "@/lib/grading";
import { PracticePlayer, type PracticeQuestion } from "@/components/site/web/practice/PracticePlayer";
import { ExamMode } from "@/components/site/web/practice/ExamMode";
import { Download } from "lucide-react";
import { posterBg } from "@/components/site/web/primitives";
import { container, cx } from "@/components/site/web/ui";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await db.chapter.findUnique({ where: { slug }, select: { title: true } });
  return { title: c ? `${c.title} · Practice` : "Practice" };
}

type Search = { status?: string; difficulty?: string; type?: string; format?: string; topic?: string; year?: string; mode?: string };

const RESOURCE_LABEL: Record<string, string> = { DPP_SHEET: "DPP", PYQ_SHEET: "PYQ", HANDWRITTEN: "Handwritten notes", NOTES: "Short notes", FORMULA_SHEET: "Formula sheet", MINDMAP: "Mind map", OTHER: "PDF" };

const STATUS_FILTERS: [string, string][] = [["all", "All"], ["new", "Unattempted"], ["mistakes", "Mistakes"], ["bookmarked", "Bookmarked"], ["solved", "Solved"]];

export default async function ChapterPractice({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Search> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/practice/${slug}`);
  const settings = await getSettings();
  if (!settings.features.practice) notFound();
  const chapter = await db.chapter.findUnique({ where: { slug }, select: { id: true, slug: true, title: true, classLevel: true, coverFrom: true, coverTo: true } });
  if (!chapter) notFound();
  if (!(await hasChapterAccess(user.id, chapter.id))) redirect(`/chapter/${slug}`);

  const [questions, bookmarks, files] = await Promise.all([
    db.question.findMany({ where: { chapterId: chapter.id, isPublished: true }, orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }] }),
    db.bookmark.findMany({ where: { userId: user.id, question: { chapterId: chapter.id } }, select: { questionId: true } }),
    // Downloadable PDFs for this chapter: DPP / PYQ sheets and notes (the page already requires access).
    db.resource.findMany({ where: { chapterId: chapter.id, isPublished: true }, orderBy: [{ type: "asc" }, { createdAt: "asc" }], select: { id: true, title: true, type: true, fileUrl: true } }),
  ]);
  const exam = sp.mode === "exam";
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
    (!sp.topic || q.topic?.toLowerCase() === sp.topic.toLowerCase()) &&
    (!sp.year || q.year === Number(sp.year)),
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
  // Years that have questions in this chapter, newest first, with how many each.
  const yearCounts = new Map<number, number>();
  for (const q of questions) if (q.year) yearCounts.set(q.year, (yearCounts.get(q.year) ?? 0) + 1);
  const years = [...yearCounts.keys()].sort((a, b) => b - a);
  const href = (patch: Partial<Search>) => {
    const next = { ...sp, ...patch };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v && v !== "all") as [string, string][]);
    return `/practice/${slug}${qs.size ? `?${qs}` : ""}`;
  };

  const stats = [
    { label: "Solved", value: `${solved}/${questions.length}` },
    { label: "Accuracy", value: firsts.length ? `${accuracyOf({ attempted: firsts.length, correct })}%` : "–" },
    { label: "Marks", value: firsts.length ? `${marks}/${firsts.length * settings.marking.correct}` : "–" },
    { label: "Avg time", value: firsts.length ? fmtTime(avgTime) : "–" },
  ];

  return (
    <div className={cx(container.detail, "pb-28 pt-[calc(86px+32px)]")}>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Link href="/practice" className="hover:text-foreground">Practice</Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{chapter.title}</span>
      </nav>

      {/* Chapter header */}
      <header className="mt-5 grid overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-38px_rgb(80_20_0/0.4)] min-[860px]:grid-cols-[300px_1fr]">
        <div className="relative min-h-[150px] overflow-hidden text-white" style={posterBg(chapter.coverFrom, chapter.coverTo)}>
          <span className="absolute left-5 top-5 rounded-md bg-white px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-black">Question bank</span>
          <span className="absolute bottom-5 left-5 text-sm font-bold text-white/90">Class {chapter.classLevel} · marked +{settings.marking.correct} / {settings.marking.wrong}</span>
        </div>
        <div className="p-6 tablet:p-8">
          <h1 className="text-[clamp(30px,3.6vw,44px)] font-extrabold leading-[1.05] tracking-[-0.04em]">{chapter.title}</h1>
          <dl className="mt-6 grid grid-cols-2 gap-3 min-[600px]:grid-cols-4">
            {stats.map((st) => (
              <div key={st.label} className="rounded-lg bg-muted px-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">{st.label}</dt>
                <dd className="mt-1 text-xl font-extrabold tabular-nums tracking-[-0.03em]">{st.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {files.length > 0 && (
        <section className="mt-6" aria-label="Downloads">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">Download PDFs</h2>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {files.map((f) => (
              <a key={f.id} href={f.fileUrl} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm font-semibold hover:border-foreground/40">
                <Download className="size-4 text-primary" />
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-primary">{RESOURCE_LABEL[f.type] ?? "PDF"}</span>
                <span className="max-w-[220px] truncate">{f.title}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* How to practise: instant feedback, or a timed test in the JEE computer-based layout. */}
      <div className="mt-8 inline-flex rounded-lg bg-foreground p-1" role="tablist" aria-label="Practice mode">
        {([["instant", "Instant answers"], ["exam", "Exam mode"]] as const).map(([k, label]) => (
          <Link key={k} href={href({ mode: k === "exam" ? "exam" : undefined, status: k === "exam" ? undefined : sp.status })} scroll={false} role="tab" aria-selected={(k === "exam") === exam}
            className={cx("rounded-md px-4 py-2 text-sm font-bold transition", (k === "exam") === exam ? "bg-card text-foreground" : "text-card/75 hover:text-card")}>{label}</Link>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{exam ? "A timed test: answers and explanations appear when you end the test." : "See the answer and explanation right after each question."}</p>

      {/* Filters */}
      <nav className="mt-6 space-y-3" aria-label="Filters">
        {!exam && <Chips>
          {STATUS_FILTERS.map(([k, label]) => (
            <Chip key={k} href={href({ status: k })} active={status === k}>
              {label}{k === "mistakes" && mistakes ? ` (${mistakes})` : ""}
            </Chip>
          ))}
        </Chips>}
        <Chips>
          <Chip href={href({ difficulty: undefined })} active={!sp.difficulty}>Any level</Chip>
          {["1", "2", "3"].map((d) => <Chip key={d} href={href({ difficulty: d })} active={sp.difficulty === d}>{["", "Easy", "Medium", "Hard"][+d]}</Chip>)}
          <span className="mx-1 w-px self-stretch bg-border" />
          <Chip href={href({ type: undefined })} active={!sp.type}>DPP + PYQ</Chip>
          <Chip href={href({ type: "DPP" })} active={sp.type === "DPP"}>DPPs only</Chip>
          <Chip href={href({ type: "PYQ" })} active={sp.type === "PYQ"}>PYQs only</Chip>
          {formats.length > 1 && (
            <>
              <span className="mx-1 w-px self-stretch bg-border" />
              <Chip href={href({ format: undefined })} active={!sp.format}>All formats</Chip>
              {formats.map((f) => <Chip key={f} href={href({ format: f })} active={sp.format === f}>{FORMAT_LABEL[f]}</Chip>)}
            </>
          )}
        </Chips>
        {years.length > 0 && (
          <Chips>
            <Chip href={href({ year: undefined })} active={!sp.year}>All years</Chip>
            {years.map((y) => <Chip key={y} href={href({ year: String(y) })} active={sp.year === String(y)}>{y} ({yearCounts.get(y)})</Chip>)}
          </Chips>
        )}
        {topics.length > 0 && (
          <Chips>
            <Chip href={href({ topic: undefined })} active={!sp.topic}>All topics</Chip>
            {topics.map((t) => <Chip key={t} href={href({ topic: t })} active={sp.topic?.toLowerCase() === t.toLowerCase()}>{t}</Chip>)}
          </Chips>
        )}
      </nav>

      <div className="mt-8">
        {questions.length && exam ? (
          <ExamMode
            key={JSON.stringify(sp)}
            chapterId={chapter.id}
            chapterTitle={chapter.title}
            section={sp.type === "PYQ" ? "PYQs" : sp.type === "DPP" ? "DPPs" : "DPPs + PYQs"}
            candidate={user.name}
            marking={settings.marking}
            questions={shown.map(({ q }) => ({ id: q.id, type: q.type, format: q.format, exam: q.exam, year: q.year, prompt: q.prompt, options: q.options }))}
          />
        ) : questions.length ? (
          <PracticePlayer key={JSON.stringify(sp)} questions={player} sound={settings.features.celebrationSound} />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/50 px-6 py-14 text-center text-muted-foreground">Questions for this chapter are on the way.</div>
        )}
      </div>
    </div>
  );
}

function Chips({ children }: { children: React.ReactNode }) {
  return <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">{children}</div>;
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cx(
        "tap relative shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition duration-200 ease-mf",
        active ? "border-foreground bg-foreground text-card" : "border-border bg-card text-secondary-foreground hover:border-foreground/40",
      )}
    >
      {children}
    </Link>
  );
}
