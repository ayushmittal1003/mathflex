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
  // Where it came from, e.g. "Set 2 · Q3" when one file holds several DPPs.
  label?: string;
  prompt: string;
  options: string[];
  format: "SINGLE" | "MULTIPLE" | "NUMERICAL";
  correctIndex: number; // -1 = no answer found yet
  correctIndices: number[];
  numericAnswer: number | null;
  tolerance: number;
  solution: string;
  // Picked up from a tag like “(JEE Main 2021)” in the question text, if there is one.
  exam?: string;
  year?: number;
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
  const paren = `\\(${l}\\)[.:]?`; // (a)  (a).  (a):
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

// ---- exam / year tags -----------------------------------------------------------------------

const EXAM_WORDS = /\b(JEE|IIT|AIEEE|BITSAT|CBSE|NEET|KVPY|ISC|ICSE|Main|Mains|Advanced|Board)\b/i;
const TAG = /[(\[]\s*([^()\[\]\n]{0,70}?)\b((?:19[89]\d|20[0-4]\d))\b([^()\[\]\n]{0,45}?)\s*[)\]]/g;

// Finds one “(JEE Main 2021)” / “[2019, JEE Advanced]” tag, returns it and the text without it.
export function pullExamTag(text: string): { text: string; exam?: string; year?: number } {
  let found: { at: number; len: number; exam: string; year: number } | null = null;
  for (const m of text.matchAll(TAG)) {
    const rest = `${m[1]} ${m[3]}`.replace(/\b(shift|session|slot|morning|evening|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\b.*$/i, "").replace(/[,;:\-–]+/g, " ").replace(/\b\d{1,2}\b/g, "").replace(/\s+/g, " ").trim();
    if (!EXAM_WORDS.test(rest) && rest.length > 0) continue; // e.g. "(x = 2020)" is not a tag
    // A bare "(2019)" only counts at the very start or end of the question, not mid-sentence.
    const atEdge = m.index! <= 1 || m.index! + m[0].length >= text.trim().length - 1;
    if (!rest && !atEdge) continue;
    found = { at: m.index!, len: m[0].length, exam: rest.replace(/\bMains\b/i, "Main"), year: Number(m[2]) };
  }
  if (!found) return { text };
  return { text: `${text.slice(0, found.at)} ${text.slice(found.at + found.len)}`.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").trim(), exam: found.exam || undefined, year: found.year };
}

// ---- main ---------------------------------------------------------------------------------

// Page headers/footers repeat on every page ("www.site.com", "Page | 2", "ALL RIGHTS RESERVED").
// Drop short lines that occur 3+ times, except section headings.
function dropBoilerplate(text: string) {
  const lines = text.split("\n");
  const count = new Map<string, number>();
  for (const l of lines) { const k = l.trim(); if (k) count.set(k, (count.get(k) ?? 0) + 1); }
  return lines
    .filter((l) => {
      const k = l.trim();
      if (!k) return true;
      if (/^page\s*\|?\s*\d+(\s*(of|\/)\s*\d+)?$/i.test(k)) return false;
      if (/^solutions?\s+(of|to|for)\b/i.test(k) || /^(?:[A-Z][\w &-]*\s)?DPP\s*#?\s*\d+$/i.test(k)) return false; // set titles
      if (new RegExp(SECTION.source, "im").test(k)) return true;
      return !((count.get(k) ?? 0) >= 3 && k.length < 120);
    })
    .join("\n");
}

// Section headings that say how the following questions are answered.
const SECTION = /^[ \t]*(?:section\s*[-–:]?\s*[A-Z0-9]+\s*[-–:]?\s*)?(single\s*(?:choice|correct)|only\s*one\s*(?:option\s*)?(?:is\s*)?correct|one\s*or\s*more|more\s*than\s*one|multiple\s*(?:choice|correct)|multi[-\s]*correct|subjective|integer|numerical|comprehension|paragraph|assertion|match(?:ing|\s*the)?)\b[^\n]*$/gim;
function sectionHint(h: string): Draft["format"] | null {
  const t = h.toLowerCase();
  if (/one\s*or\s*more|more\s*than\s*one|multiple|multi/.test(t)) return "MULTIPLE";
  if (/single|only\s*one/.test(t)) return "SINGLE";
  if (/subjective|integer|numerical/.test(t)) return "NUMERICAL";
  return null;
}

// "Solution 3:", "Sol. 3", "Ans 3)", "Solution to Q.3 -" at the start of a line.
const SOL_START = /^[ \t]*(?:Solution|Sol|Ans(?:wer)?|Hint)s?[ \t]*\.?[ \t]*(?:to[ \t]*)?(?:Q(?:uestion)?[ \t]*\.?[ \t]*)?(\d{1,3})[ \t]*[:.)\-–][ \t]*/gim;

type Ev = { at: number; end: number; kind: "q" | "sol" | "sec"; n: number; hint?: Draft["format"] | null };

// "(c) ...", "(a, d) ...", "(6) ...", "Ans: B ..." at the start of a solution: the answer, then the working.
function leadingAnswer(body: string): { answerRaw: string; rest: string } {
  const paren = /^\s*(?:Ans(?:wer)?\s*[:.\-]?\s*)?\(([^()\n]{1,24})\)\s*/i.exec(body);
  if (paren && parseAnswerValue(paren[1], true)) return { answerRaw: paren[1], rest: body.slice(paren[0].length) };
  const bare = /^\s*(?:Ans(?:wer)?|Correct\s*(?:option|answer)?)\s*[:.\-]?\s*([A-Da-d](?:\s*[,&]\s*[A-Da-d])*|-?\d+(?:\.\d+)?)\b\s*/i.exec(body);
  if (bare) return { answerRaw: bare[1], rest: body.slice(bare[0].length) };
  const line = ANSWER_LINE.exec(body);
  return { answerRaw: line?.[1] ?? "", rest: body };
}

// Group numbered items into sets: numbering going back to 1 (or down) starts a new set, as when
// one file holds DPP #1, DPP #2, ... each starting at Q.1.
function groupSets<T extends { n: number; head: string; body: string }>(items: T[]): T[][] {
  const sets: T[][] = [];
  for (const it of items) {
    const cur = sets.at(-1);
    const last = cur?.at(-1);
    if (!cur || (it.n === 1 && last && last.n >= 1)) sets.push([it]);
    else if (it.n === last!.n + 1) cur.push(it);
    // Anything else is a number inside the text (e.g. a formula line "4 )100 is"): put it back.
    else last!.body = `${last!.body}\n${it.head}${it.body}`.trim();
  }
  return sets;
}

export function parseQuestions(questionsText: string, solutionsText = ""): { drafts: Draft[]; warnings: string[] } {
  const warnings: string[] = [];
  // Solutions in a separate file are read as if they came after the questions.
  const SPLIT = "@@MATHFLEX_SOLUTIONS_FILE@@";
  const text = dropBoilerplate(normalise(solutionsText ? `${questionsText}\n\n${SPLIT}\n\n${solutionsText}` : questionsText));
  const mainEnd = solutionsText ? text.indexOf(SPLIT) : Infinity;

  // 1. Every event in document order.
  const evs: Ev[] = [];
  for (const m of text.matchAll(SOL_START)) evs.push({ at: m.index!, end: m.index! + m[0].length, kind: "sol", n: Number(m[1]) });
  for (const m of text.matchAll(SECTION)) evs.push({ at: m.index!, end: m.index! + m[0].length, kind: "sec", n: 0, hint: sectionHint(m[1]) });
  for (const m of text.matchAll(START)) {
    const at = m.index!;
    if (evs.some((e) => e.kind === "sol" && e.at === at)) continue;
    evs.push({ at, end: at + m[0].length, kind: "q", n: Number(m[1] ?? m[2]) });
  }
  evs.sort((a, b) => a.at - b.at);

  // 2. Questions and solutions as separate streams. A numbered line inside a solution belongs to the
  //    solution unless it is a new "Q.1" (the next set of questions starting).
  type Item = { n: number; at: number; head: string; body: string; hint: Draft["format"] | null };
  const qs: Item[] = [];
  const sols: Item[] = [];
  let hint: Draft["format"] | null = null;
  let inSol = false;
  for (let i = 0; i < evs.length; i++) {
    const e = evs[i];
    if (e.kind === "sec") { hint = e.hint ?? null; inSol = false; continue; }
    // Everything in a separate solutions file is a solution, however it's numbered ("1. Ans: B").
    if (e.kind === "q" && e.at > mainEnd) e.kind = "sol";
    if (e.kind === "q" && inSol && e.n !== 1 && !/^[ \t]*Q/i.test(text.slice(e.at, e.end))) continue;
    // body runs to the next event that isn't swallowed by this item
    let j = i + 1;
    while (j < evs.length && evs[j].kind === "q" && e.kind === "sol" && evs[j].at < mainEnd && evs[j].n !== 1 && !/^[ \t]*Q/i.test(text.slice(evs[j].at, evs[j].end))) j++;
    const body = text.slice(e.end, j < evs.length ? evs[j].at : text.length).trim();
    const head = text.slice(e.at, e.end);
    if (e.kind === "sol") { sols.push({ n: e.n, at: e.at, head, body, hint: null }); inSol = true; }
    else { qs.push({ n: e.n, at: e.at, head, body, hint }); inSol = false; }
  }

  // The old layouts: "Answer Key" / "Solutions" heading at the end, or a separate key file.
  let key = new Map<number, KeyEntry>();
  if (!sols.length) {
    const sec = /\n[ \t]*(?:Answer\s*Keys?|Answers?|Solutions?|Hints?\s*(?:&|and)\s*Solutions?)\s*[:\-]?\s*\n/gi;
    let cut = -1;
    for (const m of text.matchAll(sec)) cut = m.index!;
    const from = cut > text.length * 0.4 ? cut : -1;
    if (from >= 0 && from < text.length) {
      key = parseKey(text.slice(from));
      for (let k = qs.length - 1; k >= 0; k--) if (qs[k].at >= from) qs.splice(k, 1);
    }
  }

  const qSets = groupSets(qs);
  const sSets = groupSets(sols);
  if (!qSets.length) warnings.push("No numbered questions were found. Questions should start with 1., Q1), Q.1: or similar.");

  // 3. Which solutions belong to which questions: the same count in the same order, or else each
  //    set of solutions goes with the nearest set of questions before it.
  const solFor = new Map<number, Item[]>();
  if (sSets.length === qSets.length) sSets.forEach((ss, k) => solFor.set(k, ss));
  else for (const ss of sSets) {
    let k = -1;
    qSets.forEach((qset, idx) => { if (qset[0].at < ss[0].at && !solFor.has(idx)) k = idx; });
    if (k >= 0) solFor.set(k, ss);
  }
  const multi = qSets.length > 1;
  if (multi) {
    const missing = qSets.map((_, k) => k).filter((k) => !solFor.has(k) && !key.size);
    if (missing.length) warnings.push(`No answers were found in the text for set${missing.length > 1 ? "s" : ""} ${missing.map((k) => k + 1).join(", ")}. If those solutions are pictures in the PDF, use “Read with AI”, or upload them as a separate solutions file.`);
  }

  const drafts: Draft[] = [];
  qSets.forEach((set, k) => {
    const solMap = new Map((solFor.get(k) ?? []).map((x) => [x.n, x]));
    for (const item of set) {
      const w: string[] = [];
      const opts = findOptions(item.body);
      let prompt: string;
      let options: string[] = [];
      let rest: string;
      if (opts) ({ prompt, options, rest } = opts);
      else {
        const stop = item.body.search(/\n[ \t]*(?:Correct\s+)?(?:Answer|Ans|Key|Solution|Sol|Explanation|Exp|Hint)\b/i);
        prompt = (stop === -1 ? item.body : item.body.slice(0, stop)).trim();
        rest = stop === -1 ? "" : item.body.slice(stop);
      }
      const own = splitTail(rest);
      const sol = solMap.get(item.n);
      const lead = sol ? leadingAnswer(sol.body) : { answerRaw: "", rest: "" };
      const fromKey = key.get(item.n);
      const answerRaw = own.answerRaw || lead.answerRaw || fromKey?.answerRaw || "";
      const solRest = lead.rest.trim();
      const solution = own.solution || (sol ? SOLUTION_RE.exec(`\n${solRest}`)?.[1]?.trim() || solRest.replace(SPLIT, "").trim() : "") || fromKey?.solution || "";
      const ans = answerRaw ? parseAnswerValue(answerRaw, options.length > 0) : null;

      const tag = pullExamTag(prompt);
      prompt = tag.text;
      const d: Draft = { n: item.n, label: multi ? `Set ${k + 1} · Q${item.n}` : undefined, prompt, exam: tag.exam, year: tag.year, options, format: "SINGLE", correctIndex: -1, correctIndices: [], numericAnswer: null, tolerance: 0, solution, warnings: w };
      if (!options.length) {
        d.format = "NUMERICAL";
        if (ans?.kind === "number") { d.numericAnswer = ans.value; d.tolerance = ans.tolerance; }
        else w.push(answerRaw ? `The answer “${answerRaw.trim()}” isn't a number, so it can't be auto-graded.` : "No numeric answer found.");
      } else if (ans?.kind === "letters") {
        if (item.hint === "MULTIPLE" || ans.picks.length > 1) { d.format = "MULTIPLE"; d.correctIndices = ans.picks; }
        else d.correctIndex = ans.picks[0];
      } else {
        if (item.hint === "MULTIPLE") d.format = "MULTIPLE";
        w.push(ans?.kind === "number" ? `The answer “${answerRaw.trim()}” isn't one of the options.` : "No answer found.");
      }
      if (!d.solution) w.push("No explanation found.");
      if (d.prompt.length < 4) w.push("The question text looks empty.");
      drafts.push(d);
    }
  });

  if (key.size && !drafts.some((d) => key.has(d.n))) warnings.push("An answer key was found but its question numbers don't match the questions.");
  return { drafts, warnings };
}
