import { playbackFor } from "@/lib/video";
import { cx } from "./ui";

// Dark-framed video (design.md §3.4). With a Bunny video ID it renders the existing signed
// Bunny embed from playbackFor, exactly like chapter videos. Without one it shows a
// "Video coming soon" frame: no play button, no broken embed.
export function VideoFrame({ videoId, caption, sub, className }: { videoId: string | null; caption?: string; sub?: string; className?: string }) {
  const playback = videoId ? playbackFor("BUNNY", videoId) : { kind: "none" as const };

  return (
    <div className={cx("relative overflow-hidden rounded-xl border-[6px] border-foreground bg-foreground text-white shadow-[0_40px_80px_-36px_rgb(80_20_0/0.5)]", className)}>
      {playback.kind === "iframe" ? (
        <iframe
          src={playback.src}
          title={caption ?? "Video"}
          className="absolute inset-0 size-full"
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-video-stripes" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_100%,color-mix(in_oklab,var(--primary)_35%,transparent),transparent_70%)]" />
          <div className="absolute inset-0 grid place-items-center">
            <span className="rounded-lg bg-black/45 px-4 py-2 text-sm font-bold tracking-wide text-white/85 backdrop-blur">Video coming soon</span>
          </div>
          {(caption || sub) && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-transparent to-black/75 p-6">
              {caption && <div className="text-[22px] font-extrabold tracking-[-0.025em]">{caption}</div>}
              {sub && <div className="mt-1 text-[13px] text-white/75">{sub}</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
