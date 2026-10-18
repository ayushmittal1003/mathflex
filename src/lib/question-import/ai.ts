import "server-only";
import { claude, claudeConfigured, FALLBACK_BETA } from "../flexcare";
import { getSettings } from "../settings";
import { parseAnswerValue, type Draft } from "./parse";
import { fileKind, type Source } from "./extract";

// Optional: let Claude read a PDF, Word-exported PDF or photo of questions (scans, handwriting,
// formulas) and return them in the same draft shape as the text parser. Costs a few cents per file.

type Raw = { n?: number; prompt?: string; options?: string[]; answer?: string; solution?: string };

export async function extractWithAi(file: Source, solutionsFile?: Source | null): Promise<{ drafts: Draft[]; warnings: string[] }> {
  if (!claudeConfigured()) throw new Error("AI reading needs ANTHROPIC_API_KEY to be set on the server.");
  const toBlock = async (f: Source) => {
    const data = f.buf.toString("base64");
    const kind = fileKind(f.name, f.mime);
    if (kind !== "pdf" && kind !== "image") throw new Error("AI reading works on PDFs and photos. For Word files, untick “Read with AI”.");
    return kind === "pdf"
      ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data } } as const)
      : ({ type: "image", source: { type: "base64", media_type: (f.mime || "image/jpeg") as "image/png" | "image/jpeg" | "image/webp", data } } as const);
  };
  const content = [
    await toBlock(file),
    ...(solutionsFile ? [await toBlock(solutionsFile)] : []),
    {
      type: "text" as const,
      text: `The first file${solutionsFile ? " (and the second, which has the solutions)" : ""} contains JEE maths practice questions. Extract EVERY question exactly as written, without solving or changing them.
Write maths in plain text (x^2, √, ∫, π, lim x→0). Return ONLY a JSON array, no commentary, where each item is:
{"n": <question number>, "prompt": "<question text>", "options": ["<A>","<B>","<C>","<D>"], "answer": "<letter(s) like B or A,C, or the number for numerical questions, or empty if not given>", "solution": "<worked solution or explanation if given, else empty>"}
Use an empty options array for questions with no options (numerical answer). Do not include option letters inside the option strings.`,
    },
  ];
  const res = await claude().beta.messages.create({
    model: (await getSettings()).chatbot.model,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    messages: [{ role: "user", content }],
  });
  if (res.stop_reason === "refusal") throw new Error("The AI declined to read this file.");
  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  let rows: Raw[];
  try {
    rows = JSON.parse(text.slice(start, end + 1)) as Raw[];
  } catch {
    throw new Error("The AI's answer couldn't be read. Try a smaller or clearer file.");
  }
  const warnings: string[] = [];
  if (res.stop_reason === "max_tokens") warnings.push("The file was long and the AI stopped early. Some questions at the end may be missing, so split the file and import the rest.");
  const drafts = rows.map((r, i): Draft => {
    const options = (r.options ?? []).map((o) => String(o).trim()).filter(Boolean).slice(0, 6);
    const w: string[] = [];
    const ans = r.answer ? parseAnswerValue(String(r.answer), options.length > 0) : null;
    const d: Draft = { n: r.n ?? i + 1, prompt: String(r.prompt ?? "").trim(), options, format: "SINGLE", correctIndex: 0, correctIndices: [], numericAnswer: null, tolerance: 0, solution: String(r.solution ?? "").trim(), warnings: w };
    if (!options.length) {
      d.format = "NUMERICAL";
      if (ans?.kind === "number") { d.numericAnswer = ans.value; d.tolerance = ans.tolerance; } else w.push("No numeric answer found.");
    } else if (ans?.kind === "letters") {
      if (ans.picks.length === 1) d.correctIndex = ans.picks[0];
      else { d.format = "MULTIPLE"; d.correctIndices = ans.picks; }
    } else w.push("No answer found. Pick the correct option before importing.");
    if (!d.solution) w.push("No explanation found.");
    return d;
  });
  return { drafts, warnings };
}
