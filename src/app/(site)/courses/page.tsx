import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CourseCard } from "@/components/site/CourseCard";

export const metadata = { title: "Complete courses" };

export default async function Courses() {
  const user = await getCurrentUser();
  const [courses, ents] = await Promise.all([
    db.course.findMany({ where: { isPublished: true }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { chapters: true } } } }),
    user ? db.entitlement.findMany({ where: { userId: user.id, courseId: { not: null }, expiresAt: { gt: new Date() } } }) : [],
  ]);
  const owned = new Set(ents.map((e) => e.courseId));
  return (
    <div className="mx-auto max-w-[1500px] px-4 pt-[calc(var(--nav-h)+2rem)] md:px-8">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Complete courses</h1>
      <p className="mt-1 text-muted">Every chapter, every DPP, every PYQ — one price.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 [&>a]:!w-full">
        {courses.map((c) => <CourseCard key={c.id} c={{ ...c, chapterCount: c._count.chapters, owned: owned.has(c.id) }} />)}
      </div>
    </div>
  );
}
