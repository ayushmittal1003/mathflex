import Link from "next/link";
import { notFound } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { computePartStates, hasChapterAccess } from "@/lib/access";
import { getCatalog } from "@/lib/catalog";
import { duration, inr, pctOff } from "@/lib/format";
import { chapterFaqs, instructor, instructorChapterLine, instructorNames } from "@/lib/site-content";
import { getPublicCoupon } from "@/components/site/web/data";
import { WashHero } from "@/components/site/web/WashHero";
import { CheckIcon, LockIcon, PlayIcon, posterBg } from "@/components/site/web/primitives";
import { AddToCartButton, BuyNow } from "@/components/site/web/CartButtons";
import { HoverPreview } from "@/components/site/web/HoverPreview";
import { playbackFor } from "@/lib/video";
import { FaqList } from "@/components/site/web/FaqList";
import { VideoFrame } from "@/components/site/web/VideoFrame";
import { ChapterCard } from "@/components/site/web/ChapterCard";
import { button, cx, tone } from "@/components/site/web/ui";
import { clock } from "@/components/site/web/home/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await db.chapter.findUnique({ where: { slug }, select: { title: true, tagline: true } });
  return c ? { title: c.title, description: c.tagline } : {};
}

// Chapter detail (dipankar-design/designs/Chapter Detail.dc.html). Same data and access
// rules as before: part states from computePartStates, notes gated by requiresPurchase,
// unpublished chapters visible to staff only, free preview through the existing player.
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
        courses: { include: { course: { include: { _count: { select: { chapters: true } } } } } },
      },
    }),
    getSettings(),
  ]);
  if (!chapter || (!chapter.isPublished && !isStaff(user?.role))) notFound();

  const owned = await hasChapterAccess(user?.id, chapter.id);
  const progress = user ? await db.partProgress.findMany({ where: { userId: user.id, partId: { in: chapter.parts.map((p) => p.id) } } }) : [];
  const progMap = new Map(progress.map((p) => [p.partId, p]));
  const freeOn = settings.features.freePreviews;
  const states = computePartStates(chapter.parts, progMap, {
    hasAccess: owned,
    sequential: settings.features.sequentialUnlock,
    freePreviewIds: new Set(freeOn ? chapter.parts.filter((p) => p.isFreePreview).map((p) => p.id) : []),
  });
  const [catalog, coupon] = await Promise.all([getCatalog(user?.id), getPublicCoupon(settings)]);

  const totalSec = chapter.parts.reduce((s, p) => s + p.durationSec, 0);
  const dpp = chapter.questions.filter((q) => q.type === "DPP").length;
  const pyq = chapter.questions.filter((q) => q.type === "PYQ").length;
  const doneCount = chapter.parts.filter((p) => states.get(p.id) === "done").length;
  const resumePart = chapter.parts.find((p) => states.get(p.id) === "open") ?? chapter.parts[0];
  const preview = freeOn ? chapter.parts.find((p) => p.isFreePreview) : undefined;
  const off = pctOff(chapter.price, chapter.mrp);
  const bundles = chapter.courses.map((c) => c.course).filter((c) => c.isPublished);
  const names = instructorNames(settings);
  const item = { type: "CHAPTER" as const, id: chapter.id };
  const freeIds = new Set(freeOn ? (await db.part.findMany({ where: { isFreePreview: true }, select: { chapterId: true } })).map((p) => p.chapterId) : []);
  const related = catalog.filter((c) => c.classLevel === chapter.classLevel && c.id !== chapter.id).slice(0, 4).map((c) => ({ ...c, free: freeIds.has(c.id) }));

  const stats = [
    { big: `${chapter.parts.length} parts`, small: totalSec ? `${duration(totalSec)} of video` : "Video lessons" },
    ...(chapter.jeeWeightage > 0 ? [{ big: `${chapter.jeeWeightage}%`, small: "of JEE Main" }] : []),
    ...(dpp + pyq > 0 ? [{ big: `${dpp + pyq} questions`, small: "DPPs + PYQs" }] : []),
    ...(preview ? [{ big: `Part ${preview.order} free`, small: "No sign-up needed" }] : []),
    { big: `${chapter.validityDays} days`, small: "of access" },
  ];
  const includes = [
    { n: chapter.parts.length, label: "Video parts", sub: totalSec ? `${duration(totalSec)} in total` : "Short, focused parts" },
    { n: dpp, label: "DPPs", sub: "Daily practice problems" },
    { n: pyq, label: "PYQs", sub: "Previous-year JEE questions" },
    { n: chapter.resources.length, label: "Notes", sub: chapter.resources.length ? "Files for this chapter" : "Coming soon" },
  ];
  const learn = [...new Set([...chapter.parts.flatMap((p) => p.topics), ...chapter.parts.map((p) => p.title)])].slice(0, 6);
  const faqs = chapterFaqs({ classLevel: chapter.classLevel, free: !!preview, validityDays: chapter.validityDays, sequential: settings.features.sequentialUnlock });
  const tabs = [
    ...(learn.length ? [["About", "#learn"]] : []),
    ["Parts", "#parts"],
    ["What's included", "#included"],
    ["Instructor", "#instructor"],
    ["FAQs", "#faq"],
  ];
  const sectionH2 = "mt-14 scroll-mt-[150px] border-b-2 border-foreground pb-3.5 text-[clamp(26px,2.8vw,34px)] font-extrabold tracking-[-0.035em]";
  const playHref = !chapter.parts.length ? null : owned ? `/learn/${chapter.slug}?part=${resumePart?.order ?? 1}` : preview ? `/learn/${chapter.slug}?part=${preview.order}` : null;
  const heroPart = owned ? resumePart : preview ?? chapter.parts[0];

  return (
    <>
      <WashHero className="!pb-[104px]">
        <div className="mx-auto mt-5 flex w-[min(1180px,calc(100%-48px))] flex-wrap items-center gap-8">
          {/* Info */}
          <div className="order-2 min-w-0 flex-[1_1_320px]">
            <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-secondary-foreground">
              <Link href="/chapters" className="hover:text-primary">Chapters</Link>
              <span className="opacity-50">/</span>
              <Link href={`/chapters?class=${chapter.classLevel}`} className="hover:text-primary">Class {chapter.classLevel}</Link>
              {!chapter.isPublished && <span className="ml-2 rounded bg-gold/20 px-1.5 py-0.5 text-[11px] font-bold text-foreground">Unpublished · staff preview</span>}
            </div>
            <h1 className="mt-4.5 text-[clamp(42px,5.4vw,72px)] font-extrabold leading-none tracking-[-0.045em] text-balance">{chapter.title}</h1>
            <div className="mt-5.5 flex flex-wrap gap-2">
              <Pill>Class {chapter.classLevel}</Pill>
              <Pill>{chapter.parts.length} parts{totalSec > 0 && ` · ${duration(totalSec)}`}</Pill>
              {chapter.jeeWeightage > 0 && <span className="whitespace-nowrap rounded-full border border-card bg-card px-2.5 py-1.5 text-[13px] font-bold text-[oklch(0.5_0.17_47)]">{chapter.jeeWeightage}% of JEE Main</span>}
            </div>
            {chapter.tagline && <p className="mt-4.5 max-w-[520px] text-[17px] leading-[1.55] text-secondary-foreground text-pretty">{chapter.tagline}</p>}
            <a href="#instructor" className="mt-4.5 inline-flex items-center gap-2.5 text-foreground">
              <span className="grid size-[34px] place-items-center rounded-full border-2 border-white bg-gradient-to-br from-primary to-brand-2 text-sm font-extrabold text-white">{names.full[0]}</span>
              <span className="text-sm leading-[1.3]">
                Taught by <b className="underline underline-offset-[3px]">{names.full}</b>
                <br />
                <span className="text-[13px] text-secondary-foreground">{instructor.title}</span>
              </span>
            </a>

            {owned ? (
              <div className="mt-7 max-w-md">
                <div className="mb-2 flex justify-between text-sm font-semibold"><span>Your progress</span><span>{doneCount}/{chapter.parts.length} parts</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-primary" style={{ width: `${(doneCount / Math.max(1, chapter.parts.length)) * 100}%` }} /></div>
                <div className="mt-5.5 flex flex-wrap gap-2.5">
                  {playHref ? (
                    <Link href={playHref} className={cx(button.lg, tone.primary)}>
                      <PlayIcon /> {doneCount ? `Continue · Part ${resumePart?.order}` : "Start Part 1"}
                    </Link>
                  ) : (
                    <span className="rounded-lg bg-white/70 px-4 py-3 text-sm font-semibold">Parts are being added. You&apos;ll get them as soon as they&apos;re live.</span>
                  )}
                  {settings.features.practice && chapter.questions.length > 0 && (
                    <Link href={`/practice/${chapter.slug}`} className={cx(button.lg, tone.glass)}>Practice {chapter.questions.length} Qs</Link>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="mt-7">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[40px] font-extrabold tracking-[-0.035em]">{inr(chapter.price)}</span>
                    {chapter.mrp > chapter.price && <span className="text-base text-muted-foreground line-through">{inr(chapter.mrp)}</span>}
                    {off > 0 && <span className="rounded-md bg-ok px-2 py-0.5 text-xs font-extrabold text-white">{off}% OFF</span>}
                  </div>
                  <div className="mt-0.5 text-[13px] text-secondary-foreground">{chapter.validityDays} days access · all parts, DPPs, PYQs &amp; notes</div>
                </div>
                <div className="mt-5.5 flex flex-wrap gap-2.5">
                  <BuyNow item={item} />
                  <AddToCartButton item={item} title={chapter.title} />
                </div>
              </>
            )}
          </div>

          {/* Player poster: opens the existing player (free preview, or resume when owned). */}
          <div className="order-1 min-w-0 flex-[1.15_1_360px] overflow-hidden rounded-xl border-[6px] border-foreground bg-foreground shadow-[0_40px_80px_-30px_rgb(80_20_0/0.5)]">
            <HoverPreview
              playback={!owned && preview ? playbackFor(preview.videoProvider, preview.videoRef) : { kind: "none" }}
              limitSec={preview?.previewSec ?? 180}
              upgradeHref="#pricing"
            >
            <div className="relative aspect-[16/10] overflow-hidden text-white" style={posterBg(chapter.coverFrom, chapter.coverTo)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {heroPart?.thumbnailUrl && <img src={heroPart.thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" />}
              {!heroPart?.thumbnailUrl && <div className={cx("absolute -right-5 top-1/2 -translate-y-1/2 whitespace-nowrap font-black leading-none tracking-[-0.05em] text-white/16", chapter.symbol.length > 2 ? "text-[160px] tablet:text-[200px]" : "text-[240px] tablet:text-[320px]")}>{chapter.symbol}</div>}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.55),rgb(0_0_0/0.05)_70%),linear-gradient(transparent_50%,rgb(0_0_0/0.65))]" />
              <span className="absolute left-4.5 top-4 rounded-md bg-white px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-black">
                {owned ? "Your chapter" : preview ? `Part ${preview.order} · Free preview` : "Preview"}
              </span>
              {playHref ? (
                <Link href={playHref} aria-label={owned ? "Continue watching" : "Play free preview"} className="absolute left-1/2 top-[45%] grid size-[84px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-primary shadow-[0_0_0_14px_rgb(255_255_255/0.16)] transition hover:scale-[1.06]">
                  <PlayIcon className="size-7" />
                </Link>
              ) : (
                <span className="absolute left-1/2 top-[45%] grid size-[84px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white" aria-hidden><LockIcon className="size-7" /></span>
              )}
              {heroPart && (
                <div className="absolute inset-x-4.5 bottom-4">
                  <div className="text-xs font-semibold opacity-85">Part {heroPart.order}{heroPart.durationSec > 0 && ` · ${clock(heroPart.durationSec)}`}</div>
                  <div className="mt-0.5 text-[clamp(20px,2.2vw,26px)] font-extrabold tracking-[-0.02em]">{heroPart.title}</div>
                </div>
              )}
            </div>
            </HoverPreview>
          </div>
        </div>
      </WashHero>

      {/* Stats strip overlapping the hero. */}
      <div className="relative z-[3] mx-auto -mt-16 grid w-[min(1180px,calc(100%-48px))] grid-cols-[repeat(auto-fit,minmax(150px,1fr))] overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_48px_-28px_rgb(80_20_0/0.45)]">
        {stats.map((s, i) => (
          <div key={s.small} className={cx("px-5.5 py-5", i > 0 && "border-l border-border")}>
            <div className="text-xl font-extrabold tracking-[-0.02em]">{s.big}</div>
            <div className="mt-0.5 text-[13px] text-muted-foreground">{s.small}</div>
          </div>
        ))}
      </div>

      {/* Sticky section tabs. */}
      <div className="sticky top-[67px] z-30 mt-8 border-b border-border bg-card/90 backdrop-blur-lg">
        <div className="no-scrollbar mx-auto flex w-[min(1180px,calc(100%-48px))] items-center gap-1 overflow-x-auto">
          {tabs.map(([label, href]) => (
            <a key={href} href={href} className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-3.5 py-4 text-sm font-bold text-secondary-foreground hover:border-foreground hover:text-foreground">{label}</a>
          ))}
          <span className="flex-1" />
          {!owned && (
            <span className="hidden shrink-0 items-center gap-3 pl-3 tablet:flex">
              <span className="text-[15px] font-extrabold">{inr(chapter.price)}</span>
              <BuyNow item={item} size="sm" className="!px-4 !py-2 !text-[13px] !shadow-none" />
            </span>
          )}
        </div>
      </div>

      <section className="pb-22 pt-6">
        <div className="mx-auto flex w-[min(1180px,calc(100%-48px))] flex-wrap items-start gap-x-10 gap-y-12">
          <div className="min-w-0 flex-[1_1_420px]">
            {learn.length > 0 && (
              <>
                <h2 id="learn" className={sectionH2}>What you&apos;ll learn</h2>
                <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-x-7 gap-y-3.5">
                  {learn.map((l) => (
                    <div key={l} className="flex gap-3 text-[15px] leading-[1.45]"><CheckIcon className="mt-[3px] size-4 shrink-0 text-ok" /><span>{l}</span></div>
                  ))}
                </div>
                {chapter.description && <p className="mt-6 whitespace-pre-line text-[15px] leading-[1.6] text-secondary-foreground">{chapter.description}</p>}
              </>
            )}

            <div className="mt-14 flex items-baseline justify-between gap-4 border-b-2 border-foreground pb-3.5">
              <h2 id="parts" className="scroll-mt-[150px] text-[clamp(26px,2.8vw,34px)] font-extrabold tracking-[-0.035em]">Parts</h2>
              <span className="text-[13px] font-semibold text-muted-foreground">{chapter.parts.length} parts{totalSec > 0 && ` · ${duration(totalSec)}`}</span>
            </div>
            {chapter.parts.length === 0 && (
              <p className="mt-5 rounded-xl border border-dashed border-border bg-muted/50 px-5 py-8 text-center text-[15px] text-muted-foreground">The parts for this chapter are being recorded. Check back soon.</p>
            )}
            {chapter.parts.map((p, i) => {
              const st = states.get(p.id)!;
              const isFree = freeOn && p.isFreePreview && !owned;
              const pct = p.durationSec ? Math.min(1, (progMap.get(p.id)?.watchedSec ?? 0) / p.durationSec) : 0;
              const note =
                st === "done" ? "Completed" : owned ? (st === "locked" ? `Unlocks after Part ${chapter.parts[i - 1]?.order} + its practice` : "Ready to watch")
                : isFree ? "Watch free, no sign-up" : i === 0 ? "Unlocks when you buy" : `Unlocks after Part ${chapter.parts[i - 1].order} + its practice`;
              const row = (
                <div className="flex items-center gap-5 border-b border-border py-5">
                  <span className="w-7 shrink-0 text-[26px] font-extrabold tracking-[-0.03em] text-muted-foreground">{p.order}</span>
                  <span className="relative aspect-[16/10] w-24 shrink-0 overflow-hidden rounded-lg text-white tablet:w-[120px]" style={posterBg(chapter.coverFrom, chapter.coverTo)}>
                    <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 whitespace-nowrap text-[56px] font-black leading-none text-white/20">{chapter.symbol}</span>
                    <span className={cx("absolute inset-0 grid place-items-center", st === "locked" ? "bg-black/45" : "bg-black/15")}>
                      <span className={cx("grid size-[34px] place-items-center rounded-full", st === "locked" ? "bg-white/20 text-white" : st === "done" ? "bg-ok text-white" : "bg-white text-primary")}>
                        {st === "locked" ? <LockIcon className="size-[13px]" /> : st === "done" ? <CheckIcon className="size-3.5" strokeWidth={3.5} /> : <PlayIcon className="size-3" />}
                      </span>
                    </span>
                    {pct > 0 && <span className="absolute inset-x-0 bottom-0 h-1 bg-black/30"><span className="block h-full bg-primary" style={{ width: `${pct * 100}%` }} /></span>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                      <span className="text-[17px] font-bold tracking-[-0.015em]">{p.title}</span>
                      {isFree && <span className="rounded bg-ok/14 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.04em] text-[oklch(0.5_0.16_149)]">Free preview</span>}
                    </div>
                    {p.summary && <p className="mt-1 line-clamp-2 text-sm text-secondary-foreground">{p.summary}</p>}
                    <div className="mt-1 text-[13px] text-muted-foreground">
                      {p.durationSec > 0 && `${clock(p.durationSec)} · `}{note}
                      {p._count.questions > 0 && ` · ${p._count.questions} questions`}
                    </div>
                  </div>
                </div>
              );
              return st === "locked" ? <div key={p.id}>{row}</div> : <Link key={p.id} href={`/learn/${chapter.slug}?part=${p.order}`} className="block text-foreground transition hover:bg-muted/50">{row}</Link>;
            })}

            <h2 id="included" className={sectionH2}>What&apos;s included</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
              {includes.map((it) => (
                <div key={it.label} className="border-b border-border py-5.5 pr-4">
                  <div className="text-[30px] font-extrabold tracking-[-0.035em]">{it.n}</div>
                  <div className="mt-0.5 text-sm font-semibold">{it.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{it.sub}</div>
                </div>
              ))}
            </div>
            {chapter.testMapping.length > 0 && <p className="mt-4 text-sm text-secondary-foreground"><b>Tested in:</b> {chapter.testMapping.join(", ")}</p>}
            {chapter.resources.length > 0 && (
              <ul className="mt-5 grid gap-2">
                {chapter.resources.map((r) => {
                  const open = owned || !r.requiresPurchase;
                  return (
                    <li key={r.id}>
                      {open ? (
                        <a href={r.fileUrl} target="_blank" className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-semibold hover:border-primary hover:text-primary">
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">{r.type === "MINDMAP" ? "MAP" : "PDF"}</span> {r.title}
                        </a>
                      ) : (
                        <span className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-semibold text-muted-foreground"><LockIcon className="size-3.5" /> {r.title}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {chapter.topTopics.length > 0 && (
              <>
                <h2 className={sectionH2}>Most-asked in JEE</h2>
                <div className="mt-4.5 flex flex-wrap gap-2">
                  {chapter.topTopics.map((t) => <span key={t} className="rounded-full border border-border bg-muted px-3.5 py-2 text-sm font-semibold">{t}</span>)}
                </div>
              </>
            )}

            <h2 id="instructor" className={sectionH2}>Your instructor</h2>
            <div className="mt-5.5 flex flex-wrap items-center gap-x-6 gap-y-5">
              <VideoFrame videoId={instructor.introVideoId} className="aspect-[16/10] w-[200px] shrink-0 !border-4 [&_span]:!text-[11px]" />
              <div className="min-w-0 flex-[1_1_260px]">
                <div className="text-xl font-extrabold tracking-[-0.02em]">{names.full}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{instructor.title} · {instructor.studentsGuided} JEE aspirants mentored</div>
                <p className="mt-2.5 text-[15px] leading-[1.6] text-secondary-foreground">{names.short} {instructorChapterLine}</p>
                <Link href="/about" className="mt-2.5 inline-flex text-sm font-bold text-primary">More about {names.short} →</Link>
              </div>
            </div>

            <h2 id="faq" className={sectionH2}>Questions about this chapter</h2>
            <FaqList items={faqs} initialOpen={-1} />
          </div>

          {/* Sticky purchase box (drops into the flow below 1000px). */}
          <aside className="mt-14 min-w-0 max-w-full flex-[0_1_320px] min-[1000px]:sticky min-[1000px]:top-[140px]">
            <div className="rounded-xl border border-border bg-card p-5.5 shadow-[0_20px_40px_-28px_rgb(80_20_0/0.4)]">
              <div className="text-sm font-bold">{chapter.title}</div>
              {owned ? (
                <>
                  <p className="mt-2 text-sm text-secondary-foreground">You own this chapter.</p>
                  <Link href={playHref!} className={cx(button.md, tone.primaryFlat, "mt-4 w-full")}>{doneCount ? "Continue learning" : "Start Part 1"}</Link>
                </>
              ) : (
                <>
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className="text-[34px] font-extrabold tracking-[-0.03em]">{inr(chapter.price)}</span>
                    {chapter.mrp > chapter.price && <span className="text-sm text-muted-foreground line-through">{inr(chapter.mrp)}</span>}
                  </div>
                  <div className="mt-4 grid gap-2">
                    <BuyNow item={item} size="md" className="w-full !shadow-none" />
                    <AddToCartButton item={item} title={chapter.title} size="md" className="w-full" />
                  </div>
                  {coupon && (
                    <div className="mt-3.5 text-[13px] leading-[1.5] text-muted-foreground">
                      New here? Use <b className="font-mono text-foreground">{coupon.code}</b> at checkout{coupon.description && ` · ${coupon.description}`}.
                    </div>
                  )}
                </>
              )}
              {!owned && bundles.map((b) => (
                <Link key={b.id} href={`/courses/${b.slug}`} className="mt-4.5 flex items-center justify-between gap-2.5 border-t border-border pt-4 text-foreground hover:text-primary">
                  <span className="text-[13px] leading-[1.4]">
                    <b>{b.title}</b>
                    <br />
                    <span className="text-muted-foreground">All {b._count.chapters} chapters for {inr(b.price)}</span>
                  </span>
                  <span className="text-base">→</span>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

      {related.length > 0 && (
        <section className="pb-24 pt-18">
          <div className="mx-auto w-[min(1180px,calc(100%-48px))]">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-[clamp(28px,3vw,38px)] font-extrabold tracking-[-0.035em]">More from Class {chapter.classLevel}</h2>
              <Link href={`/chapters?class=${chapter.classLevel}`} className="whitespace-nowrap text-sm font-bold text-primary">All chapters →</Link>
            </div>
            <div className="mt-7 grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-5">
              {related.map((c, i) => <ChapterCard key={c.id} c={c} index={i} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap rounded-full border border-white/95 bg-white/75 px-2.5 py-1.5 text-[13px] font-bold">{children}</span>;
}
