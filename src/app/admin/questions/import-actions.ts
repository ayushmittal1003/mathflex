"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { allow } from "@/lib/rate-limit";
import { claudeConfigured } from "@/lib/flexcare";
import { extractFileText, fileKind } from "@/lib/question-import/extract";
import { extractWithAi } from "@/lib/question-import/ai";
import { parseQuestions, parseKey, type Draft } from "@/lib/question-import/parse";

export type PreviewState = { error?: string; drafts?: Draft[]; warnings?: string[]; via?: "text" | "ai"; filename?: string } | undefined;

// Step 1: read the uploaded file(s) and return the questions found, for the admin to review. Nothing is saved yet.
export async function previewQuestionFile(_: PreviewState, form: FormData): Promise<PreviewState> {
  const me = await requireStaff("questions");
  if (!(await allow(`qimport:${me.id}`, 30, 3600))) return { error: "Too many imports this hour. Please wait a bit." };
  const file = form.get("file");
  const solutions = form.get("solutions");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a PDF or Word file first." };
  const sol = solutions instanceof File && solutions.size > 0 ? solutions : null;
  const wantAi = form.get("useAi") === "on";

  try {
    const kind = fileKind(file.name, file.type);
    if (kind === "unsupported") return { error: "Use a PDF, Word (.docx), text file, or a PNG/JPG photo. Old .doc files: open them in Word and Save As .docx." };

    if (wantAi || kind === "image") {
      if (!claudeConfigured()) return { error: kind === "image" ? "Reading photos needs the AI. Add ANTHROPIC_API_KEY, or upload a PDF/Word file with selectable text." : "AI reading needs ANTHROPIC_API_KEY to be set." };
      const r = await extractWithAi(file, sol);
      return { drafts: r.drafts, warnings: r.warnings, via: "ai", filename: file.name };
    }

    const main = await extractFileText(file);
    if (main.text.trim().length < 40) {
      return { error: claudeConfigured()
        ? "This file has no selectable text (it looks scanned). Tick “Read with AI” and try again."
        : "This file has no selectable text (it looks scanned), so it can't be read without the AI. Upload a Word file or a PDF exported from Word." };
    }
    const solText = sol ? (await extractFileText(sol)).text : "";
    const { drafts, warnings } = parseQuestions(main.text, solText);
    if (sol && solText.trim() && parseKey(solText).size === 0) warnings.push("Nothing could be read from the solutions file.");
    return { drafts, warnings, via: "text", filename: file.name };
  } catch (e) {
    console.error("[question-import]", e);
    return { error: e instanceof Error ? e.message : "Couldn't read that file." };
  }
}

const DraftIn = z.object({
  prompt: z.string().trim().min(1).max(4000),
  options: z.array(z.string().trim().max(1000)).max(6),
  format: z.enum(["SINGLE", "MULTIPLE", "NUMERICAL"]),
  correctIndex: z.number().int().min(0).max(5),
  correctIndices: z.array(z.number().int().min(0).max(5)).max(6),
  numericAnswer: z.number().finite().nullable(),
  tolerance: z.number().finite().min(0),
  solution: z.string().max(6000),
});
const Commit = z.object({
  chapterId: z.string().min(1),
  type: z.enum(["DPP", "PYQ"]),
  partOrder: z.number().int().min(0).max(200),
  exam: z.string().max(60),
  year: z.number().int().min(1990).max(2100).nullable(),
  difficulty: z.number().int().min(1).max(3),
  publish: z.boolean(),
  drafts: z.array(DraftIn).min(1).max(400),
});
export type CommitInput = z.input<typeof Commit>;
export type CommitState = { error?: string; created?: number; skipped?: string[] } | undefined;

// Step 2: save the reviewed questions. Each one is checked again on the server.
export async function commitQuestionDrafts(input: CommitInput): Promise<CommitState> {
  const me = await requireStaff("questions");
  const parsed = Commit.safeParse(input);
  if (!parsed.success) return { error: "Some questions have invalid values. Check the highlighted ones." };
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
      : d.format === "SINGLE" ? d.correctIndex >= options.length
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
      exam: c.exam || null,
      year: c.type === "PYQ" ? c.year : null,
      difficulty: c.difficulty,
      isPublished: c.publish,
    }];
  });
  if (!rows.length) return { error: "None of the questions are complete enough to import.", skipped };
  await db.question.createMany({ data: rows });
  await audit(me, "question.import", `Imported ${rows.length} ${c.type} questions from a file into “${chapter.title}”${skipped.length ? ` (${skipped.length} skipped)` : ""}`, { entity: "chapter", id: c.chapterId });
  revalidatePath(`/admin/chapters/${c.chapterId}`);
  revalidatePath("/admin/questions");
  return { created: rows.length, skipped };
}
