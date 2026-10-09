"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Playback } from "@/lib/video";

type PlayerJs = { on: (ev: string, cb: (d?: { seconds: number }) => void) => void; pause?: () => void };
const playerjs = () => (window as unknown as { playerjs?: { Player: new (el: HTMLIFrameElement) => PlayerJs } }).playerjs;

// Poster that plays the free part of a video while the pointer is over it (or the poster is
// focused/tapped). When the free minutes run out it pauses and says "Subscribe to watch it
// complete". Leaving the poster resets it. Without a playable video the poster is shown as is.
export function HoverPreview({ playback, limitSec, upgradeHref, children }: { playback: Playback; limitSec: number; upgradeHref: string; children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [locked, setLocked] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const player = useRef<PlayerJs | null>(null);

  const playable = playback.kind === "file" || (playback.kind === "iframe" && playback.provider === "BUNNY");

  useEffect(() => {
    if (!active || playback.kind !== "iframe") return;
    let cancelled = false;
    const attach = () => {
      const api = playerjs();
      if (cancelled || !frame.current || !api) return;
      const p = new api.Player(frame.current);
      player.current = p;
      p.on("ready", () => {
        p.on("timeupdate", (d) => {
          if (d && d.seconds >= limitSec) {
            p.pause?.();
            setLocked(true);
          }
        });
      });
    };
    if (playerjs()) attach();
    else {
      const s = document.createElement("script");
      s.src = "https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js";
      s.onload = attach;
      document.head.appendChild(s);
    }
    return () => { cancelled = true; player.current = null; };
  }, [active, playback, limitSec]);

  if (!playable) return <>{children}</>;

  const stop = () => { setActive(false); setLocked(false); };
  // Muted autoplay is what browsers allow without a click.
  const src = playback.kind === "iframe" ? playback.src.replace("autoplay=false", "autoplay=true") + "&muted=true&loop=false" : "";

  return (
    <div className="relative" onMouseEnter={() => setActive(true)} onMouseLeave={stop} onFocus={() => setActive(true)} onBlur={stop}>
      {children}
      {active && (
        <div className="absolute inset-0 z-[2] bg-black">
          {playback.kind === "iframe" ? (
            <iframe ref={frame} src={src} title="Free preview" className="absolute inset-0 size-full" allow="autoplay; encrypted-media; picture-in-picture" />
          ) : (
            <video
              ref={video}
              src={playback.src}
              autoPlay
              muted
              playsInline
              className="size-full object-cover"
              onTimeUpdate={(e) => { if (e.currentTarget.currentTime >= limitSec) { e.currentTarget.pause(); setLocked(true); } }}
            />
          )}
          {locked && (
            <div className="absolute inset-0 grid place-items-center bg-black/85 p-5 text-center text-white">
              <div>
                <p className="text-xl font-extrabold tracking-tight">Subscribe to watch it complete</p>
                <p className="mt-1.5 text-sm text-white/70">That was the free preview. Unlock the chapter to see the full video.</p>
                <Link href={upgradeHref} className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground hover:brightness-110">Unlock chapter</Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
