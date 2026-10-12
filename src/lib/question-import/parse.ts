// Turns the plain text of a practice-problem file (from a PDF or Word document) into question drafts.
// Pure functions with no app imports, so they can be tested on their own.
//
// It understands the usual layouts:
//   1. Question text ...            Q1) / Q.1 / Question 1:
//   (A) ... (B) ... (C) ... (D) ... also A. / A) / (a) / (1) (2) (3) (4), on one line or several
//   Answer: B                       Ans. (c), Correct answer: A, C, or a number for numerical questions
//   Solution: ...                   Explanation / Sol. / Hint
// and an answer key or solutions section at the end, or in a separate file, matched by question number.

export type Draft = {
  n: number;
  prompt: string;
  options: string[];
  format: "SINGLE" | "MULTIPLE" | "NUMERICAL";
  correctIndex: number;
  correctIndices: number[];
  numericAnswer: number | null;
  tolerance: number;
  solution: string;
  warnings: string[];
};

const LETTERS = "ABCD";

// ---- text clean-up ---------------------------------------------------------------------------

export function normalise(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[   ]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[“”]/g, '"')
    .trim();
}

// ---- splitting into numbered blocks ----------------------------------------------------------

// "1." / "1)" / "Q1)" / "Q.1 text" / "Question 1:" at the start of a line.
const START = /^[ \t]*(?:Q(?:uestion)?\s*\.?\s*(\d{1,3})\s*[.):\-]?|(\d{1,3})\s*[.):\-])[ \t]*(?=\S)/gim;

// Keep only the matches that count up 1, 2, 3 ... so stray numbers inside a question are ignored.
function numberedBlocks(text: string, first = 1): { n: number; body: string }[] {
  const hits = [...text.matchAll(START)].map((m) => ({ n: Number(m[1] ?? m[2]), at: m.index!, len: m[0].length }));
  const picked: typeof hits = [];
  let want = first;
  for (const h of hits) {
    if (h.n === want) {
      picked.push(h);
      want++;
    }
  }
  return picked.map((h, i) => ({ n: h.n, body: text.slice(h.at + h.len, i + 1 < picked.length ? picked[i + 1].at : text.length).trim() }));
}

// ---- options -------------------------------------------------------------------------------

function markerRe(label: string, style: "paren" | "dot" | "both") {
  const l = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const paren = `\\(${l}\\)`;
  const dot = `${l}[.)]`;
  const body = style === "paren" ? paren : style === "dot" ? dot : `(?:${paren}|${dot})`;
  // must start a line or follow whitespace, and be followed by a space/newline
  return new RegExp(`(?:^|\\s)(${body})(?=\\s|$)`, "m");
}

function findOptions(body: string): { prompt: string; options: string[]; rest: string } | null {
  const sets: { labels: string[]; style: "paren" | "dot" | "both" }[] = [
    { labels: ["A", "B", "C", "D"], style: "both" },
    { labels: ["a", "b", "c", "d"], style: "both" },
    { labels: ["1", "2", "3", "4"], style: "paren" },
  ];
  for (const set of sets) {
    const marks: { at: number; len: number }[] = [];
    let from = 0;
    let ok = true;
    for (const label of set.labels) {
      const m = markerRe(label, set.style).exec(body.slice(from));
      if (!m) { ok = false; break; }
      const at = from + m.index + (m[0].length - m[1].length);
      marks.push({ at, len: m[1].length });
      from = at + m[1].length;
    }
    if (!ok) continue;
    const prompt = body.slice(0, marks[0].at).trim();
    // The last option ends where the answer / solution part starts.
    const tail = body.slice(marks[3].at + marks[3].len);
    const stop = tail.search(/\n[ \t]*(?:Correct\s+)?(?:Answer|Ans|Key|Solution|Sol|Explanation|Exp|Hint)\b/i);
    const lastEnd = stop === -1 ? tail.length : stop;
    const options = marks.map((mk, i) => {
      const end = i === 3 ? marks[3].at + marks[3].len + lastEnd : marks[i + 1].at;
      return body.slice(mk.at + mk.len, end).trim();
    });
    if (!prompt || options.some((o) => !o)) continue;
    return { prompt, options, rest: stop === -1 ? "" : tail.slice(stop) };
  }
  return null;
}

// ---- answers --------------------------------------------------------------------------------

type Answer =
  | { kind: "letters"; picks: number[] }
  | { kind: "number"; value: number; tolerance: number };

export function parseAnswerValue(raw: string, hasOptions: boolean): Answer | null {
  const v = raw.trim().replace(/[.;]+$/, "").replace(/^[\s:=\-–]+/, "").trim();
  if (!v) return null;
  // (A)  A  (a, c)  A,C  AC  A and C  (2)
  const letters = v.replace(/\band\b/gi, ",").replace(/[()\s,/&]+/g, "");
  if (/^[A-Da-d]{1,4}$/.test(letters)) {
    return { kind: "letters", picks: [...new Set(letters.toUpperCase().split("").map((c) => LETTERS.indexOf(c)))].sort((a, b) => a - b) };
  }
  if (hasOptions && /^\(?[1-4]\)?$/.test(v)) return { kind: "letters", picks: [Number(v.replace(/\D/g, "")) - 1] };
  const num = /^(-?\d+(?:\.\d+)?)(?:\s*(?:±|\+-|\+\/-)\s*(\d+(?:\.\d+)?))?$/.exec(v.replace(/,/g, ""));
  if (num) return { kind: "number", value: Number(num[1]), tolerance: num[2] ? Number(num[2]) : 0 };
  const frac = /^(-?\d+)\s*\/\s*(\d+)$/.exec(v);
  if (frac && Number(frac[2]) !== 0) return { kind: "number", value: Number(frac[1]) / Number(frac[2]), tolerance: 0.01 };
  return null;
}

const ANSWER_LINE = /(?:^|\n)[ \t]*(?:Correct\s+)?(?:Answer|Ans|Key)\s*[.:)\-–]*\s*([^\n]*)/i;
const SOLUTION_RE = /(?:^|\n)[ \t]*(?:Solution|Sol|Explanation|Exp|Hint)\s*[.:)\-–]*\s*([\s\S]*)$/i;

function splitTail(rest: string) {
  const ans = ANSWER_LINE.exec(rest);
  const sol = SOLUTION_RE.exec(rest);
  return { answerRaw: ans?.[1] ?? "", solution: (sol?.[1] ?? "").trim() };
}

// ---- answer key / solutions sections ----------------------------------------------------------

export type KeyEntry = { answerRaw?: string; solution?: string };

// Reads "1. B  2. C ..." style keys and "Solutions" blocks. Works on a separate file or the tail of the same one.
export function parseKey(text: string): Map<number, KeyEntry> {
  const out = new Map<number, KeyEntry>();
  const t = normalise(text);

  // 1) Solution blocks: numbered, containing an answer and/or explanation.
  for (const b of numberedBlocks(t)) {
    const tail = splitTail(`\n${b.body}`);
    const looksLikeKeyOnly = /^\(?[A-Da-d]\)?(?:\s*(?:,|&|and)\s*\(?[A-Da-d]\)?)*[\s.,;]*$/i.test(b.body.trim()) || /^-?\d+(\.\d+)?$/.test(b.body.trim());
    if (looksLikeKeyOnly) out.set(b.n, { answerRaw: b.body.trim() });
    else out.set(b.n, { answerRaw: tail.answerRaw || undefined, solution: tail.solution || (tail.answerRaw ? "" : b.body) || undefined });
  }

  // 2) Compact keys on one line: "1-B 2-C 3-A" or "1. (b) 2. (c)".
  const compact = /(?:^|[\s,;|])(\d{1,3})\s*[-.:)]?\s*\(?([A-Da-d](?:\s*,\s*[A-Da-d]){0,3}|-?\d+(?:\.\d+)?)\)?(?=[\s,;|]|$)/g;
  for (const m of t.matchAll(compact)) {
    const n = Number(m[1]);
    if (!out.get(n)?.answerRaw) out.set(n, { ...out.get(n), answerRaw: m[2] });
  }
  return out;
}

// ---- main ---------------------------------------------------------------------------------

export function parseQuestions(questionsText: string, solutionsText = ""): { drafts: Draft[]; warnings: string[] } {
  let text = normalise(questionsText);
  const warnings: string[] = [];

  // An answer-key / solutions section at the end of the same file.
  let keyText = solutionsText;
  const sec = /\n[ \t]*(?:Answer\s*Keys?|Answers?|Solutions?|Hints?\s*(?:&|and)\s*Solutions?)\s*[:\-]?\s*\n/gi;
  let cut = -1;
  for (const m of text.matchAll(sec)) cut = m.index!;
  if (cut > text.length * 0.4) {
    keyText = `${text.slice(cut)}\n${keyText}`;
    text = text.slice(0, cut);
  }
  const key = keyText.trim() ? parseKey(keyText) : new Map<number, KeyEntry>();

  const blocks = numberedBlocks(text);
  if (!blocks.length) warnings.push("No numbered questions were found. Questions should start with 1., 2., Q1) or similar.");

  const drafts = blocks.map(({ n, body }): Draft => {
    const w: string[] = [];
    const opts = findOptions(body);
    let prompt: string;
    let options: string[] = [];
    let rest: string;
    if (opts) {
      ({ prompt, options, rest } = opts);
    } else {
      const stop = body.search(/\n[ \t]*(?:Correct\s+)?(?:Answer|Ans|Key|Solution|Sol|Explanation|Exp|Hint)\b/i);
      prompt = (stop === -1 ? body : body.slice(0, stop)).trim();
      rest = stop === -1 ? "" : body.slice(stop);
    }
    const own = splitTail(rest);
    const fromKey = key.get(n);
    const answerRaw = own.answerRaw || fromKey?.answerRaw || "";
    const solution = own.solution || fromKey?.solution || "";
    const ans = answerRaw ? parseAnswerValue(answerRaw, options.length > 0) : null;

    const d: Draft = { n, prompt, options, format: "SINGLE", correctIndex: 0, correctIndices: [], numericAnswer: null, tolerance: 0, solution, warnings: w };
    if (!options.length) {
      d.format = "NUMERICAL";
      if (ans?.kind === "number") { d.numericAnswer = ans.value; d.tolerance = ans.tolerance; }
      else w.push("No options found and no numeric answer, so this can't be graded. Add the answer or delete the question.");
    } else if (ans?.kind === "letters") {
      if (ans.picks.length === 1) d.correctIndex = ans.picks[0];
      else { d.format = "MULTIPLE"; d.correctIndices = ans.picks; }
    } else if (ans?.kind === "number") {
      w.push(`The answer “${answerRaw.trim()}” isn't one of the options. Pick the correct option.`);
    } else {
      w.push("No answer found. Pick the correct option before importing.");
    }
    if (!solution) w.push("No explanation found.");
    if (prompt.length < 4) w.push("The question text looks empty.");
    return d;
  });

  if (key.size && !drafts.some((d) => key.has(d.n))) warnings.push("An answer key was found but its question numbers don't match the questions.");
  return { drafts, warnings };
}
