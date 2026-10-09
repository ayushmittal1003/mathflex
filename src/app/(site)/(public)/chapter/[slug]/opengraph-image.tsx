import { getChapterSeo } from "@/lib/seo/queries";
import { ogCard, OG_SIZE } from "@/lib/seo/og";

export const alt = "MathFlex chapter";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const c = await getChapterSeo((await params).slug);
  if (!c) return ogCard({ heading: "MathFlex", sub: "JEE maths, chapter by chapter", from: "#ef4444", to: "#f97316" });
  return ogCard({ heading: c.title, sub: `Class ${c.classLevel} JEE Maths · ${c._count.parts} video lessons`, from: c.coverFrom, to: c.coverTo, symbol: c.symbol });
}
