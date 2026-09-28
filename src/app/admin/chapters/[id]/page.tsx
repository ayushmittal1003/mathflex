import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, ExternalLink, FileText } from "lucide-react";
import { db } from "@/lib/db";
import { bunnyConfigured } from "@/lib/video";
import { claudeConfigured } from "@/lib/flexcare";
import { blobEnabled } from "@/lib/storage";
import { Card, Field, PageHeader, Toggle, SubmitButton, Badge } from "@/components/admin/ui";
import { ConfirmButton, ActionButton } from "@/components/admin/ConfirmButton";
import { VideoField } from "@/components/admin/VideoField";
import { ResourceUploader } from "@/components/admin/ResourceUploader";
import { QuestionImport } from "@/components/admin/QuestionImport";
import { SyncDuration } from "@/components/admin/SyncDuration";
import { AnswerFields } from "@/components/admin/AnswerFields";
import { FORMAT_LABEL } from "@/lib/grading";
import {
  saveChapter, deleteChapter, savePart, deletePart, saveQuestion, deleteQuestion, updateResource, deleteResource, reextractResource,
} from "../../actions";
import type { Chapter, Part, Question, Resource } from "@/generated/prisma/client";

// Reading a long PDF with Claude can take a while.
export const maxDuration = 300;

export default async function ChapterEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; part?: string }> }) {
  const [{ id }, { tab = "details", part: partFilter }] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const chapter = isNew
    ? null
    : await db.chapter.findUnique({
        where: { id },
        include: {
          parts: { orderBy: { order: "asc" }, include: { _count: { select: { questions: true } } } },
          questions: { orderBy: [{ partId: "asc" }, { createdAt: "asc" }] },
          resources: { orderBy: { createdAt: "asc" } },
        },
      });
  if (!isNew && !chapter) notFound();

  const tabs = [
    ["details", "Details & pricing"],
    ["parts", `Parts & videos${chapter ? ` (${chapter.parts.length})` : ""}`],
    ["questions", `DPPs & PYQs${chapter ? ` (${chapter.questions.length})` : ""}`],
    ["notes", `Notes & mind maps${chapter ? ` (${chapter.resources.length})` : ""}`],
  ];

  return (
    <div className="max-w-5xl">
      <p className="mb-2 text-sm"><Link href="/admin/chapters" className="text-muted hover:text-brand">← All chapters</Link></p>
      <PageHeader
        title={chapter?.title ?? "New chapter"}
        subtitle={chapter ? `Class ${chapter.classLevel} · /chapter/${chapter.slug}` : "Create the chapter first, then add parts, questions and notes."}
        action={chapter && <Link href={`/chapter/${chapter.slug}`} target="_blank" className="btn btn-ghost !py-2 text-sm"><ExternalLink className="size-4" /> View live</Link>}
      />
      {chapter && (
        <div className="no-scrollbar mb-6 flex gap-1 overflow-x-auto border-b border-border">
          {tabs.map(([k, label]) => (
            <Link key={k} href={`/admin/chapters/${id}?tab=${k}`} className={`-mb-px shrink-0 border-b-2 px-4 py-3 text-sm font-bold ${tab === k ? "border-brand" : "border-transparent text-muted"}`}>{label}</Link>
          ))}
        </div>
      )}

      {(isNew || tab === "details") && <DetailsForm chapter={chapter} />}
      {chapter && tab === "parts" && <PartsTab chapter={chapter} parts={chapter.parts} />}
      {chapter && tab === "questions" && <QuestionsTab chapter={chapter} parts={chapter.parts} questions={chapter.questions} partFilter={partFilter} />}
      {chapter && tab === "notes" && <NotesTab chapter={chapter} resources={chapter.resources} />}
    </div>
  );
}

function DetailsForm({ chapter: c }: { chapter: Chapter | null }) {
  return (
    <form action={saveChapter} className="space-y-6">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Card title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title"><input name="title" defaultValue={c?.title} required className="input" /></Field>
          <Field label="URL slug" hint="Leave blank to generate from the title"><input name="slug" defaultValue={c?.slug} className="input" /></Field>
          <Field label="Class">
            <select name="classLevel" defaultValue={c?.classLevel ?? 11} className="input"><option value={11}>Class 11</option><option value={12}>Class 12</option></select>
          </Field>
          <Field label="Sort order" hint="Lower comes first in rows"><input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} className="input" /></Field>
          <Field label="Tagline" className="sm:col-span-2"><input name="tagline" defaultValue={c?.tagline} className="input" /></Field>
          <Field label="Description" className="sm:col-span-2"><textarea name="description" rows={4} defaultValue={c?.description} className="input" /></Field>
        </div>
      </Card>
      <Card title="Pricing & access">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price (₹)"><input name="price" type="number" min={0} defaultValue={c?.price ?? 299} required className="input" /></Field>
          <Field label="MRP (₹)" hint="Shown struck through"><input name="mrp" type="number" min={0} defaultValue={c?.mrp ?? 599} className="input" /></Field>
          <Field label="Validity (days)"><input name="validityDays" type="number" min={1} defaultValue={c?.validityDays ?? 365} className="input" /></Field>
        </div>
      </Card>
      <Card title="JEE insights">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="JEE Main weightage (%)"><input name="jeeWeightage" type="number" step="0.1" defaultValue={c?.jeeWeightage ?? 0} className="input" /></Field>
          <Field label="Difficulty">
            <select name="difficulty" defaultValue={c?.difficulty ?? 2} className="input"><option value={1}>Easy</option><option value={2}>Medium</option><option value={3}>Hard</option></select>
          </Field>
          <Field label="Most asked JEE topics" hint="One per line"><textarea name="topTopics" rows={4} defaultValue={c?.topTopics.join("\n")} className="input" /></Field>
          <Field label="Chapter-to-test mapping" hint="Tests that cover this chapter, one per line"><textarea name="testMapping" rows={4} defaultValue={c?.testMapping.join("\n")} className="input" /></Field>
        </div>
      </Card>
      <Card title="Poster & intro">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Gradient from"><input name="coverFrom" type="color" defaultValue={c?.coverFrom ?? "#FF2E63"} className="input !h-11 !p-1" /></Field>
          <Field label="Gradient to"><input name="coverTo" type="color" defaultValue={c?.coverTo ?? "#7C3AED"} className="input !h-11 !p-1" /></Field>
          <Field label="Poster symbol" hint="e.g. ∫, Σ, lim"><input name="symbol" defaultValue={c?.symbol ?? "∫"} className="input" /></Field>
          <Field label="Or upload a poster image" hint="2:3 portrait works best"><input name="coverFile" type="file" accept="image/*" className="text-xs" /></Field>
        </div>
        {c?.coverImage && <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="removeCover" /> Remove uploaded poster image</label>}
        <div className="mt-5">
          <p className="mb-1 text-sm font-semibold">30-second intro video (shown once after purchase)</p>
          <VideoField defaultProvider={c?.introVideoProvider ?? "URL"} defaultRef={c?.introVideoRef ?? ""} bunnyReady={bunnyConfigured()} title={`${c?.title ?? "Chapter"} intro`} prefix="intro" />
        </div>
      </Card>
      <Card title="Visibility">
        <div className="grid gap-1 sm:grid-cols-2">
          <Toggle name="isPublished" label="Published" hint="Visible in the store" defaultChecked={c?.isPublished ?? true} />
          <Toggle name="isFeatured" label="Featured" hint="Rotates in the home hero" defaultChecked={c?.isFeatured} />
          <Toggle name="isTrending" label="Trending" hint="Shows in Top 10 + HOT tag" defaultChecked={c?.isTrending} />
          <Toggle name="isLowPriority" label="Low priority" hint="For chapters rarely asked in JEE" defaultChecked={c?.isLowPriority} />
        </div>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>{c ? "Save chapter" : "Create chapter"}</SubmitButton>
        {c && <ConfirmButton action={deleteChapter.bind(null, c.id)} message="Delete this chapter? If students have bought it, it will be hidden instead.">Delete chapter</ConfirmButton>}
      </div>
    </form>
  );
}

function PartsTab({ chapter, parts }: { chapter: Chapter; parts: (Part & { _count: { questions: number } })[] }) {
  const bunny = bunnyConfigured();
  return (
    <div className="space-y-4">
      {parts.map((p) => (
        <details key={p.id} className="card group overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-gradient font-display font-extrabold text-white">{p.order}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{p.title}</span>
              <span className="text-xs text-muted">
                {p.videoProvider} · {p.durationSec ? `${Math.round(p.durationSec / 60)} min` : "no duration"} · {p._count.questions} questions
              </span>
            </span>
            {p.isFreePreview && <Badge tone="ok">Free preview</Badge>}
            {!p.videoRef && <Badge tone="gold">No video</Badge>}
            <ChevronDown className="size-5 transition group-open:rotate-180" />
          </summary>
          <div className="border-t border-border p-4">
            <PartForm chapterId={chapter.id} part={p} bunny={bunny} />
            <div className="mt-4 flex flex-wrap gap-2">
              {p.videoProvider === "BUNNY" && p.videoRef && <SyncDuration partId={p.id} />}
              <Link href={`/admin/chapters/${chapter.id}?tab=questions&part=${p.id}`} className="btn btn-ghost !px-3 !py-1.5 text-xs">Edit this part&apos;s questions</Link>
              <ConfirmButton action={deletePart.bind(null, p.id)} message={`Delete Part ${p.order}? Its questions stay in the chapter.`}>Delete part</ConfirmButton>
            </div>
          </div>
        </details>
      ))}
      <Card title="Add a part">
        <PartForm chapterId={chapter.id} part={null} bunny={bunny} nextOrder={(parts.at(-1)?.order ?? 0) + 1} />
      </Card>
    </div>
  );
}

function PartForm({ chapterId, part: p, bunny, nextOrder }: { chapterId: string; part: Part | null; bunny: boolean; nextOrder?: number }) {
  return (
    <form action={savePart} className="space-y-4">
      <input type="hidden" name="chapterId" value={chapterId} />
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-[90px_1fr]">
        <Field label="Part #"><input name="order" type="number" min={1} defaultValue={p?.order ?? nextOrder} className="input" /></Field>
        <Field label="Title"><input name="title" defaultValue={p?.title} required className="input" /></Field>
      </div>
      <Field label="Summary"><textarea name="summary" rows={2} defaultValue={p?.summary} className="input" /></Field>
      <Field label="Topics covered" hint="One per line. Used for the practice set and the chatbot."><textarea name="topics" rows={3} defaultValue={p?.topics.join("\n")} className="input" /></Field>
      <div>
        <p className="mb-1 text-sm font-semibold">Video</p>
        <VideoField defaultProvider={p?.videoProvider ?? (bunny ? "BUNNY" : "URL")} defaultRef={p?.videoRef ?? ""} bunnyReady={bunny} title={p?.title ?? "Lecture"} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Duration (minutes)" hint="Auto-filled for Bunny"><input name="durationMin" type="number" step="0.5" defaultValue={p ? Math.round(p.durationSec / 6) / 10 : 60} className="input" /></Field>
        <Field label="XP reward"><input name="xpReward" type="number" defaultValue={p?.xpReward ?? 100} className="input" /></Field>
        <Field label="Must watch (%)" hint="Before practice unlocks"><input name="watchThresholdPct" type="number" min={10} max={100} defaultValue={Math.round((p?.watchThreshold ?? 0.9) * 100)} className="input" /></Field>
      </div>
      <Toggle name="isFreePreview" label="Free preview" hint="Anyone can watch this part without buying" defaultChecked={p?.isFreePreview} />
      <SubmitButton>{p ? "Save part" : "Add part"}</SubmitButton>
    </form>
  );
}

function QuestionsTab({ chapter, parts, questions, partFilter }: { chapter: Chapter; parts: Part[]; questions: Question[]; partFilter?: string }) {
  const shown = partFilter ? questions.filter((q) => q.partId === partFilter) : questions;
  const partName = (id: string | null) => parts.find((p) => p.id === id)?.order;
  // Suggestions for the topic field: the chapter's JEE topics, part topics, and topics already used.
  const topics = [...new Set([...chapter.topTopics, ...parts.flatMap((p) => p.topics), ...questions.map((q) => q.topic ?? "")].filter(Boolean))];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm font-semibold">
        <Link href={`/admin/chapters/${chapter.id}?tab=questions`} className={`rounded-full px-3 py-1.5 ${!partFilter ? "bg-fg text-bg" : "bg-surface-2 text-muted"}`}>All ({questions.length})</Link>
        {parts.map((p) => (
          <Link key={p.id} href={`/admin/chapters/${chapter.id}?tab=questions&part=${p.id}`} className={`rounded-full px-3 py-1.5 ${partFilter === p.id ? "bg-fg text-bg" : "bg-surface-2 text-muted"}`}>
            Part {p.order} ({questions.filter((q) => q.partId === p.id).length})
          </Link>
        ))}
      </div>
      {shown.map((q, i) => (
        <details key={q.id} className="card group overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
            <span className="w-6 text-sm font-bold text-muted">{i + 1}</span>
            <Badge tone={q.type === "PYQ" ? "gold" : "brand"}>{q.type}</Badge>
            {q.format !== "SINGLE" && <Badge>{FORMAT_LABEL[q.format]}</Badge>}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{q.prompt}</span>
            {q.topic && <span className="hidden text-xs text-muted sm:inline">{q.topic}</span>}
            <span className="text-xs text-muted">Part {partName(q.partId) ?? "–"}</span>
            {!q.isPublished && <Badge>Hidden</Badge>}
            <ChevronDown className="size-5 transition group-open:rotate-180" />
          </summary>
          <div className="border-t border-border p-4">
            <QuestionForm chapterId={chapter.id} parts={parts} q={q} topics={topics} />
            <div className="mt-3"><ConfirmButton action={deleteQuestion.bind(null, q.id)} message="Delete this question?">Delete question</ConfirmButton></div>
          </div>
        </details>
      ))}
      <Card title="Add a question"><QuestionForm chapterId={chapter.id} parts={parts} q={null} defaultPart={partFilter} topics={topics} /></Card>
      <Card title="Bulk import"><QuestionImport chapterId={chapter.id} /></Card>
    </div>
  );
}

function QuestionForm({ chapterId, parts, q, defaultPart, topics }: { chapterId: string; parts: Part[]; q: Question | null; defaultPart?: string; topics: string[] }) {
  const listId = `topics-${q?.id ?? "new"}`;
  return (
    <form action={saveQuestion} className="space-y-4">
      <input type="hidden" name="chapterId" value={chapterId} />
      {q && <input type="hidden" name="id" value={q.id} />}
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Type"><select name="type" defaultValue={q?.type ?? "DPP"} className="input"><option value="DPP">DPP</option><option value="PYQ">PYQ</option></select></Field>
        <Field label="Part" hint="Single-correct only; others go to the Q bank">
          <select name="partId" defaultValue={q?.partId ?? defaultPart ?? parts[0]?.id ?? ""} className="input">
            <option value="">No part</option>
            {parts.map((p) => <option key={p.id} value={p.id}>Part {p.order}</option>)}
          </select>
        </Field>
        <Field label="Exam (PYQ)">
          <input name="exam" list="exam-names" defaultValue={q?.exam ?? ""} placeholder="JEE Main" className="input" />
          <datalist id="exam-names"><option value="JEE Main" /><option value="JEE Advanced" /><option value="JEE Main (Jan)" /><option value="JEE Main (Apr)" /></datalist>
        </Field>
        <Field label="Year (PYQ)"><input name="year" type="number" defaultValue={q?.year ?? ""} className="input" /></Field>
      </div>
      <Field label="Question" hint="Plain text maths works well: x², √, ∫, π, ≤"><textarea name="prompt" rows={3} defaultValue={q?.prompt} required className="input" /></Field>
      <AnswerFields q={q} />
      <Field label="Topic" hint="Sub-topic for the students' weak-topic analytics, e.g. L'Hôpital's rule">
        <input name="topic" list={listId} defaultValue={q?.topic ?? ""} className="input" />
        <datalist id={listId}>{topics.map((t) => <option key={t} value={t} />)}</datalist>
      </Field>
      <Field label="Solution"><textarea name="solution" rows={3} defaultValue={q?.solution} className="input" /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Difficulty"><select name="difficulty" defaultValue={q?.difficulty ?? 2} className="input"><option value={1}>Easy</option><option value={2}>Medium</option><option value={3}>Hard</option></select></Field>
        <Field label="XP"><input name="xp" type="number" defaultValue={q?.xp ?? 10} className="input" /></Field>
        <div className="pt-5"><Toggle name="isPublished" label="Published" defaultChecked={q?.isPublished ?? true} /></div>
      </div>
      <SubmitButton>{q ? "Save question" : "Add question"}</SubmitButton>
    </form>
  );
}

function NotesTab({ chapter, resources }: { chapter: Chapter; resources: Resource[] }) {
  const ai = claudeConfigured();
  return (
    <div className="space-y-4">
      <Card title="Upload short notes, formula sheets or mind maps">
        <ResourceUploader chapterId={chapter.id} direct={blobEnabled()} />
      </Card>
      {resources.map((r) => (
        <details key={r.id} className="card group overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
            <FileText className="size-5 text-brand" />
            <span className="min-w-0 flex-1 truncate font-bold">{r.title}</span>
            <Badge>{r.type.replace("_", " ")}</Badge>
            {r.includeInChatbot && (r.knowledgeText ? <Badge tone="ok">In FlexCare</Badge> : <Badge tone="gold">Not read yet</Badge>)}
            <ChevronDown className="size-5 transition group-open:rotate-180" />
          </summary>
          <form action={updateResource} className="space-y-4 border-t border-border p-4">
            <input type="hidden" name="id" value={r.id} />
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <Field label="Title"><input name="title" defaultValue={r.title} className="input" /></Field>
              <Field label="Type">
                <select name="type" defaultValue={r.type} className="input">
                  <option value="NOTES">Short notes</option><option value="MINDMAP">Mind map</option><option value="FORMULA_SHEET">Formula sheet</option><option value="OTHER">Other</option>
                </select>
              </Field>
            </div>
            <Field label="What FlexCare knows from this file" hint="Auto-extracted on upload. Edit freely — this is exactly what the chatbot reads.">
              <textarea name="knowledgeText" rows={8} defaultValue={r.knowledgeText} className="input font-mono text-xs" />
            </Field>
            <div className="grid gap-1 sm:grid-cols-3">
              <Toggle name="includeInChatbot" label="Teach FlexCare" defaultChecked={r.includeInChatbot} />
              <Toggle name="requiresPurchase" label="Buyers only" defaultChecked={r.requiresPurchase} />
              <Toggle name="isPublished" label="Published" defaultChecked={r.isPublished} />
            </div>
            <div className="flex flex-wrap gap-2">
              <SubmitButton>Save</SubmitButton>
              <a href={r.fileUrl} target="_blank" className="btn btn-ghost !px-3 !py-1.5 text-sm">Open file</a>
              {ai && <ActionButton action={reextractResource.bind(null, r.id)}>Re-read with AI</ActionButton>}
              <ConfirmButton action={deleteResource.bind(null, r.id)} message="Delete this file?">Delete</ConfirmButton>
            </div>
          </form>
        </details>
      ))}
    </div>
  );
}
