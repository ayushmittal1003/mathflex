import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { inr, pctOff } from "@/lib/format";
import { AddToCart } from "@/components/site/AddToCart";
import { ChapterPoster } from "@/components/site/ChapterCard";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const course = await db.course.findUnique({ where: { slug }, include: { chapters: true } });
  if (!course || !course.isPublished) notFound();
  const ids = new Set(course.chapters.map((c) => c.chapterId));
  const chapters = (await getCatalog(user?.id)).filter((c) => ids.has(c.id));
  const owned = user ? !!(await db.entitlement.findFirst({ where: { userId: user.id, courseId: course.id, expiresAt: { gt: new Date() } } })) : false;
  const separately = chapters.reduce((s, c) => s + c.price, 0);
  const off = pctOff(course.price, course.mrp);

  return (
    <div>
      <section className="relative overflow-hidden text-white" style={{ background: `linear-gradient(125deg, ${course.coverFrom}, ${course.coverTo})` }}>
        <div className="pointer-events-none absolute -right-10 -top-10 font-display text-[22rem] font-extrabold leading-none text-white/15">Σ</div>
        <div className="relative mx-auto max-w-[1500px] px-4 pb-14 pt-[calc(var(--nav-h)+3rem)] md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] opacity-80">Complete course</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold sm:text-6xl">{course.title}</h1>
          <p className="mt-3 max-w-2xl text-lg opacity-90">{course.description}</p>
          <ul className="mt-5 grid max-w-2xl gap-2 sm:grid-cols-2">
            {course.highlights.map((h) => <li key={h} className="flex items-center gap-2 font-semibold"><Check className="size-5" /> {h}</li>)}
          </ul>
          {owned ? (
            <p className="mt-8 inline-flex rounded-full bg-white/20 px-4 py-2 font-bold">You own this course 🎉 — pick any chapter below.</p>
          ) : (
            <div className="mt-8">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-display text-5xl font-extrabold">{inr(course.price)}</span>
                {off > 0 && <span className="text-xl line-through opacity-60">{inr(course.mrp)}</span>}
                {separately > course.price && <span className="rounded-full bg-black/25 px-3 py-1 text-sm font-bold">{inr(separately - course.price)} less than buying chapters separately</span>}
              </div>
              <p className="mt-1 text-sm opacity-80">{course.validityDays} days access</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <AddToCart variant="buy" item={{ type: "COURSE", id: course.id }} className="!bg-none !bg-white !text-black !shadow-none" />
                <AddToCart variant="button" item={{ type: "COURSE", id: course.id }} className="!bg-white/20 !text-white" />
              </div>
            </div>
          )}
        </div>
      </section>
      <div className="mx-auto max-w-[1500px] px-4 pt-10 md:px-8">
        <h2 className="font-display text-2xl font-extrabold">{chapters.length} chapters included</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 [&>a]:!w-full">
          {chapters.map((c) => <ChapterPoster key={c.id} c={{ ...c, owned: c.owned || owned }} />)}
        </div>
      </div>
    </div>
  );
}
