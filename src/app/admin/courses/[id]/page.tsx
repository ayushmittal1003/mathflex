import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { inr } from "@/lib/format";
import { Card, Field, PageHeader, Toggle, SubmitButton } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { saveCourse, deleteCourse } from "../../actions";

export default async function CourseEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = id === "new" ? null : await db.course.findUnique({ where: { id }, include: { chapters: true } });
  if (id !== "new" && !c) notFound();
  const chapters = await db.chapter.findMany({ orderBy: [{ classLevel: "asc" }, { sortOrder: "asc" }] });
  const selected = new Set(c?.chapters.map((x) => x.chapterId));
  return (
    <div className="max-w-4xl">
      <p className="mb-2 text-sm"><Link href="/admin/courses" className="text-muted hover:text-brand">← All courses</Link></p>
      <PageHeader title={c?.title ?? "New course"} />
      <form action={saveCourse} className="space-y-6">
        {c && <input type="hidden" name="id" value={c.id} />}
        <Card title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title"><input name="title" defaultValue={c?.title} required className="input" /></Field>
            <Field label="URL slug"><input name="slug" defaultValue={c?.slug} className="input" /></Field>
            <Field label="Subtitle" className="sm:col-span-2"><input name="subtitle" defaultValue={c?.subtitle} className="input" /></Field>
            <Field label="Description" className="sm:col-span-2"><textarea name="description" rows={3} defaultValue={c?.description} className="input" /></Field>
            <Field label="Highlights" hint="One per line"><textarea name="highlights" rows={4} defaultValue={c?.highlights.join("\n")} className="input" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Gradient from"><input type="color" name="coverFrom" defaultValue={c?.coverFrom ?? "#FF2E63"} className="input !h-11 !p-1" /></Field>
              <Field label="Gradient to"><input type="color" name="coverTo" defaultValue={c?.coverTo ?? "#F59E0B"} className="input !h-11 !p-1" /></Field>
              <Field label="Sort order" className="col-span-2"><input type="number" name="sortOrder" defaultValue={c?.sortOrder ?? 0} className="input" /></Field>
            </div>
          </div>
        </Card>
        <Card title="Pricing">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price (₹)"><input type="number" name="price" defaultValue={c?.price ?? 2999} required className="input" /></Field>
            <Field label="MRP (₹)"><input type="number" name="mrp" defaultValue={c?.mrp ?? 5999} className="input" /></Field>
            <Field label="Validity (days)"><input type="number" name="validityDays" defaultValue={c?.validityDays ?? 365} className="input" /></Field>
          </div>
        </Card>
        <Card title="Chapters included">
          {[11, 12].map((cls) => (
            <div key={cls} className="mb-4">
              <p className="mb-2 text-sm font-bold">Class {cls}</p>
              <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {chapters.filter((ch) => ch.classLevel === cls).map((ch) => (
                  <label key={ch.id} className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-surface-2">
                    <input type="checkbox" name="chapterIds" value={ch.id} defaultChecked={selected.has(ch.id)} className="size-4" />
                    <span className="flex-1">{ch.title}</span>
                    <span className="text-xs text-muted">{inr(ch.price)}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </Card>
        <Card title="Visibility">
          <div className="grid gap-1 sm:grid-cols-2">
            <Toggle name="isPublished" label="Published" defaultChecked={c?.isPublished ?? true} />
            <Toggle name="isFeatured" label="Featured on home" defaultChecked={c?.isFeatured ?? true} />
          </div>
        </Card>
        <div className="flex gap-3">
          <SubmitButton>Save course</SubmitButton>
          {c && <ConfirmButton action={deleteCourse.bind(null, c.id)} message="Delete this course? If sold, it will be hidden instead.">Delete</ConfirmButton>}
        </div>
      </form>
    </div>
  );
}
