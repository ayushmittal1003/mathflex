"use client";
import { useCallback, useEffect, useRef } from "react";
import type { Playback } from "@/lib/video";

type Props = {
  playback: Playback;
  initialWatched: number;
  onProgress: (watchedSec: number, durationSec: number, final: boolean) => void;
};

type PlayerJs = { on: (ev: string, cb: (d?: { seconds: number; duration: number }) => void) => void };
declare global {
  interface Window { playerjs?: { Player: new (el: HTMLIFrameElement) => PlayerJs } }
}

// Counts seconds actually watched (not the scrub position), so skipping to the end
// doesn't unlock the practice set. Reports to the server periodically.
export function VideoPlayer({ playback, initialWatched, onProgress }: Props) {
  const watched = useRef(initialWatched);
  const lastPos = useRef<number | null>(null);
  const duration = useRef(0);
  const lastReport = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
      p.on("ready", () => {
        p.on("timeupdate", (d) => d && tick(d.seconds, d.duration));
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
  }, [playback, tick, report]);

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
          key={playback.src}
          src={playback.src}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture={false}
          className="size-full"
          onLoadedMetadata={(e) => (duration.current = e.currentTarget.duration)}
          onTimeUpdate={(e) => tick(e.currentTarget.currentTime, e.currentTarget.duration)}
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
    </div>
  );
}
