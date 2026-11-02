import { z } from "zod";

// What the review screen sends when importing. Checked again on the server.
const DraftIn = z.object({
  prompt: z.string().trim().min(1).max(8000),
  options: z.array(z.string().trim().max(1000)).max(6),
  format: z.enum(["SINGLE", "MULTIPLE", "NUMERICAL"]),
  // -1 = no single correct option (numerical and several-correct questions).
  correctIndex: z.number().int().min(-1).max(5),
  correctIndices: z.array(z.number().int().min(0).max(5)).max(6),
  numericAnswer: z.number().finite().nullable(),
  tolerance: z.number().finite().min(0),
  solution: z.string().max(12000),
  topic: z.string().trim().max(80).optional(),
  difficulty: z.number().int().min(1).max(3).optional(),
  exam: z.string().trim().max(60).optional(),
  year: z.number().int().min(1990).max(2100).nullable().optional(),
});
export const Commit = z.object({
  chapterId: z.string().min(1),
  type: z.enum(["DPP", "PYQ"]),
  partOrder: z.number().int().min(0).max(200),
  exam: z.string().max(60),
  year: z.number().int().min(1990).max(2100).nullable(),
  difficulty: z.number().int().min(1).max(3),
  publish: z.boolean(),
  drafts: z.array(DraftIn).min(1).max(400),
  // PDFs stored at preview time, to list for download. Only our own /api/files/resources/ URLs.
  kept: z.array(z.object({ url: z.string().regex(/^\/api\/files\/resources\/[\w-]+\.pdf$/), size: z.number().int().min(0), mimeType: z.literal("application/pdf"), name: z.string().max(200) })).max(2).default([]),
});

export type CommitInput = z.input<typeof Commit>;

// A readable reason, naming the question, instead of a generic "invalid values".
export function describeCommitIssue(issues: { path: PropertyKey[]; message: string }[]) {
  const first = issues[0];
  if (!first) return "Some questions have invalid values.";
  if (first.path[0] === "drafts" && typeof first.path[1] === "number") {
    return `Question ${first.path[1] + 1} couldn't be saved: ${String(first.path[2] ?? "value")} is not valid (${first.message}).`;
  }
  return `The import couldn't be saved: ${first.path.join(".") || "request"} is not valid (${first.message}).`;
}
