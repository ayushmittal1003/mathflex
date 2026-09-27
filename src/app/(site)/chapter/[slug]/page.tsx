import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, Lock, CheckCircle2, Clock, FileText, Target, BarChart3, Brain, ListChecks, Map as MapIcon, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { computePartStates, hasChapterAccess } from "@/lib/access";
import { getCatalog } from "@/lib/catalog";
import { duration, inr, pctOff } from "@/lib/format";
import { AddToCart } from "@/components/site/AddToCart";
import { Row } from "@/components/site/Row";
import { ChapterPoster } from "@/components/site/ChapterCard";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await db.chapter.findUnique({ where: { slug }, select: { title: true, tagline: true } });
  return c ? { title: c.title, description: c.tagline } : {};
}

export default async function ChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const [chapter, settings] = await Promise.all([
    db.chapter.findUnique({
      where: { slug },
      include: {
        parts: { orderBy: { order: "asc" }, include: { _count: { select: { questions: true } } } },
        questions: { where: { isPublished: true }, select: { type: true } },
        resources: { where: { isPublished: true }, orderBy: { createdAt: "asc" } },
        courses: { include: { course: true } },
      },
    }),
    getSettings(),
  ]);
  if (!chapter || (!chapter.isPublished && user?.role !== "ADMIN")) notFound();

  const owned = await hasChapterAccess(user?.id, chapter.id);
  const progress = user
    ? await db.partProgress.findMany({ where: { userId: user.id, partId: { in: chapter.parts.map((p) => p.id) } } })
    : [];
  const progMap = new Map(progress.map((p) => [p.partId, p]));
  const states = computePartStates(chapter.parts, progMap, {
    hasAccess: owned,
    sequential: settings.features.sequentialUnlock,
    freePreviewIds: new Set(settings.features.freePreviews ? chapter.parts.filter((p) => p.isFreePreview).map((p) => p.id) : []),
  });
  const totalSec = chapter.parts.reduce((s, p) => s + p.durationSec, 0);
  const dpp = chapter.questions.filter((q) => q.type === "DPP").length;
  const pyq = chapter.questions.filter((q) => q.type === "PYQ").length;
  const doneCount = chapter.parts.filter((p) => states.get(p.id) === "done").length;
  const resumePart = chapter.parts.find((p) => states.get(p.id) === "open") ?? chapter.parts[0];
  const preview = chapter.parts.find((p) => p.isFreePreview);
  const off = pctOff(chapter.price, chapter.mrp);
  const related = (await getCatalog(user?.id)).filter((c) => c.classLevel === chapter.classLevel && c.id !== chapter.id).slice(0, 12);
  const bundles = chapter.courses.map((c) => c.course).filter((c) => c.isPublished);

  return (
    <div>
      {/* Billboard */}
      <section className="relative overflow-hidden text-white" style={{ background: `linear-gradient(125deg, ${chapter.coverFrom}, ${chapter.coverTo})` }}>
        <div className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 select-none font-display text-[18rem] font-extrabold leading-none text-white/15 sm:text-[28rem]">
          {chapter.symbol}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent" />
        <div className="relative mx-auto max-w-[1500px] px-4 pb-16 pt-[calc(var(--nav-h)+3rem)] md:px-8 md:pb-24">
          <nav className="text-sm font-semibold text-white/70">
            <Link href="/browse">Chapters</Link> / <Link href={`/browse?class=${chapter.classLevel}`}>Class {chapter.classLevel}</Link>
          </nav>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">{chapter.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-white/85">
            <span className="rounded-md border border-white/40 px-1.5 py-0.5 text-xs">Class {chapter.classLevel}</span>
            <span>{chapter.parts.length} parts</span>
            {totalSec > 0 && <span className="flex items-center gap-1"><Clock className="size-4" /> {duration(totalSec)}</span>}
            {chapter.jeeWeightage > 0 && <span className="text-green-300">{chapter.jeeWeightage}% of JEE Main</span>}
            <span>{"★".repeat(chapter.difficulty)}{"☆".repeat(3 - chapter.difficulty)} difficulty</span>
          </div>
          <p className="mt-4 max-w-2xl text-base text-white/85 sm:text-lg">{chapter.tagline}</p>

          {owned ? (
            <div className="mt-7 max-w-md">
              <div className="mb-2 flex justify-between text-sm font-semibold"><span>Your progress</span><span>{doneCount}/{chapter.parts.length} parts</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${(doneCount / Math.max(1, chapter.parts.length)) * 100}%` }} /></div>
              <Link href={`/learn/${chapter.slug}?part=${resumePart?.order ?? 1}`} className="btn mt-5 bg-white !px-7 text-black">
                <Play className="size-5 fill-current" /> {doneCount ? `Continue · Part ${resumePart?.order}` : "Start Part 1"}
              </Link>
            </div>
          ) : (
            <div className="mt-7">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-4xl font-extrabold">{inr(chapter.price)}</span>
                {off > 0 && <span className="text-lg text-white/60 line-through">{inr(chapter.mrp)}</span>}
                {off > 0 && <span className="rounded-full bg-green-500 px-2.5 py-0.5 text-sm font-bold">{off}% OFF</span>}
              </div>
              <p className="mt-1 text-sm text-white/70">{chapter.validityDays} days access · all parts, DPPs, PYQs & notes</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <AddToCart variant="buy" item={{ type: "CHAPTER", id: chapter.id }} className="!bg-none !bg-white !px-7 !text-black !shadow-none" />
                <AddToCart variant="button" item={{ type: "CHAPTER", id: chapter.id }} className="!bg-white/20 !text-white backdrop-blur" />
                {preview && settings.features.freePreviews && (
                  <Link href={`/learn/${chapter.slug}?part=${preview.order}`} className="btn bg-white/20 text-white backdrop-blur">
                    <Play className="size-5" /> Free preview
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-[1500px] gap-10 px-4 md:px-8 lg:grid-cols-[1fr_380px]">
        {/* Episodes */}
        <section>
          <h2 className="font-display text-2xl font-extrabold">Parts</h2>
          <p className="text-sm text-muted">{settings.features.sequentialUnlock ? "Finish a part's video and practice set to unlock the next one." : "Watch in any order."}</p>
          <ol className="mt-5 space-y-3">
            {chapter.parts.map((p) => {
              const st = states.get(p.id)!;
              const pr = progMap.get(p.id);
              const pct = p.durationSec ? Math.min(1, (pr?.watchedSec ?? 0) / p.durationSec) : 0;
              const body = (
                <div className={`card group flex gap-4 p-3 transition sm:p-4 ${st === "locked" ? "opacity-60" : "hover:border-brand/60"}`}>
                  <div className="relative grid aspect-video w-28 shrink-0 place-items-center overflow-hidden rounded-xl sm:w-44" style={{ background: `linear-gradient(135deg, ${chapter.coverFrom}, ${chapter.coverTo})` }}>
                    <span className="font-display text-3xl font-extrabold text-white/90 sm:text-5xl">{p.order}</span>
                    <span className="absolute inset-0 grid place-items-center bg-black/30 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                      {st === "locked" ? <Lock className="size-6 text-white" /> : st === "done" ? <CheckCircle2 className="size-8 text-white" /> : <Play className="size-8 fill-white text-white" />}
                    </span>
                    {pct > 0 && <span className="absolute inset-x-0 bottom-0 h-1 bg-black/30"><span className="block h-full bg-brand" style={{ width: `${pct * 100}%` }} /></span>}
                  </div>
                  <div className="min-w-0 flex-1 py-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold leading-tight">{p.title}</h3>
                      {p.isFreePreview && !owned && <span className="rounded-md bg-ok/15 px-1.5 py-0.5 text-[11px] font-bold text-ok">FREE</span>}
                      {st === "done" && <span className="rounded-md bg-ok/15 px-1.5 py-0.5 text-[11px] font-bold text-ok">DONE</span>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{p.summary}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted">
                      {p.durationSec > 0 && <span className="flex items-center gap-1"><Clock className="size-3.5" />{duration(p.durationSec)}</span>}
                      {p._count.questions > 0 && <span className="flex items-center gap-1"><ListChecks className="size-3.5" />{p._count.questions} questions</span>}
                      <span className="text-xp">+{p.xpReward} XP</span>
                    </div>
                  </div>
                </div>
              );
              return <li key={p.id}>{st === "locked" ? body : <Link href={`/learn/${chapter.slug}?part=${p.order}`}>{body}</Link>}</li>;
            })}
          </ol>

          {chapter.description && (
            <div className="mt-10">
              <h2 className="font-display text-2xl font-extrabold">About this chapter</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-muted">{chapter.description}</p>
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-4 lg:pt-12">
          <div className="card p-5">
            <h3 className="font-bold">What&apos;s inside</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <Inc icon={Play} label="Video lectures" value={`${chapter.parts.length} parts${totalSec ? ` · ${duration(totalSec)}` : ""}`} />
              <Inc icon={Target} label="Daily Practice Problems" value={`${dpp} questions`} />
              <Inc icon={FileText} label="Past-year questions" value={`${pyq} PYQs`} />
              <Inc icon={BarChart3} label="JEE weightage" value={`${chapter.jeeWeightage}%`} />
              <Inc icon={Brain} label="Formula sheet & mind map" value={chapter.resources.length ? `${chapter.resources.length} files` : "Coming soon"} />
              {chapter.testMapping.length > 0 && <Inc icon={MapIcon} label="Tested in" value={chapter.testMapping.join(", ")} />}
            </ul>
          </div>
          {chapter.topTopics.length > 0 && (
            <div className="card p-5">
              <h3 className="flex items-center gap-2 font-bold"><Sparkles className="size-4 text-gold" /> Most asked in JEE</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {chapter.topTopics.map((t) => <span key={t} className="rounded-full bg-surface-2 px-3 py-1 text-sm font-medium">{t}</span>)}
              </div>
            </div>
          )}
          {chapter.resources.length > 0 && (
            <div className="card p-5">
              <h3 className="font-bold">Notes & mind maps</h3>
              <ul className="mt-3 space-y-2">
                {chapter.resources.map((r) => {
                  const open = owned || !r.requiresPurchase;
                  return (
                    <li key={r.id}>
                      {open ? (
                        <a href={r.fileUrl} target="_blank" className="flex items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm font-semibold hover:text-brand">
                          <FileText className="size-4 shrink-0" /> {r.title}
                        </a>
                      ) : (
                        <span className="flex items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm font-semibold text-muted"><Lock className="size-4 shrink-0" /> {r.title}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {!owned && bundles.map((b) => (
            <Link key={b.id} href={`/courses/${b.slug}`} className="block rounded-3xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${b.coverFrom}, ${b.coverTo})` }}>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Better value</p>
              <p className="mt-1 font-display text-lg font-extrabold">Included in {b.title}</p>
              <p className="text-sm opacity-90">{inr(b.price)} for every chapter →</p>
            </Link>
          ))}
        </aside>
      </div>

      {related.length > 0 && (
        <Row title={`More Class ${chapter.classLevel} chapters`}>
          {related.map((c) => <ChapterPoster key={c.id} c={c} />)}
        </Row>
      )}
    </div>
  );
}

function Inc({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><Icon className="size-4" /></span>
      <span className="flex-1"><span className="block font-semibold">{label}</span><span className="text-muted">{value}</span></span>
    </li>
  );
}
