"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlayIcon } from "./primitives";
import { track } from "@/lib/track";

type PlayerJs = { on: (ev: string, cb: () => void) => void; play: () => void; pause: () => void; unmute: () => void; setVolume: (v: number) => void };
const playerjs = () => (window as unknown as { playerjs?: { Player: new (el: HTMLIFrameElement) => PlayerJs } }).playerjs;

// Click-to-play facade: a poster and an accessible play button. The Bunny iframe (and its
// scripts) loads only after the tap, so pages with a video stay fast. `src` is the signed
// embed URL built on the server by playbackFor. `poster` is the Bunny CDN thumbnail; if it
// is missing or fails to load, the generic striped poster shows.
//
// With `hoverPlay` the video also plays while the mouse is over it, with sound. Browsers only allow
// sound once the visitor has clicked something on the page, so until then it plays muted and offers
// a "Click for sound" button. Leaving pauses it, unless they clicked on the video to watch it properly.
export function VideoPlayFacade({ src, title, caption, sub, poster, hoverPlay = false }: { src: string; title: string; caption?: string; sub?: string; poster?: string | null; hoverPlay?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [startMuted, setStartMuted] = useState(false);
  const [askForSound, setAskForSound] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const player = useRef<PlayerJs | null>(null);
  const over = useRef(false);
  const stayOn = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const soundOn = useCallback(() => {
    player.current?.unmute();
    player.current?.setVolume(100);
    player.current?.play();
  }, []);
  // Unmuting before the visitor has clicked anything makes the browser pause the video, so never try it.
  const trySound = useCallback(() => {
    if (navigator.userActivation?.hasBeenActive) soundOn();
    else setAskForSound(true);
  }, [soundOn]);

  useEffect(() => {
    if (!hoverPlay || !playing) return;
    let cancelled = false;
    const attach = () => {
      const api = playerjs();
      if (cancelled || !frame.current || !api) return;
      const p = new api.Player(frame.current);
      p.on("ready", () => {
        player.current = p;
        if (over.current || stayOn.current) trySound();
        else p.pause();
      });
    };
    if (playerjs()) attach();
    else {
      const s = document.createElement("script");
      s.src = "https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js";
      s.onload = attach;
      document.head.appendChild(s);
    }
    // A click inside the player moves focus to the iframe: they are watching now, so leaving shouldn't pause it.
    const onBlur = () => {
      if (document.activeElement === frame.current) {
        stayOn.current = true;
        setAskForSound(false);
      }
    };
    window.addEventListener("blur", onBlur);
    return () => {
      cancelled = true;
      player.current = null;
      window.removeEventListener("blur", onBlur);
    };
  }, [hoverPlay, playing, trySound]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const enter = (e: React.PointerEvent) => {
    if (!hoverPlay || e.pointerType !== "mouse" || stayOn.current) return;
    over.current = true;
    // A short wait so moving the mouse past the video doesn't start it.
    timer.current = setTimeout(() => {
      if (player.current) {
        player.current.play();
        trySound();
      } else if (!playing) {
        setStartMuted(true);
        setPlaying(true);
      }
    }, 250);
  };
  const leave = () => {
    clearTimeout(timer.current);
    over.current = false;
    if (stayOn.current) return;
    setAskForSound(false);
    player.current?.pause();
  };

  return (
    <div className="absolute inset-0" onPointerEnter={enter} onPointerLeave={leave}>
      {playing ? (
        <>
          <iframe
            ref={frame}
            src={src.replace("autoplay=false", "autoplay=true") + (startMuted ? "&muted=true" : "")}
            title={title}
            className="absolute inset-0 size-full"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
          {askForSound && (
            <button
              type="button"
              onClick={() => { stayOn.current = true; setAskForSound(false); soundOn(); }}
              className="absolute right-3 top-3 rounded-lg bg-black/75 px-3 py-2 text-sm font-bold text-white backdrop-blur hover:bg-black"
            >
              Click for sound
            </button>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => { clearTimeout(timer.current); stayOn.current = true; setPlaying(true); track("video_play", title); }}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 grid size-full place-items-center text-left"
        >
          <span className="absolute inset-0 bg-video-stripes" />
          {poster && !posterFailed && (
            // eslint-disable-next-line @next/next/no-img-element -- Bunny CDN thumbnail; falls back to the generic poster on error
            <img src={poster} alt="" loading="lazy" onError={() => setPosterFailed(true)} className="absolute inset-0 size-full object-cover" />
          )}
          <span className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_100%,color-mix(in_oklab,var(--primary)_35%,transparent),transparent_70%)]" />
          <span className="relative grid size-[76px] place-items-center rounded-full bg-primary text-white shadow-[0_0_0_12px_rgb(255_255_255/0.12)] transition-transform duration-200 group-hover:scale-105 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-white">
            <PlayIcon className="size-7" />
          </span>
          {(caption || sub) && (
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-transparent to-black/75 p-5 tablet:p-6">
              {caption && <span className="block text-[clamp(18px,2.4vw,22px)] font-extrabold leading-[1.15] tracking-[-0.025em]">{caption}</span>}
              {sub && <span className="mt-1 block text-[13px] text-white/80">{sub}</span>}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
