"use client";
import { useState } from "react";
import { PlayIcon } from "./primitives";

// Click-to-play facade: a poster and an accessible play button. The Bunny iframe (and its
// scripts) loads only after the tap, so pages with a video stay fast. `src` is the signed
// embed URL built on the server by playbackFor. `poster` is the Bunny CDN thumbnail; if it
// is missing or fails to load, the generic striped poster shows.
export function VideoPlayFacade({ src, title, caption, sub, poster }: { src: string; title: string; caption?: string; sub?: string; poster?: string | null }) {
  const [playing, setPlaying] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  if (playing) {
    return (
      <iframe
        src={src.replace("autoplay=false", "autoplay=true")}
        title={title}
        className="absolute inset-0 size-full"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
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
  );
}
