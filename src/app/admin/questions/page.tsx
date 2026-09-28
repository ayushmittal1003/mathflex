import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { FORMAT_LABEL, DIFFICULTY_LABEL } from "@/lib/grading";
import { PageHeader, Stat, Badge, Table, Td } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/ConfirmButton";
import { setQuestionPublished } from "../actions";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Question bank" };

type Search = { q?: string; chapter?: string; type?: string; format?: string; difficulty?: string; status?: string; flag?: string; view?: string; page?: string };

const PAGE = 50;
const FLAG_MIN_ATTEMPTS = 10;

// Signals worth a second look, based on how students actually did.
function flagsFor(q: { solution: string; topic: string | null; difficulty: number }, attempts: number, rate: number | null) {
  const flags: { tone: "bad" | "gold" | "muted"; label: string; key: string }[] = [];
  if (rate !== null && attempts >= FLAG_MIN_ATTEMPTS && rate < 20) flags.push({ tone: "bad", label: "Check answer key", key: "key" });
  if (rate !== null && attempts >= FLAG_MIN_ATTEMPTS && rate > 90 && q.difficulty === 3) flags.push({ tone: "gold", label: "Too easy for Hard", key: "level" });
  if (rate !== null && attempts >= FLAG_MIN_ATTEMPTS && rate < 35 && q.difficulty === 1) flags.push({ tone: "gold", label: "Too hard for Easy", key: "level" });
  if (!q.solution.trim()) flags.push({ tone: "muted", label: "No solution", key: "solution" });
  if (!q.topic) flags.push({ tone: "muted", label: "No topic", key: "topic" });
  return flags;
}

export default async function QuestionBank({ searchParams }: { searchParams: Promise<Search> }) {
  await requireStaff("questions");
  const sp = await searchParams;
  const view = sp.view === "coverage" ? "coverage" : "questions";
  const where: Prisma.QuestionWhereInput = {
    ...(sp.q ? { OR: [{ prompt: { contains: sp.q, mode: "insensitive" } }, { topic: { contains: sp.q, mode: "insensitive" } }] } : {}),
    ...(sp.chapter ? { chapterId: sp.chapter } : {}),
    ...(sp.type === "DPP" || sp.type === "PYQ" ? { type: sp.type } : {}),
    ...(sp.format === "SINGLE" || sp.format === "MULTIPLE" || sp.format === "NUMERICAL" ? { format: sp.format } : {}),
    ...(sp.difficulty ? { difficulty: Number(sp.difficulty) } : {}),
    ...(sp.status === "hidden" ? { isPublished: false } : sp.status === "published" ? { isPublished: true } : {}),
  };

  const [chapters, totals, byFormat, pyqs, hidden, attemptStats, questions] = await Promise.all([
    db.chapter.findMany({ orderBy: [{ classLevel: "asc" }, { sortOrder: "asc" }], select: { id: true, title: true, classLevel: true, jeeWeightage: true } }),
    db.question.count(),
    db.question.groupBy({ by: ["format"], _count: true }),
    db.question.count({ where: { type: "PYQ" } }),
    db.question.count({ where: { isPublished: false } }),
    db.attempt.groupBy({ by: ["questionId", "isCorrect"], _count: true }),
    db.question.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      select: { id: true, chapterId: true, partId: true, type: true, format: true, difficulty: true, prompt: true, topic: true, solution: true, exam: true, year: true, isPublished: true },
    }),
  ]);

  const stats = new Map<string, { attempts: number; correct: number }>();
  for (const s of attemptStats) {
    const cur = stats.get(s.questionId) ?? { attempts: 0, correct: 0 };
    cur.attempts += s._count;
    if (s.isCorrect) cur.correct += s._count;
    stats.set(s.questionId, cur);
  }
  const totalAttempts = attemptStats.reduce((s, a) => s + a._count, 0);
  const totalCorrect = attemptStats.filter((a) => a.isCorrect).reduce((s, a) => s + a._count, 0);
  const chapterById = new Map(chapters.map((c) => [c.id, c]));
  const fmt = new Map(byFormat.map((f) => [f.format, f._count]));

  const rows = questions
    .map((q) => {
      const st = stats.get(q.id);
      const rate = st?.attempts ? Math.round((st.correct / st.attempts) * 100) : null;
      return { q, attempts: st?.attempts ?? 0, rate, flags: flagsFor(q, st?.attempts ?? 0, rate) };
    })
    .filter((r) => !sp.flag || r.flags.some((f) => f.key === sp.flag));
  const page = Math.max(1, Number(sp.page) || 1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice((page - 1) * PAGE, page * PAGE);
  const keyIssues = rows.filter((r) => r.flags.some((f) => f.key === "key")).length;

  const href = (patch: Partial<Search>) => {
    const qs = new URLSearchParams(Object.entries({ ...sp, page: undefined, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/questions${qs.size ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Question bank" subtitle="Every DPP and PYQ across chapters, with how students are doing on each." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Questions" value={totals.toLocaleString("en-IN")} sub={`${hidden} hidden`} />
        <Stat label="PYQs" value={pyqs.toLocaleString("en-IN")} sub={`${totals ? Math.round((pyqs / totals) * 100) : 0}% of the bank`} />
        <Stat label="Formats" value={`${fmt.get("SINGLE") ?? 0} · ${fmt.get("MULTIPLE") ?? 0} · ${fmt.get("NUMERICAL") ?? 0}`} sub="single · multi · numerical" />
        <Stat label="Attempts" value={totalAttempts.toLocaleString("en-IN")} sub="all time" />
        <Stat label="Student success rate" value={totalAttempts ? `${Math.round((totalCorrect / totalAttempts) * 100)}%` : "–"} sub={keyIssues ? `${keyIssues} flagged for answer key` : "no answer-key flags"} />
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["questions", "coverage"] as const).map((v) => (
          <Link key={v} href={href({ view: v === "questions" ? undefined : v })} className={`-mb-px border-b-2 px-4 py-3 text-sm font-bold capitalize ${view === v ? "border-brand" : "border-transparent text-muted"}`}>
            {v === "coverage" ? "Chapter coverage" : "Questions"}
          </Link>
        ))}
      </div>

      {view === "coverage" ? (
        <Coverage chapters={chapters} />
      ) : (
        <>
          <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1.4fr_repeat(5,1fr)_auto]">
            <input name="q" defaultValue={sp.q} placeholder="Search question or topic" className="input" />
            <select name="chapter" defaultValue={sp.chapter ?? ""} className="input">
              <option value="">All chapters</option>
              {[11, 12].map((cls) => (
                <optgroup key={cls} label={`Class ${cls}`}>
                  {chapters.filter((c) => c.classLevel === cls).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </optgroup>
              ))}
            </select>
            <select name="type" defaultValue={sp.type ?? ""} className="input"><option value="">DPP + PYQ</option><option value="DPP">DPP</option><option value="PYQ">PYQ</option></select>
            <select name="format" defaultValue={sp.format ?? ""} className="input">
              <option value="">All formats</option>
              {(["SINGLE", "MULTIPLE", "NUMERICAL"] as const).map((f) => <option key={f} value={f}>{FORMAT_LABEL[f]}</option>)}
            </select>
            <select name="difficulty" defaultValue={sp.difficulty ?? ""} className="input"><option value="">Any level</option><option value="1">Easy</option><option value="2">Medium</option><option value="3">Hard</option></select>
            <select name="status" defaultValue={sp.status ?? ""} className="input"><option value="">Any status</option><option value="published">Published</option><option value="hidden">Hidden</option></select>
            <select name="flag" defaultValue={sp.flag ?? ""} className="input">
              <option value="">No flag filter</option>
              <option value="key">Check answer key</option>
              <option value="level">Wrong difficulty</option>
              <option value="solution">No solution</option>
              <option value="topic">No topic</option>
            </select>
            <button className="btn btn-primary !py-2 text-sm">Filter</button>
          </form>

          <p className="text-sm text-muted">
            {rows.length.toLocaleString("en-IN")} questions · flags need {FLAG_MIN_ATTEMPTS}+ attempts
          </p>

          <Table head={["Question", "Chapter", "Format", "Level", "Attempts", "Success", "Flags", ""]} empty={!shown.length}>
            {shown.map(({ q, attempts, rate, flags }) => {
              const ch = chapterById.get(q.chapterId);
              return (
                <tr key={q.id} className={`hover:bg-surface-2 ${q.isPublished ? "" : "opacity-60"}`}>
                  <Td className="max-w-md">
                    <p className="line-clamp-2 font-semibold">{q.prompt}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      <Badge tone={q.type === "PYQ" ? "gold" : "brand"}>{q.type}</Badge>{" "}
                      {q.exam ? `${q.exam}${q.year ? ` ${q.year}` : ""} · ` : ""}{q.topic ?? "no topic"}
                    </p>
                  </Td>
                  <Td className="text-xs">{ch?.title ?? "–"}</Td>
                  <Td className="whitespace-nowrap text-xs">{FORMAT_LABEL[q.format]}</Td>
                  <Td className="text-xs">{DIFFICULTY_LABEL[q.difficulty]}</Td>
                  <Td className="tabular-nums">{attempts}</Td>
                  <Td className={`font-bold tabular-nums ${rate === null ? "text-muted" : rate < 20 ? "text-bad" : rate > 80 ? "text-ok" : ""}`}>{rate === null ? "–" : `${rate}%`}</Td>
                  <Td><div className="flex flex-wrap gap-1">{flags.map((f) => <Badge key={f.label} tone={f.tone}>{f.label}</Badge>)}</div></Td>
                  <Td>
                    <div className="flex justify-end gap-1.5">
                      <Link href={`/admin/chapters/${q.chapterId}?tab=questions${q.partId ? `&part=${q.partId}` : ""}`} className="btn btn-ghost !px-3 !py-1.5 text-xs">Edit</Link>
                      <ActionButton action={setQuestionPublished.bind(null, q.id, !q.isPublished)} className="!text-xs">{q.isPublished ? "Hide" : "Publish"}</ActionButton>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>

          {pages > 1 && (
            <nav className="flex items-center justify-end gap-2 text-sm" aria-label="Pages">
              {page > 1 && <Link href={href({ page: String(page - 1) })} className="btn btn-ghost !py-1.5">Prev</Link>}
              <span className="text-muted">Page {page} of {pages}</span>
              {page < pages && <Link href={href({ page: String(page + 1) })} className="btn btn-ghost !py-1.5">Next</Link>}
            </nav>
          )}
        </>
      )}
    </div>
  );
}

// How well each chapter's bank covers a JEE aspirant's needs: volume, level mix, PYQs, formats.
async function Coverage({ chapters }: { chapters: { id: string; title: string; classLevel: number; jeeWeightage: number }[] }) {
  const counts = await db.question.groupBy({ by: ["chapterId", "difficulty", "type", "format"], where: { isPublished: true }, _count: true });
  const per = new Map<string, { total: number; easy: number; medium: number; hard: number; pyq: number; multi: number; numerical: number }>();
  for (const c of counts) {
    const t = per.get(c.chapterId) ?? { total: 0, easy: 0, medium: 0, hard: 0, pyq: 0, multi: 0, numerical: 0 };
    t.total += c._count;
    if (c.difficulty === 1) t.easy += c._count;
    else if (c.difficulty === 3) t.hard += c._count;
    else t.medium += c._count;
    if (c.type === "PYQ") t.pyq += c._count;
    if (c.format === "MULTIPLE") t.multi += c._count;
    if (c.format === "NUMERICAL") t.numerical += c._count;
    per.set(c.chapterId, t);
  }
  const TARGET = 60; // a healthy per-chapter bank for JEE practice
  return (
    <>
      <p className="text-sm text-muted">Published questions per chapter. Aim for {TARGET}+ with a mix of levels, PYQs and numerical / multi-correct formats, weighted toward high-weightage chapters.</p>
      <Table head={["Chapter", "JEE weight", "Questions", "Easy / Med / Hard", "PYQs", "Multi", "Numerical", ""]} empty={!chapters.length}>
        {chapters.map((c) => {
          const t = per.get(c.id) ?? { total: 0, easy: 0, medium: 0, hard: 0, pyq: 0, multi: 0, numerical: 0 };
          return (
            <tr key={c.id} className="hover:bg-surface-2">
              <Td><span className="font-semibold">{c.title}</span><span className="block text-xs text-muted">Class {c.classLevel}</span></Td>
              <Td className="tabular-nums">{c.jeeWeightage ? `${c.jeeWeightage}%` : "–"}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${t.total} of ${TARGET} target`}>
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (t.total / TARGET) * 100)}%` }} />
                  </div>
                  <span className="font-bold tabular-nums">{t.total}</span>
                </div>
              </Td>
              <Td className="tabular-nums">{t.easy} / {t.medium} / {t.hard}</Td>
              <Td className="tabular-nums">{t.pyq}</Td>
              <Td className="tabular-nums">{t.multi}</Td>
              <Td className="tabular-nums">{t.numerical}</Td>
              <Td><Link href={`/admin/chapters/${c.id}?tab=questions`} className="btn btn-ghost !px-3 !py-1.5 text-xs">Add questions</Link></Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
