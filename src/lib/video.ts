import "server-only";
import { createHash } from "node:crypto";
import type { VideoProvider } from "@/generated/prisma/enums";

// One place that knows how each video host works. Swap providers per video from admin.

const BUNNY_API = "https://video.bunnycdn.com";
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function bunnyConfigured() {
  return !!(process.env.BUNNY_LIBRARY_ID && process.env.BUNNY_API_KEY);
}

export type Playback =
  | { kind: "iframe"; src: string; provider: "BUNNY" | "YOUTUBE" }
  | { kind: "file"; src: string }
  | { kind: "none" };

// Short-lived, signed playback URL. Only called after the access check passes.
export function playbackFor(provider: VideoProvider | null | undefined, ref: string | null | undefined): Playback {
  if (!provider || !ref) return { kind: "none" };
  if (provider === "BUNNY") {
    const lib = process.env.BUNNY_LIBRARY_ID;
    if (!lib) return { kind: "none" };
    const params = new URLSearchParams({ autoplay: "false", preload: "true", responsive: "true" });
    const tokenKey = process.env.BUNNY_TOKEN_KEY;
    if (tokenKey) {
      // Embed token authentication: sha256(token_key + video_id + expires)
      const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 4;
      params.set("token", sha256(tokenKey + ref + expires));
      params.set("expires", String(expires));
    }
    return { kind: "iframe", provider: "BUNNY", src: `https://iframe.mediadelivery.net/embed/${lib}/${ref}?${params}` };
  }
  if (provider === "YOUTUBE") {
    const id = extractYouTubeId(ref);
    return {
      kind: "iframe",
      provider: "YOUTUBE",
      src: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`,
    };
  }
  return { kind: "file", src: ref };
}

export function extractYouTubeId(ref: string) {
  const m = ref.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : ref;
}

// Step 1 of an admin upload: create an empty video in Bunny and hand the browser
// a pre-signed TUS ticket so the file goes straight to Bunny, never through our server.
export async function createBunnyUpload(title: string) {
  const lib = process.env.BUNNY_LIBRARY_ID!;
  const key = process.env.BUNNY_API_KEY!;
  const res = await fetch(`${BUNNY_API}/library/${lib}/videos`, {
    method: "POST",
    headers: { AccessKey: key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Bunny create video failed: ${res.status} ${await res.text()}`);
  const { guid } = (await res.json()) as { guid: string };
  const expire = Math.floor(Date.now() / 1000) + 60 * 60 * 6;
  return {
    videoId: guid,
    endpoint: `${BUNNY_API}/tusupload`,
    headers: {
      AuthorizationSignature: sha256(lib + key + expire + guid),
      AuthorizationExpire: String(expire),
      VideoId: guid,
      LibraryId: lib,
    },
  };
}

// Duration + encode status, used to auto-fill the part length after upload.
export async function bunnyVideoInfo(videoId: string) {
  const lib = process.env.BUNNY_LIBRARY_ID!;
  const res = await fetch(`${BUNNY_API}/library/${lib}/videos/${videoId}`, {
    headers: { AccessKey: process.env.BUNNY_API_KEY!, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const v = (await res.json()) as { length: number; status: number; encodeProgress: number };
  // status 4 = finished encoding
  return { durationSec: v.length, ready: v.status === 4, encodeProgress: v.encodeProgress };
}
