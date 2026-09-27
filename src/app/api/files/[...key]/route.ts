import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasChapterAccess } from "@/lib/access";
import { readStoredFile } from "@/lib/storage";

const TYPES: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

// Streams uploaded files. Posters/banner images are public; notes & mind maps
// require the student to own the chapter (unless marked free in admin).
export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  const url = `/api/files/${key}`;

  if (key.startsWith("resources/")) {
    const resource = await db.resource.findFirst({ where: { fileUrl: url } });
    if (!resource) return new Response("Not found", { status: 404 });
    const user = await getCurrentUser();
    const isAdmin = user?.role === "ADMIN";
    if (!isAdmin && (!resource.isPublished || (resource.requiresPurchase && !(resource.chapterId && (await hasChapterAccess(user?.id, resource.chapterId)))))) {
      return new Response("Buy the chapter to open these notes.", { status: 403 });
    }
  } else if (!key.startsWith("images/")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await readStoredFile(key);
    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": key.startsWith("images/") ? "public, max-age=31536000, immutable" : "private, max-age=3600",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
