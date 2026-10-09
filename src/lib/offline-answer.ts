import "server-only";
import { db } from "./db";
import { getSettings } from "./settings";
import { buildPlatformKnowledge, buildUserContext } from "./flexcare";

// Answers without an AI model: finds the passages of the team's own knowledge (FAQ, knowledge notes,
// chapters, prices, offers, uploaded notes) that best match the question and returns them.
// It retrieves; it cannot reason or solve maths, and says so when nothing fits.

const STOP = new Set("a an the is are was were be been am do does did can could will would should i you we they he she it my your our me us to of in on at for from with and or but if so as by this that these those what which who whom how when where why please tell about give want need get have has had there their them its into any some more most very just also than then too not no yes hi hello hey".split(" "));

const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, (m, _x, off) => (off >= 3 ? "" : m));
const tokens = (t: string) =>
  t.toLowerCase().split(/[^a-z0-9₹%]+/).filter((w) => w.length > 1 && !STOP.has(w)).map(stem);

type Chunk = { text: string; reply: string; toks: Set<string> };

async function buildChunks(): Promise<Chunk[]> {
  const [faqs, platform, s] = await Promise.all([db.knowledgeEntry.findMany({ where: { isActive: true } }), buildPlatformKnowledge(), getSettings()]);
  const raw: { text: string; reply: string }[] = [];
  for (const f of faqs) raw.push({ text: `${f.question}\n${f.answer}`, reply: f.answer });
  // The team's free-text notes: one chunk per paragraph.
  for (const para of s.chatbot.knowledge.split(/\n\s*\n/)) if (para.trim()) raw.push({ text: para.trim(), reply: para.trim() });
  // Platform facts: one chunk per bullet line, and per paragraph inside uploaded notes.
  for (const block of platform.split(/\n(?=#{1,3} )/)) {
    if (block.startsWith("## FAQ") || block.startsWith("## Notes from the team")) continue; // already added above
    for (const part of block.split(/\n\s*\n/)) {
      for (const line of part.split(/\n(?=- )/)) if (line.trim().length > 20) raw.push({ text: line.trim(), reply: line.trim().replace(/^- /, "") });
    }
  }
  return raw.map((r) => ({ ...r, toks: new Set(tokens(r.text)) }));
}

const MATHY = /(\bsolve\b|\bfind\b|\bevaluate\b|\bintegrate\b|\bdifferentiate\b|\bprove\b|\bsimplify\b|[=∫√∑π^]|\d\s*[+\-*/x×]\s*\d|\bsin\b|\bcos\b|\btan\b|\blog\b|\bdx\b)/i;
const GREETING = /^(hi|hello|hey|hii+|namaste|good (morning|evening|afternoon))\b/i;
const PROGRESS = /\b(my progress|how am i doing|my streak|my xp|my level|what have i (done|completed)|am i doing)\b/i;

export async function offlineAnswer(q: string, userId?: string) {
  const s = await getSettings();
  const help = `You can browse chapters on the home page, or reach the team at ${s.supportEmail} / WhatsApp +${s.whatsappNumber}.`;
  const text = q.trim();

  if (GREETING.test(text) && text.split(/\s+/).length <= 4) {
    return `Hi! I'm ${s.chatbot.name}. Ask me about chapters, prices, offers or how MathFlex works.`;
  }
  if (PROGRESS.test(text)) {
    return userId ? (await buildUserContext(userId)).replace(/^# .*\n/, "") : "Log in and I can show your progress, streak and XP.";
  }

  const chunks = await buildChunks();
  const qt = [...new Set(tokens(text))];
  if (qt.length) {
    // Rarer words count for more (simple IDF over the chunks).
    const df = (w: string) => chunks.reduce((n, c) => n + (c.toks.has(w) ? 1 : 0), 0);
    const weight = new Map(qt.map((w) => [w, Math.log(1 + chunks.length / (1 + df(w)))]));
    const total = [...weight.values()].reduce((a, b) => a + b, 0) || 1;
    const scored = chunks
      .map((c) => ({ c, score: qt.reduce((n, w) => n + (c.toks.has(w) ? weight.get(w)! : 0), 0) / total }))
      .filter((x) => x.score >= 0.34)
      .sort((a, b) => b.score - a.score);
    if (scored.length) {
      const top = scored.slice(0, 2).filter((x, i) => i === 0 || x.score >= scored[0].score * 0.8);
      return top.map((x) => x.c.reply).join("\n\n");
    }
  }

  if (MATHY.test(text)) {
    return `I can't solve maths problems right now. For doubts, try the practice sets inside your chapter, or ask the team: ${s.supportEmail} / WhatsApp +${s.whatsappNumber}.`;
  }
  return `I couldn't find that in what I know. ${help}`;
}
