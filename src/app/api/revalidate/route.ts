import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";

// Called by the Sanity webhook (create / update / delete on post, author, category).
// Webhook projection: {_type, "slug": slug.current}
type Payload = { _type?: string; slug?: string | null };

export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ message: "Revalidation is not configured" }, { status: 500 });

  const { isValidSignature, body } = await parseBody<Payload>(req, secret);
  if (!isValidSignature) return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  if (!body?._type) return NextResponse.json({ message: "Bad request" }, { status: 400 });

  // expire: 0 so the next visitor gets fresh content, not a stale copy.
  revalidateTag("blog", { expire: 0 });
  if (body.slug && body._type === "post") {
    revalidateTag(`blog:${body.slug}`, { expire: 0 });
    revalidatePath(`/blog/${body.slug}`);
  }
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");

  return NextResponse.json({ revalidated: true, type: body._type });
}
