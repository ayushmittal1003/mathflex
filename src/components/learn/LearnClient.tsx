"use client";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Lock, Play } from "lucide-react";
import { SiteLogo } from "@/components/site/web/SiteLogo";
import { cx } from "@/components/site/web/ui";
import type { Playback } from "@/lib/video";
import { reportWatch, finishPractice, markIntroSeen } from "@/app/actions/learn";
import { useCelebrate } from "@/components/site/Celebrate";
import { VideoPlayer } from "./VideoPlayer";
import { Quiz, type QuizQuestion } from "./Quiz";

type PartItem = { id: string; order: number; title: string; durationMin: number; state: "locked" | "open" | "done"; watchedPct: number };

export function LearnClient(props: {
  chapter: { id: string; slug: string; title: string; coverFrom: string; coverTo: string };
  part: { id: string; order: number; title: string; summary: string; topics: string[] };
  playback: Playback;
  intro: Playback | null;
  initialWatched: number;
  videoDone: boolean;
  practiceDone: boolean;
  parts: PartItem[];
  questions: QuizQuestion[];
  resources: { id: string; title: string; type: string; url: string }[];
  isPreviewOnly: boolean;
  // Seconds of free video before the paywall; only set for a free preview.
  previewSec?: number;
  sound: boolean;
  related: { slug: string; title: string }[];
  user: { name: string; avatarColor: string; streak: number; xp: number } | null;
  leaderboard: boolean;
}) {
  const router = useRouter();
  const celebrate = useCelebrate();
  const [videoDone, setVideoDone] = useState(props.videoDone);
  const [tab, setTab] = useState<"practice" | "notes" | "about">(props.videoDone ? "practice" : "about");
  const [showIntro, setShowIntro] = useState(!!props.intro);
  const busy = useRef(false);
  const { chapter, part } = props;

  const nextLink = (order: number | null) => (order ? `/learn/${chapter.slug}?part=${order}` : `/chapter/${chapter.slug}`);

  const onProgress = useCallback(
    async (watched: number, duration: number) => {
      if (props.isPreviewOnly || busy.current || videoDone) return;
      busy.current = true;
      try {
        const out = await reportWatch(part.id, watched, duration);
        if (out?.reward) {
          setVideoDone(true);
          setTab("practice");
          celebrate(
            out.chapterCompleted
              ? { title: "Chapter Completed!", subtitle: chapter.title, emoji: "🏆", xp: out.reward.xp, badges: out.reward.badges, cta: props.related[0] ? { label: `Up next: ${props.related[0].title}`, href: `/chapter/${props.related[0].slug}` } : undefined }
              : out.partCompleted
                ? { title: `Part ${out.nextPartOrder} unlocked!`, subtitle: "You finished this part. On to the next one.", emoji: "🔓", xp: out.reward.xp, badges: out.reward.badges, cta: { label: `Start Part ${out.nextPartOrder}`, href: nextLink(out.nextPartOrder) } }
                : { title: `Part ${part.order} watched!`, subtitle: "Practice set unlocked. Solve it to unlock the next part.", emoji: "🎬", xp: out.reward.xp, badges: out.reward.badges },
          );
          router.refresh();
        }
      } finally {
        busy.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [part.id, videoDone, props.isPreviewOnly],
  );

  async function onAllAnswered() {
    const out = await finishPractice(part.id);
    if (!out) return;
    const pct = out.total ? Math.round((out.score / out.total) * 100) : 0;
    celebrate(
      out.chapterCompleted
        ? { title: "Chapter Completed!", subtitle: `${chapter.title} is done. You scored ${pct}% on the last set.`, emoji: "🏆", xp: out.reward?.xp, badges: out.reward?.badges, cta: props.related[0] ? { label: `Up next: ${props.related[0].title}`, href: `/chapter/${props.related[0].slug}` } : undefined }
        : out.partCompleted && out.nextPartOrder
          ? { title: `Part ${out.nextPartOrder} unlocked!`, subtitle: `You scored ${out.score}/${out.total} (${pct}%).`, emoji: "🔓", xp: out.reward?.xp, badges: out.reward?.badges, cta: { label: `Start Part ${out.nextPartOrder}`, href: nextLink(out.nextPartOrder) } }
          : { title: pct >= 80 ? "Crushed it!" : "Practice set done", subtitle: `You scored ${out.score}/${out.total} (${pct}%).${!videoDone ? " Finish the video to complete this part." : ""}`, emoji: pct >= 80 ? "🎯" : "✅", xp: out.reward?.xp, badges: out.reward?.badges },
    );
    router.refresh();
  }

  // ---- Presentation (dipankar-design/designs/Chapter Player.dc.html) ------------------
  const doneCount = props.parts.filter((p) => p.state === "done").length;
  const tabs = [
    ["about", "About this part"],
    ["practice", `Practice${props.questions.length ? ` · ${props.questions.length}` : ""}`],
    ["notes", "Notes"],
  ] as const;
  const appNav = [
    { href: "/my-learning", label: "My Learning", active: true },
    { href: "/chapters", label: "Browse chapters" },
    ...(props.leaderboard ? [{ href: "/leaderboard", label: "Leaderboard" }] : []),
  ];

  return (
    <div className="min-h-dvh bg-card">
      <header className="sticky top-0 z-40 border-b border-border bg-card/92 pt-[env(safe-area-inset-top)] backdrop-blur-[14px]">
        <div className="mx-auto grid h-17 w-[min(1240px,calc(100%-32px))] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <Link href="/" className="justify-self-start" aria-label="Mathflex home"><SiteLogo className="h-[25px]" /></Link>
          <nav className="hidden gap-0.5 rounded-lg bg-foreground p-1 tablet:flex" aria-label="Learner">
            {appNav.map((l) => (
              <Link key={l.href} href={l.href} className={cx("whitespace-nowrap rounded-md px-3.5 py-[7px] text-[13px]", l.active ? "bg-card font-bold text-foreground" : "font-semibold text-white/75 hover:text-white")}>{l.label}</Link>
            ))}
          </nav>
          <div className="col-start-3 flex items-center gap-2 justify-self-end">
            {props.user ? (
              <>
                <span className="hidden items-center gap-1.5 rounded-lg bg-muted px-2.5 py-[7px] text-[13px] font-extrabold sm:inline-flex" title="Day streak">
                  <svg className="size-3.5 text-brand-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.5 1.2-4 2.5-5.2C10 10 11 11 12 11c-1-3 0-6 0-9z" /></svg>
                  {props.user.streak}
                </span>
                <span className="hidden whitespace-nowrap rounded-lg bg-muted px-2.5 py-[7px] text-[13px] font-extrabold text-xp sm:inline-flex">{props.user.xp.toLocaleString("en-IN")} XP</span>
                <Link href="/profile" aria-label="Your profile" className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white" style={{ background: props.user.avatarColor }}>{props.user.name.trim()[0]?.toUpperCase()}</Link>
              </>
            ) : (
              <Link href={`/login?next=${encodeURIComponent(`/learn/${chapter.slug}?part=${part.order}`)}`} className="rounded-lg border border-border px-4 py-2.5 text-sm font-bold">Log in</Link>
            )}
          </div>
        </div>
        <nav className="no-scrollbar mx-4 mb-2.5 flex gap-0.5 overflow-x-auto rounded-lg bg-foreground p-1 tablet:hidden" aria-label="Learner">
          {appNav.map((l) => (
            <Link key={l.href} href={l.href} className={cx("flex-1 whitespace-nowrap rounded-md px-2.5 py-[7px] text-center text-[13px]", l.active ? "bg-card font-bold text-foreground" : "font-semibold text-white/75")}>{l.label}</Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-[min(1240px,calc(100%-32px))] pb-20 pt-5">
        <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
          <Link href="/my-learning" className="hover:text-foreground">My Learning</Link>
          <span>/</span>
          <Link href={`/chapter/${chapter.slug}`} className="text-foreground hover:text-primary">{chapter.title}</Link>
        </div>

        <div className="mt-4 flex flex-wrap items-start gap-6">
          <div className="min-w-0 flex-[1_1_640px]">
            <div className="overflow-hidden rounded-xl shadow-[0_30px_60px_-34px_rgb(80_20_0/0.55)]">
              <VideoPlayer playback={props.playback} initialWatched={props.initialWatched} onProgress={onProgress} limitSec={props.isPreviewOnly ? props.previewSec : undefined} upgradeHref={`/chapter/${chapter.slug}`} />
            </div>
            <div className="mt-4.5 flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-primary">Part {part.order} of {props.parts.length}</div>
                <h1 className="mt-1 text-[clamp(24px,3vw,32px)] font-extrabold leading-[1.15] tracking-[-0.03em]">{part.title}</h1>
              </div>
              {(videoDone || props.practiceDone) && (
                <span className="flex h-11 shrink-0 items-center gap-2 rounded-lg border border-ok/40 bg-ok/12 px-4 text-sm font-bold text-[oklch(0.5_0.16_149)]">
                  <CheckCircle2 className="size-4" /> {videoDone && props.practiceDone ? "Part complete" : videoDone ? "Video watched" : "Practice done"}
                </span>
              )}
            </div>
            {props.isPreviewOnly && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-selected p-4">
                <p className="text-sm font-semibold">You&apos;re watching a free preview. Buy the chapter to save progress and unlock practice.</p>
                <Link href={`/chapter/${chapter.slug}`} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-108">Unlock chapter</Link>
              </div>
            )}

            <div className="no-scrollbar mt-6 flex gap-1 overflow-x-auto border-b border-border" role="tablist">
              {tabs.map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx("-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-3 text-sm font-bold", tab === k ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                  {label}
                  {k === "practice" && props.practiceDone && <CheckCircle2 className="size-4 text-ok" />}
                </button>
              ))}
            </div>
            <div className="animate-mf-rise py-5" key={tab}>
              {tab === "practice" && (
                <Quiz questions={props.questions} locked={!videoDone || props.isPreviewOnly} sound={props.sound} onAllAnswered={onAllAnswered} />
              )}
              {tab === "notes" && (
                props.resources.length ? (
                  <div className="grid gap-2.5">
                    {props.resources.map((r) => (
                      <a key={r.id} href={r.url} target="_blank" className="flex items-center gap-3.5 rounded-xl border border-border px-4 py-3.5 text-foreground hover:bg-muted/50">
                        <span className={cx("grid h-12 w-10 shrink-0 place-items-center rounded-md text-[10px] font-extrabold text-white", r.type === "MINDMAP" ? "bg-brand-2" : r.type === "FORMULA_SHEET" ? "bg-xp" : "bg-primary")}>{r.type === "MINDMAP" ? "MAP" : "PDF"}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-bold">{r.title}</span>
                          <span className="block text-xs capitalize text-muted-foreground">{r.type.replace("_", " ").toLowerCase()}</span>
                        </span>
                        <span className="shrink-0 text-[13px] font-bold text-primary">Open</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">{props.isPreviewOnly ? "Notes open once you own the chapter." : "Short notes for this chapter are coming soon."}</p>
                )
              )}
              {tab === "about" && (
                <div className="grid gap-3.5">
                  {part.summary && <p className="text-base leading-[1.65] text-secondary-foreground">{part.summary}</p>}
                  {part.topics.length > 0 && (
                    <div className="grid gap-2.5">
                      {part.topics.map((t) => (
                        <div key={t} className="flex gap-2.5 text-[15px] leading-[1.5]">
                          <svg className="mt-[3px] size-4 shrink-0 text-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
                          <span>{t}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!part.summary && !part.topics.length && <p className="text-muted-foreground">Watch the part, then open Practice to lock it in.</p>}
                </div>
              )}
            </div>
          </div>

          <aside className="grid w-full min-w-0 flex-[1_1_320px] gap-4 min-[1000px]:sticky min-[1000px]:top-[92px] min-[1000px]:max-w-[380px]">
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-baseline justify-between border-b border-border px-4.5 py-4">
                <span className="text-[15px] font-extrabold">Parts</span>
                <span className="text-xs font-bold text-muted-foreground">{doneCount} of {props.parts.length} done</span>
              </div>
              <div className="h-1 bg-muted"><div className="h-full bg-primary" style={{ width: `${(doneCount / Math.max(1, props.parts.length)) * 100}%` }} /></div>
              <ol>
                {props.parts.map((p) => {
                  const active = p.id === part.id;
                  const content = (
                    <div className={cx("flex items-center gap-3 border-b border-border px-4.5 py-3.5 last:border-b-0", active ? "bg-selected" : p.state === "locked" ? "opacity-55" : "hover:bg-muted/60")}>
                      <span className={cx("grid size-7.5 shrink-0 place-items-center rounded-full text-xs font-extrabold", p.state === "done" ? "bg-ok text-white" : active ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                        {p.state === "done" ? <CheckCircle2 className="size-4" /> : p.state === "locked" ? <Lock className="size-3.5" /> : active ? <Play className="size-3 fill-current" /> : p.order}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">Part {p.order} · {p.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {p.durationMin ? `${p.durationMin} min` : ""}
                          {p.state === "locked" ? `${p.durationMin ? " · " : ""}finish the previous part` : p.watchedPct > 0 && p.state !== "done" ? `${p.durationMin ? " · " : ""}${Math.min(99, Math.round(p.watchedPct * 100))}% watched` : ""}
                        </span>
                      </span>
                    </div>
                  );
                  return <li key={p.id}>{p.state === "locked" ? content : <Link href={nextLink(p.order)} className="block text-foreground">{content}</Link>}</li>;
                })}
              </ol>
            </div>
            <div className="rounded-xl border border-border px-4.5 py-4">
              <div className="text-[15px] font-extrabold">Chapter resources</div>
              <div className="mt-3 grid gap-2">
                <button type="button" onClick={() => setTab("notes")} className="flex items-center justify-between gap-2.5 rounded-lg bg-muted px-3 py-2.5 text-left text-sm font-bold">Notes<span className="text-xs font-semibold text-muted-foreground">{props.resources.length || "—"}</span></button>
                <button type="button" onClick={() => setTab("practice")} className="flex items-center justify-between gap-2.5 rounded-lg bg-muted px-3 py-2.5 text-left text-sm font-bold">Practice questions<span className="text-xs font-semibold text-muted-foreground">{props.questions.length || "—"}</span></button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {showIntro && props.intro && props.intro.kind !== "none" && (
        <div className="fixed inset-0 z-[75] grid place-items-center bg-black/80 p-4 backdrop-blur">
          <div className="animate-pop w-full max-w-2xl">
            <p className="mb-3 text-center text-xl font-extrabold tracking-[-0.02em] text-white">A quick hello before you start 👋</p>
            <VideoPlayer playback={props.intro} initialWatched={0} onProgress={() => {}} />
            <button
              onClick={() => { setShowIntro(false); markIntroSeen(chapter.id); try { localStorage.setItem(`mf-intro-${chapter.id}`, "1"); } catch {} }}
              className="mx-auto mt-4 flex rounded-lg bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground shadow-cta hover:brightness-108"
            >
              Let&apos;s start learning
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
