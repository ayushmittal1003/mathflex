import { db } from "@/lib/db";
import { bunnyPreviewClip } from "@/lib/video";

// The silent hover clip for a chapter, taken from its first part with a Bunny video. It comes through
// here so the page never sees the video's ID or CDN address, which could be used to reach the full video.
export async function GET(_: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  const part = await db.part.findFirst({
    where: { chapterId, videoProvider: "BUNNY", videoRef: { not: "" }, chapter: { isPublished: true } },
    orderBy: { order: "asc" },
    select: { videoRef: true },
  });
  const clip = part && (await bunnyPreviewClip(part.videoRef));
  if (!clip) return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=300" } });
  return new Response(clip, { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
