import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasChapterAccess } from "@/lib/access";
import { readStoredFile, signedDownloadUrl } from "@/lib/storage";

const TYPES: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

// Serves uploaded files. Posters/banner images are public; notes & mind maps
// require the student to own the chapter (unless marked free in admin).
export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  const url = `/api/files/${key}`;
  const isResource = key.startsWith("resources/");

  if (isResource) {
    const resource = await db.resource.findFirst({ where: { fileUrl: url } });
    if (!resource) return new Response("Not found", { status: 404 });
    const user = await getCurrentUser();
    const isAdmin = user?.role === "ADMIN";
    const owns = !!resource.chapterId && (await hasChapterAccess(user?.id, resource.chapterId));
    if (!isAdmin && (!resource.isPublished || (resource.requiresPurchase && !owns))) {
      return new Response("Buy the chapter to open these notes.", { status: 403 });
    }
    // On Vercel: hand out a 10-minute signed link instead of streaming large PDFs.
    try {
      const signed = await signedDownloadUrl(key);
      if (signed) return Response.redirect(signed, 302);
    } catch (e) {
      console.error("signed URL failed, streaming instead", e);
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
        "Cache-Control": isResource ? "private, max-age=600" : "public, max-age=31536000, immutable",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
