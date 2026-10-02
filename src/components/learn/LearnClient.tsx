"use client";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, FileText, Lock, Play, ListChecks, BookOpen } from "lucide-react";
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
  sound: boolean;
  related: { slug: string; title: string }[];
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

  return (
    <div className="mx-auto max-w-[1500px] pb-24 pt-[var(--nav-h)] md:px-8 md:pt-[calc(var(--nav-h)+1.5rem)]">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <VideoPlayer playback={props.playback} initialWatched={props.initialWatched} onProgress={onProgress} />
          <div className="px-4 pt-4 md:px-0">
            <p className="text-sm font-semibold text-muted-foreground">
              <Link href={`/chapter/${chapter.slug}`} className="hover:text-primary">{chapter.title}</Link> · Part {part.order}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">{part.title}</h1>
            {props.isPreviewOnly && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary/10 p-4">
                <p className="text-sm font-semibold">You&apos;re watching a free preview. Buy the chapter to save progress and unlock practice.</p>
                <Link href={`/chapter/${chapter.slug}`} className="btn btn-primary !py-2 text-sm">Unlock chapter</Link>
              </div>
            )}

            <div className="mt-6 flex gap-1 border-b border-border">
              {([
                ["practice", "Practice", ListChecks],
                ["notes", "Notes", FileText],
                ["about", "About", BookOpen],
              ] as const).map(([k, label, Icon]) => (
                <button key={k} onClick={() => setTab(k)} className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${tab === k ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
                  <Icon className="size-4" /> {label}
                  {k === "practice" && props.practiceDone && <CheckCircle2 className="size-4 text-ok" />}
                </button>
              ))}
            </div>
            <div className="py-6">
              {tab === "practice" && (
                <Quiz questions={props.questions} locked={!videoDone || props.isPreviewOnly} sound={props.sound} onAllAnswered={onAllAnswered} />
              )}
              {tab === "notes" && (
                props.resources.length ? (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {props.resources.map((r) => (
                      <li key={r.id}>
                        <a href={r.url} target="_blank" className="card flex items-center gap-3 p-4 font-semibold hover:border-primary">
                          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><FileText className="size-5" /></span>
                          <span><span className="block">{r.title}</span><span className="text-xs font-medium text-muted-foreground">{r.type.replace("_", " ").toLowerCase()}</span></span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Short notes and mind maps for this chapter are coming soon.</p>
                )
              )}
              {tab === "about" && (
                <div>
                  <p className="leading-relaxed text-muted-foreground">{part.summary}</p>
                  {part.topics.length > 0 && (
                    <>
                      <p className="mt-5 font-bold">Topics in this part</p>
                      <div className="mt-2 flex flex-wrap gap-2">{part.topics.map((t) => <span key={t} className="rounded-full bg-surface-2 px-3 py-1 text-sm">{t}</span>)}</div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="px-4 md:px-0">
          <div className="card overflow-hidden lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)]">
            <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, ${chapter.coverFrom}, ${chapter.coverTo})` }}>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Chapter</p>
              <p className="font-display text-lg font-extrabold">{chapter.title}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/30">
                <div className="h-full rounded-full bg-white" style={{ width: `${(props.parts.filter((p) => p.state === "done").length / Math.max(1, props.parts.length)) * 100}%` }} />
              </div>
            </div>
            <ol className="divide-y divide-border">
              {props.parts.map((p) => {
                const active = p.id === part.id;
                const content = (
                  <div className={`flex items-center gap-3 p-4 ${active ? "bg-primary/10" : p.state !== "locked" ? "hover:bg-surface-2" : "opacity-55"}`}>
                    <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${p.state === "done" ? "bg-ok text-white" : active ? "bg-primary text-white" : "bg-surface-2"}`}>
                      {p.state === "done" ? <CheckCircle2 className="size-5" /> : p.state === "locked" ? <Lock className="size-4" /> : active ? <Play className="size-4 fill-current" /> : p.order}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">Part {p.order}: {p.title}</span>
                      <span className="text-xs text-muted-foreground">{p.durationMin ? `${p.durationMin} min` : ""}{p.state === "locked" ? " · finish previous part" : ""}</span>
                    </span>
                  </div>
                );
                return <li key={p.id}>{p.state === "locked" ? content : <Link href={nextLink(p.order)}>{content}</Link>}</li>;
              })}
            </ol>
          </div>
        </aside>
      </div>

      {showIntro && props.intro && props.intro.kind !== "none" && (
        <div className="fixed inset-0 z-[75] grid place-items-center bg-black/80 p-4 backdrop-blur">
          <div className="animate-pop w-full max-w-2xl">
            <p className="mb-3 text-center font-display text-xl font-extrabold text-white">A quick hello before you start 👋</p>
            <VideoPlayer playback={props.intro} initialWatched={0} onProgress={() => {}} />
            <button
              onClick={() => { setShowIntro(false); markIntroSeen(chapter.id); try { localStorage.setItem(`mf-intro-${chapter.id}`, "1"); } catch {} }}
              className="btn btn-primary mx-auto mt-4 flex"
            >
              Let&apos;s start learning
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
