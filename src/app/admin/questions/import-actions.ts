"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { allow } from "@/lib/rate-limit";
import { claudeConfigured } from "@/lib/flexcare";
import { extractSourceText, fileKind, type Source } from "@/lib/question-import/extract";
import { extractWithAi } from "@/lib/question-import/ai";
import { parseQuestions, parseKey, type Draft } from "@/lib/question-import/parse";
import { Commit, describeCommitIssue, type CommitInput } from "@/lib/question-import/commit-schema";
import { isTemplateFile, parseTemplate, type TemplateIssue } from "@/lib/question-import/template";
import { saveFile, readStoredFile, deleteStoredFile, urlForKey } from "@/lib/storage";

type KeptFile = { url: string; size: number; mimeType: "application/pdf"; name: string };

export type PreviewState = { error?: string; drafts?: Draft[]; warnings?: string[]; errors?: string[]; via?: "text" | "ai" | "format"; filename?: string; kept?: KeptFile[] } | undefined;

const issueText = (i: TemplateIssue) => `Question ${i.question}, line ${i.line}: ${i.message}`;

const KEY = /^resources\/[\w-]+\.(pdf|docx|txt|md|png|jpe?g|webp)$/;

// The two ways a file arrives: uploaded by the browser straight to storage (production, so big PDFs
// skip the 4.5 MB request limit) and named by its key, or sent inside the form (local development).
async function source(form: FormData, field: string): Promise<(Source & { key?: string }) | null> {
  const key = String(form.get(`${field}Key`) ?? "");
  if (key) {
    if (!KEY.test(key)) throw new Error("That upload couldn't be found. Please choose the file again.");
    return { key, name: String(form.get(`${field}Name`) ?? key), mime: String(form.get(`${field}Type`) ?? ""), buf: await readStoredFile(key) };
  }
  const f = form.get(field);
  if (!(f instanceof File) || f.size === 0) return null;
  return { name: f.name, mime: f.type, buf: Buffer.from(await f.arrayBuffer()) };
}

// PDFs students may download next to the practice (saved as resources on import). Files that aren't
// kept are removed from storage again.
async function keepOrDrop(srcs: ((Source & { key?: string }) | null)[], keepPdf: boolean): Promise<KeptFile[]> {
  const out: KeptFile[] = [];
  for (const src of srcs) {
    if (!src) continue;
    const isPdf = fileKind(src.name, src.mime) === "pdf";
    if (keepPdf && isPdf) {
      const key = src.key ?? (await saveFile(new File([new Uint8Array(src.buf)], src.name, { type: "application/pdf" }), "resources")).key;
      out.push({ url: urlForKey(key), size: src.buf.length, mimeType: "application/pdf", name: src.name.replace(/\.pdf$/i, "") });
    } else if (src.key) {
      await deleteStoredFile(src.key).catch(() => {});
    }
  }
  return out;
}

// Step 1: read the uploaded file(s) and return the questions found, for the admin to review. Nothing is saved yet.
export async function previewQuestionFile(_: PreviewState, form: FormData): Promise<PreviewState> {
  const me = await requireStaff("questions");
  if (!(await allow(`qimport:${me.id}`, 30, 3600))) return { error: "Too many imports this hour. Please wait a bit." };
  const wantAi = form.get("useAi") === "on";
  const keepPdf = form.get("keepPdf") === "on";

  try {
    const file = await source(form, "file");
    if (!file) return { error: "Choose a PDF or Word file first." };
    const sol = await source(form, "solutions");
    const kind = fileKind(file.name, file.mime);
    if (kind === "unsupported") return { error: "Use a PDF, Word (.docx), text file, or a PNG/JPG photo. Old .doc files: open them in Word and Save As .docx." };

    if (wantAi || kind === "image") {
      if (!claudeConfigured()) return { error: kind === "image" ? "Reading photos needs the AI. Add ANTHROPIC_API_KEY, or upload a PDF/Word file with selectable text." : "AI reading needs ANTHROPIC_API_KEY to be set." };
      const r = await extractWithAi(file, sol);
      return { drafts: r.drafts, warnings: r.warnings, via: "ai", filename: file.name, kept: await keepOrDrop([file, sol], keepPdf) };
    }

    const main = await extractSourceText(file);
    if (main.text.trim().length < 40) {
      await keepOrDrop([file, sol], false);
      return { error: claudeConfigured()
        ? "This file has no selectable text (it looks scanned). Tick “Read with AI” and try again."
        : "This file has no selectable text (it looks scanned), so it can't be read without the AI. Upload a Word file or a PDF exported from Word." };
    }
    // A file in the MathFlex format is read strictly: every problem is reported with its line.
    if (isTemplateFile(main.text)) {
      const t = parseTemplate(main.text, { fromPdf: main.kind === "pdf" });
      if (!t.drafts.length) return { error: "No questions were found. Check that each question is separated by a line with three dashes (---). See Question file format." };
      return { drafts: t.drafts, errors: t.errors.map(issueText), warnings: t.warnings.map(issueText), via: "format", filename: file.name, kept: await keepOrDrop([file, sol], keepPdf) };
    }
    const solText = sol ? (await extractSourceText(sol)).text : "";
    const { drafts, warnings } = parseQuestions(main.text, solText);
    if (sol && solText.trim() && parseKey(solText).size === 0) warnings.push("Nothing could be read from the solutions file.");
    return { drafts, warnings, via: "text", filename: file.name, kept: await keepOrDrop([file, sol], keepPdf) };
  } catch (e) {
    console.error("[question-import]", e);
    return { error: e instanceof Error ? e.message : "Couldn't read that file." };
  }
}

export type CommitState = { error?: string; created?: number; skipped?: string[] } | undefined;

// Step 2: save the reviewed questions. Each one is checked again on the server.
export async function commitQuestionDrafts(input: CommitInput): Promise<CommitState> {
  const me = await requireStaff("questions");
  const parsed = Commit.safeParse(input);
  if (!parsed.success) {
    console.error("[question-import] rejected", parsed.error.issues.slice(0, 5));
    return { error: describeCommitIssue(parsed.error.issues) };
  }
  const c = parsed.data;
  const chapter = await db.chapter.findUnique({ where: { id: c.chapterId }, select: { id: true, title: true, parts: { select: { id: true, order: true } } } });
  if (!chapter) return { error: "Chapter not found." };
  const partId = c.partOrder ? chapter.parts.find((p) => p.order === c.partOrder)?.id ?? null : null;

  const skipped: string[] = [];
  const rows = c.drafts.flatMap((d, i) => {
    const options = d.format === "NUMERICAL" ? [] : d.options.filter(Boolean);
    const bad =
      d.format === "NUMERICAL" ? d.numericAnswer === null
      : options.length < 2 ? true
      : d.format === "SINGLE" ? d.correctIndex < 0 || d.correctIndex >= options.length
      : d.correctIndices.length === 0 || d.correctIndices.some((x) => x >= options.length);
    if (bad) { skipped.push(`Question ${i + 1}`); return []; }
    return [{
      chapterId: c.chapterId,
      partId: d.format === "SINGLE" ? partId : null, // the lesson page quizzes single-answer questions
      type: c.type,
      format: d.format,
      prompt: d.prompt,
      options,
      correctIndex: d.format === "SINGLE" ? d.correctIndex : 0,
      correctIndices: d.format === "MULTIPLE" ? [...new Set(d.correctIndices)].sort((a, b) => a - b) : [],
      numericAnswer: d.format === "NUMERICAL" ? d.numericAnswer : null,
      tolerance: d.format === "NUMERICAL" ? d.tolerance : 0,
      solution: d.solution,
      // A year/exam read from the question wins over the batch default.
      exam: d.exam || c.exam || null,
      year: d.year ?? c.year,
      topic: d.topic || null,
      difficulty: d.difficulty ?? c.difficulty,
      isPublished: c.publish,
    }];
  });
  if (!rows.length) return { error: "None of the questions are complete enough to import.", skipped };
  await db.question.createMany({ data: rows });
  if (c.kept.length) {
    await db.resource.createMany({
      data: c.kept.map((k, i) => ({
        chapterId: c.chapterId,
        type: c.type === "PYQ" ? ("PYQ_SHEET" as const) : ("DPP_SHEET" as const),
        title: k.name || `${c.type} ${i ? "solutions" : "questions"}`,
        fileUrl: k.url,
        mimeType: k.mimeType,
        sizeBytes: k.size,
        includeInChatbot: false,
        requiresPurchase: true,
        isPublished: c.publish,
      })),
    });
  }
  await audit(me, "question.import", `Imported ${rows.length} ${c.type} questions from a file into “${chapter.title}”${skipped.length ? ` (${skipped.length} skipped)` : ""}`, { entity: "chapter", id: c.chapterId });
  revalidatePath(`/admin/chapters/${c.chapterId}`);
  revalidatePath("/admin/questions");
  return { created: rows.length, skipped };
}

// Remove a chapter's questions in one go (all, or only DPPs / PYQs). Students' attempts on them go too.
export async function deleteChapterQuestions(chapterId: string, type: "ALL" | "DPP" | "PYQ") {
  const me = await requireStaff("questions");
  const chapter = await db.chapter.findUniqueOrThrow({ where: { id: chapterId }, select: { title: true } });
  const where = { chapterId, ...(type === "ALL" ? {} : { type }) };
  const { count } = await db.question.deleteMany({ where });
  await audit(me, "question.delete", `Deleted ${count} ${type === "ALL" ? "" : `${type} `}questions from “${chapter.title}”`, { entity: "chapter", id: chapterId });
  revalidatePath(`/admin/chapters/${chapterId}`);
  revalidatePath("/admin/questions");
}
