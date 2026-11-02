// The MathFlex question file format: one plain-text file, one block per question, maths in LaTeX.
// Read strictly so a correct file imports completely and a wrong one says exactly what to fix
// ("Question 7, line 112: answer is missing"). No guessing. The guide is at /admin/question-format.
import katex from "katex";
import { parseAnswerValue, type Draft } from "./parse";

export type TemplateIssue = { question: number; line: number; message: string };
export type TemplateResult = { drafts: Draft[]; errors: TemplateIssue[]; warnings: TemplateIssue[] };

type Key = "exam" | "year" | "type" | "difficulty" | "topic";
const OPTION_START = /^\s*\(?([A-F])[).]\s+(.*)$/;
const LETTERS = "ABCDEF";

// True when the text looks like a MathFlex-format file rather than a loose document.
export function isTemplateFile(text: string) {
  if (/^\s*format:\s*mathflex/im.test(text)) return true;
  return /^---+\s*$/m.test(text) && (text.match(/^answer:/gim)?.length ?? 0) >= 1;
}

function difficultyOf(v: string): number | null {
  const t = v.trim().toLowerCase();
  if (["1", "easy"].includes(t)) return 1;
  if (["2", "medium", "moderate"].includes(t)) return 2;
  if (["3", "hard", "difficult"].includes(t)) return 3;
  return null;
}

// Odd number of unescaped $ means a maths section was opened and never closed.
const unbalanced = (s: string) => ((s.replace(/\\\$/g, "").match(/\$\$/g)?.length ?? 0) % 2 === 1) || (((s.replace(/\\\$/g, "").replace(/\$\$/g, "").match(/\$/g)?.length ?? 0) % 2) === 1);

const texOk = (src: string, display: boolean) => {
  try {
    katex.renderToString(src, { displayMode: display, throwOnError: true, strict: "ignore" });
    return true;
  } catch {
    return false;
  }
};

// Maths between dollar signs, line breaks allowed (PDFs wrap long lines inside formulas).
const MATH_ANY = /\$\$([\s\S]+?)\$\$|(?<!\\)\$(?!\s)((?:\\.|[^$\\])+?)\$/g;

// A line break inside a formula is either a wrapped space or a word cut in half ("\\time" + "s").
// Try a space first, then no space, and keep whichever the maths engine accepts.
export function healMath(text: string) {
  return text.replace(MATH_ANY, (whole, display: string | undefined, inline: string | undefined) => {
    const src = display ?? inline ?? "";
    if (!src.includes("\n")) return whole;
    const isDisplay = display !== undefined;
    const fix = (joined: string) => (isDisplay ? `$$${joined}$$` : `$${joined}$`);
    const parts = src.split("\n");
    let out = parts[0];
    for (let k = 1; k < parts.length; k++) {
      const rest = parts.slice(k + 1).join(" ");
      out += texOk(`${out} ${parts[k]} ${rest}`, isDisplay) ? ` ${parts[k]}` : parts[k];
    }
    return fix(out);
  });
}

// Formulas the maths engine can't read, to report before anything goes live.
export function badMath(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(MATH_ANY)) {
    const src = m[1] ?? m[2] ?? "";
    if (!texOk(src, m[1] !== undefined)) out.push(src.trim().slice(0, 60));
  }
  return out;
}

// PDFs turn every wrapped line into a line break: put paragraphs back together.
const reflow = (t: string) => t.replace(/([^\n])\n(?!\n)(?!\$\$)/g, (_m, c: string) => (c === "$" ? `${c}\n` : `${c} `));

export function parseTemplate(raw: string, opts: { fromPdf?: boolean } = {}): TemplateResult {
  const text = raw.replace(/\r\n?/g, "\n").replace(/[  ]/g, " ");
  const lines = text.split("\n");
  const errors: TemplateIssue[] = [];
  const warnings: TemplateIssue[] = [];
  const drafts: Draft[] = [];

  // Split into blocks at lines made only of "---".
  const blocks: { start: number; lines: string[] }[] = [];
  let cur: { start: number; lines: string[] } = { start: 1, lines: [] };
  lines.forEach((l, i) => {
    if (/^---+\s*$/.test(l)) {
      blocks.push(cur);
      cur = { start: i + 2, lines: [] };
    } else cur.lines.push(l);
  });
  blocks.push(cur);

  const seen = new Map<string, number>();
  for (const block of blocks) {
    const body = block.lines;
    if (!body.some((l) => l.trim())) continue;
    // A leading block with only file-level fields (format:, title:, notes) is not a question.
    const isFileHeader = !body.some((l) => /^answer:/i.test(l.trim())) && body.every((l) => !l.trim() || /^(format|title|chapter|source|#)/i.test(l.trim()));
    if (isFileHeader) continue;

    const qNo = drafts.length + 1;
    const at = (idx: number) => block.start + idx;
    const err = (idx: number, message: string) => errors.push({ question: qNo, line: at(idx), message });
    const warn = (idx: number, message: string) => warnings.push({ question: qNo, line: at(idx), message });

    let i = 0;
    const skipBlank = () => { while (i < body.length && !body[i].trim()) i++; };
    skipBlank();
    if (/^Q\s*\.?\s*\d+\s*[.):]?\s*$/i.test(body[i] ?? "")) i++; // "Q12" label (the label is ignored)

    // 1. Details lines at the top: exam:, year:, type:, difficulty:, topic:
    const meta: Partial<Record<Key, { v: string; idx: number }>> = {};
    for (;;) {
      skipBlank();
      const m = /^(exam|year|type|difficulty|topic)\s*:\s*(.*)$/i.exec(body[i] ?? "");
      if (!m) break;
      meta[m[1].toLowerCase() as Key] = { v: m[2].trim(), idx: i };
      i++;
    }

    // 2. Question text, up to the first option or the answer line.
    const stmtFrom = i;
    while (i < body.length && !OPTION_START.test(body[i]) && !/^answer\s*:/i.test(body[i].trim()) && !/^solution\s*:/i.test(body[i].trim())) i++;
    const stmtEnd = i;
    const tidy = (t: string) => {
      const healed = healMath(t.trim());
      return opts.fromPdf ? reflow(healed) : healed;
    };
    const statement = tidy(body.slice(stmtFrom, i).join("\n"));
    if (!statement) err(stmtFrom, "the question text is empty");

    // 3. Options: each on its own line, A, B, C, D (up to F), in order.
    const options: string[] = [];
    while (i < body.length && OPTION_START.test(body[i])) {
      const m = OPTION_START.exec(body[i])!;
      if (m[1] !== LETTERS[options.length]) {
        err(i, `options must go in order A, B, C, D: expected ${LETTERS[options.length]} but found ${m[1]}`);
        break;
      }
      let optText = m[2];
      i++;
      // lines that continue this option (not another option / answer / solution)
      while (i < body.length && body[i].trim() && !OPTION_START.test(body[i]) && !/^(answer|solution)\s*:/i.test(body[i].trim())) {
        optText += `\n${body[i].trim()}`;
        i++;
      }
      options.push(tidy(optText));
      skipBlank();
    }

    // 4. answer: and solution:
    let answerRaw: string | null = null;
    let answerIdx = i;
    let solution = "";
    let solutionIdx = -1;
    while (i < body.length) {
      const t = body[i].trim();
      const a = /^answer\s*:\s*(.*)$/i.exec(t);
      const s = /^solution\s*:\s*(.*)$/i.exec(t);
      if (a && answerRaw === null) { answerRaw = a[1].trim(); answerIdx = i; i++; continue; }
      if (s) {
        solutionIdx = i;
        solution = tidy([s[1], ...body.slice(i + 1)].join("\n"));
        i = body.length;
        break;
      }
      if (t) warn(i, `unexpected text after the options: "${t.slice(0, 50)}". Put the explanation under "solution:"`);
      i++;
    }

    // 5. Work out the type and check everything
    const typeWord = meta.type?.v.toLowerCase();
    const known = ["single", "multiple", "numerical", "mcq", "integer", "numeric"];
    if (typeWord && !known.includes(typeWord)) err(meta.type!.idx, `type must be single, multiple or numerical (found "${meta.type!.v}")`);
    let format: Draft["format"] = options.length ? "SINGLE" : "NUMERICAL";
    if (typeWord === "multiple") format = "MULTIPLE";
    if (typeWord === "numerical" || typeWord === "numeric" || typeWord === "integer") format = "NUMERICAL";
    if (typeWord === "single" || typeWord === "mcq") format = "SINGLE";

    const d: Draft = { n: qNo, prompt: statement, options: format === "NUMERICAL" ? [] : options, format, correctIndex: -1, correctIndices: [], numericAnswer: null, tolerance: 0, solution, warnings: [] };

    if (format === "NUMERICAL") {
      if (options.length) err(stmtEnd, "a numerical question must not have options (remove them, or set type: single)");
    } else if (options.length < 2) err(Math.min(i, body.length - 1), "this question needs at least 2 options written as (A) ... (B) ...");

    if (answerRaw === null || answerRaw === "") err(Math.min(answerIdx, body.length - 1), 'the "answer:" line is missing');
    else if (format === "NUMERICAL") {
      const a = parseAnswerValue(answerRaw, false);
      if (a?.kind === "number") { d.numericAnswer = a.value; d.tolerance = a.tolerance; } else err(answerIdx, `a numerical answer must be a number, like 12 or 3.5 (found "${answerRaw}")`);
    } else {
      const a = parseAnswerValue(answerRaw, true);
      const picks = a?.kind === "letters" ? a.picks : [];
      if (!picks.length) err(answerIdx, `answer must be option letters like A or A, C (found "${answerRaw}")`);
      else if (picks.some((p) => p >= options.length)) err(answerIdx, `answer "${answerRaw}" points at an option that doesn't exist (there are ${options.length} options)`);
      else if (format === "SINGLE" && picks.length > 1) err(answerIdx, `a single-answer question has one correct option, but the answer is "${answerRaw}". Use type: multiple`);
      else if (format === "SINGLE") d.correctIndex = picks[0];
      else d.correctIndices = picks;
    }

    if (meta.year) {
      const y = Number(meta.year.v);
      if (!Number.isInteger(y) || y < 1990 || y > 2100) err(meta.year.idx, `year must be a 4-digit year like 2023 (found "${meta.year.v}")`);
      else d.year = y;
    }
    if (meta.exam?.v) d.exam = meta.exam.v.slice(0, 60);
    if (meta.topic?.v) d.topic = meta.topic.v.slice(0, 80);
    if (meta.difficulty) {
      const df = difficultyOf(meta.difficulty.v);
      if (df === null) err(meta.difficulty.idx, `difficulty must be easy, medium or hard (found "${meta.difficulty.v}")`);
      else d.difficulty = df;
    }

    if (!solution) warn(Math.max(solutionIdx, 0), 'no explanation: add a "solution:" section so students can learn from it');
    for (const [label, t] of [["question", statement], ...options.map((o, k) => [`option ${LETTERS[k]}`, o]), ["solution", solution]] as [string, string][]) {
      if (t && unbalanced(t)) warn(0, `the ${label} has a "$" that is not closed: check the maths between dollar signs`);
      if (t.includes("[UNCLEAR]")) {
        err(0, `the ${label} is marked [UNCLEAR]: part of it couldn't be read from the source`);
        d.blocked = "Marked [UNCLEAR] in the file.";
      }
      for (const bad of t ? badMath(t) : []) {
        err(0, `the maths in the ${label} can't be read: "${bad}"`);
        d.blocked = "Some maths can't be read. Fix it in the file.";
      }
    }
    const key = statement.replace(/\s+/g, " ").toLowerCase();
    if (key && seen.has(key)) warn(0, `same question text as question ${seen.get(key)}`);
    else if (key) seen.set(key, qNo);

    drafts.push(d);
  }
  return { drafts, errors, warnings };

}
