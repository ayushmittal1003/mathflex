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

// Bunny video IDs are GUIDs. Admins often paste a whole embed/play URL instead; keep just the ID.
const GUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
export function normalizeBunnyRef(ref: string) {
  const m = ref.trim().match(GUID);
  return m ? m[0].toLowerCase() : ref.trim();
}

type BunnyResult<T> = { ok: true; data: T } | { ok: false; message: string };

// Plain-language reasons for Bunny API failures, so admins know what to fix.
function explain(status: number, what: string): string {
  if (status === 401 || status === 403)
    return "Bunny rejected the API key. Use the Video Library's API key (Stream → your library → API), not the account API key, then redeploy.";
  if (status === 404) return `${what} wasn't found. Check BUNNY_LIBRARY_ID and that the video is in that library.`;
  return `Bunny returned an error (${status}). Try again in a minute.`;
}

async function bunnyGet<T>(path: string, what: string): Promise<BunnyResult<T>> {
  if (!bunnyConfigured()) return { ok: false, message: "Bunny keys aren't set on this server. Add BUNNY_LIBRARY_ID and BUNNY_API_KEY, then redeploy." };
  try {
    const res = await fetch(`${BUNNY_API}/library/${process.env.BUNNY_LIBRARY_ID}${path}`, {
      headers: { AccessKey: process.env.BUNNY_API_KEY!, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, message: explain(res.status, what) };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, message: "Couldn't reach Bunny from the server. Check the network and try again." };
  }
}

// Duration + encode status, used to auto-fill the part length after upload.
export async function bunnyVideoInfo(videoId: string): Promise<BunnyResult<{ durationSec: number; ready: boolean; encodeProgress: number; title: string }>> {
  const ref = normalizeBunnyRef(videoId);
  if (!GUID.test(ref)) return { ok: false, message: "That doesn't look like a Bunny video ID (it should look like 80ec7c97-8d7c-4439-9a58-3bc5bd123406)." };
  const r = await bunnyGet<{ length: number; status: number; encodeProgress: number; title: string }>(`/videos/${ref}`, "This video");
  if (!r.ok) return r;
  // status 4 = finished encoding, 5 = failed
  if (r.data.status === 5) return { ok: false, message: "Bunny couldn't encode this video. Re-upload it in Bunny." };
  return { ok: true, data: { durationSec: r.data.length, ready: r.data.status === 4, encodeProgress: r.data.encodeProgress, title: r.data.title } };
}

// Admin "Test connection": proves the library ID and API key work together.
export async function bunnyHealth(): Promise<BunnyResult<{ videos: number }>> {
  const r = await bunnyGet<{ totalItems: number }>("/videos?page=1&itemsPerPage=1", "This video library");
  return r.ok ? { ok: true, data: { videos: r.data.totalItems } } : r;
}
