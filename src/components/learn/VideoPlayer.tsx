"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Playback } from "@/lib/video";

type Props = {
  playback: Playback;
  initialWatched: number;
  onProgress: (watchedSec: number, durationSec: number, final: boolean) => void;
  // Free preview: stop at this many seconds and offer the purchase instead.
  limitSec?: number;
  upgradeHref?: string;
};

type PlayerJs = { on: (ev: string, cb: (d?: { seconds: number; duration: number }) => void) => void; pause?: () => void };
declare global {
  interface Window { playerjs?: { Player: new (el: HTMLIFrameElement) => PlayerJs } }
}

// Counts seconds actually watched (not the scrub position), so skipping to the end
// doesn't unlock the practice set. Reports to the server periodically.
export function VideoPlayer({ playback, initialWatched, onProgress, limitSec, upgradeHref }: Props) {
  const watched = useRef(initialWatched);
  const lastPos = useRef<number | null>(null);
  const duration = useRef(0);
  const lastReport = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<PlayerJs | null>(null);
  const [locked, setLocked] = useState(false);

  // Past the free preview: pause and cover the player. The overlay blocks the controls,
  // so seeking further is not possible from the page.
  const enforceLimit = useCallback(
    (pos: number) => {
      if (!limitSec || pos < limitSec) return;
      setLocked(true);
      playerRef.current?.pause?.();
      videoRef.current?.pause();
    },
    [limitSec],
  );

  const report = useCallback(
    (final = false) => {
      if (!duration.current) return;
      lastReport.current = Date.now();
      onProgress(watched.current, duration.current, final);
    },
    [onProgress],
  );

  const tick = useCallback(
    (pos: number, dur: number) => {
      if (dur) duration.current = dur;
      const prev = lastPos.current;
      // Only count small forward steps — i.e. normal playback, not seeks.
      if (prev !== null && pos > prev && pos - prev < 2.5) watched.current += pos - prev;
      lastPos.current = pos;
      if (Date.now() - lastReport.current > 20_000) report();
    },
    [report],
  );

  // Bunny Stream exposes the player.js protocol for its iframe.
  useEffect(() => {
    if (playback.kind !== "iframe" || playback.provider !== "BUNNY") return;
    let cancelled = false;
    const attach = () => {
      if (cancelled || !iframeRef.current || !window.playerjs) return;
      const p = new window.playerjs.Player(iframeRef.current);
      playerRef.current = p;
      p.on("ready", () => {
        p.on("timeupdate", (d) => {
          if (!d) return;
          enforceLimit(d.seconds);
          tick(d.seconds, d.duration);
        });
        p.on("pause", () => report());
        p.on("ended", () => report(true));
      });
    };
    if (window.playerjs) attach();
    else {
      const s = document.createElement("script");
      s.src = "https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js";
      s.onload = attach;
      document.head.appendChild(s);
    }
    return () => { cancelled = true; };
  }, [playback, tick, report, enforceLimit]);

  // YouTube embeds don't expose time without the heavy IFrame API: count visible,
  // focused time instead (the server still requires the part's full duration).
  useEffect(() => {
    if (playback.kind !== "iframe" || playback.provider !== "YOUTUBE") return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible" && document.activeElement === iframeRef.current) {
        watched.current += 1;
        if (Date.now() - lastReport.current > 20_000) onProgress(watched.current, 0, false);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [playback, onProgress]);

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && report();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      report();
    };
  }, [report]);

  if (playback.kind === "none") {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-none bg-black text-center text-white/70 sm:rounded-2xl">
        <p>Video coming soon</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black sm:rounded-2xl" onContextMenu={(e) => e.preventDefault()}>
      {playback.kind === "file" ? (
        <video
          ref={videoRef}
          key={playback.src}
          src={playback.src}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture={false}
          className="size-full"
          onLoadedMetadata={(e) => (duration.current = e.currentTarget.duration)}
          onTimeUpdate={(e) => { enforceLimit(e.currentTarget.currentTime); tick(e.currentTarget.currentTime, e.currentTarget.duration); }}
          onSeeked={(e) => (lastPos.current = e.currentTarget.currentTime)}
          onPause={() => report()}
          onEnded={() => report(true)}
        />
      ) : (
        <iframe
          ref={iframeRef}
          src={playback.src}
          className="absolute inset-0 size-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
        />
      )}
      {locked && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/85 p-6 text-center text-white">
          <div className="max-w-sm">
            <p className="text-sm font-semibold text-white/70">That was your free preview</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">Subscribe to watch the complete video</p>
            <p className="mt-2 text-sm text-white/70">Unlock the chapter to continue this part, save your progress and open the practice set.</p>
            {upgradeHref && <Link href={upgradeHref} className="mt-5 inline-flex h-11 items-center rounded-lg bg-primary px-6 text-sm font-bold text-primary-foreground hover:brightness-110">Unlock chapter</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
