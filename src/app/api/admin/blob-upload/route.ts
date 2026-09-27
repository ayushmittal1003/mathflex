import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/auth";

// Issues short-lived upload tokens so an admin's browser can send large PDFs
// straight to Vercel Blob (serverless requests are capped at ~4.5 MB).
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getCurrentUser();
        if (user?.role !== "ADMIN") throw new Error("Admins only");
        if (!/^resources\/[\w-]+\.(pdf|png|jpe?g|webp)$/.test(pathname)) throw new Error("Bad path");
        return {
          allowedContentTypes: ["application/pdf", "image/png", "image/jpeg", "image/webp"],
          maximumSizeInBytes: 30 * 1024 * 1024,
          addRandomSuffix: false,
        };
      },
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
