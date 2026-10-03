import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { getSettings } from "./settings";
import { levelFromXp } from "./gamification";

// Server-side refusal fallback (Claude API). If the primary model declines, the
// API retries on a suitable fallback model instead of returning an empty answer.
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export function claudeConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;
export function claude() {
  client ??= new Anthropic();
  return client;
}

// Everything FlexCare knows about the platform, rebuilt from the DB. Ordering is
// deterministic so the prompt prefix stays byte-identical and hits the prompt cache.
export async function buildPlatformKnowledge() {
  const s = await getSettings();
  const [courses, chapters, resources, faqs, coupons] = await Promise.all([
    db.course.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: { chapters: { include: { chapter: { select: { title: true } } } } },
    }),
    db.chapter.findMany({
      where: { isPublished: true },
      orderBy: [{ classLevel: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
      include: { parts: { orderBy: { order: "asc" } }, _count: { select: { questions: true } } },
    }),
    db.resource.findMany({
      where: { isPublished: true, includeInChatbot: true, knowledgeText: { not: "" } },
      orderBy: { id: "asc" },
      include: { chapter: { select: { title: true } } },
    }),
    db.knowledgeEntry.findMany({ where: { isActive: true }, orderBy: { id: "asc" } }),
    db.coupon.findMany({ where: { isActive: true, isPublic: true }, orderBy: { id: "asc" } }),
  ]);

  const f = s.features;
  const lines: string[] = [];
  lines.push(`# ${s.siteName} platform facts`);
  lines.push(`Tagline: ${s.tagline}`);
  lines.push(`Support: email ${s.supportEmail}, WhatsApp +${s.whatsappNumber}.`);
  lines.push(
    `How learning works: each chapter is split into video parts. ${
      f.sequentialUnlock ? "Part N+1 unlocks after finishing Part N's video and its practice set (DPPs + PYQs for that part's topics)." : "All parts are open once purchased."
    } Finishing parts and questions earns XP; there are daily streaks, badges, ${f.leaderboard ? "a leaderboard, " : ""}and daily/weekly/monthly progress analytics.`,
  );
  if (f.mentorshipUpsell) lines.push(`Mentorship: ${s.mentorshipTitle} for ₹${s.mentorshipPrice}. ${s.mentorshipBlurb} Added at checkout.`);
  lines.push(`Payments: Cashfree (UPI, cards, netbanking, wallets).${s.gstPercent ? ` GST ${s.gstPercent}% extra.` : ""}`);

  lines.push(`\n## Course bundles`);
  for (const c of courses) {
    lines.push(`- ${c.title}: ₹${c.price} (MRP ₹${c.mrp}), ${c.validityDays} days validity. Includes ${c.chapters.length} chapters: ${c.chapters.map((x) => x.chapter.title).join(", ")}. Link: /courses/${c.slug}`);
  }

  lines.push(`\n## Individual chapters`);
  for (const ch of chapters) {
    const parts = ch.parts.map((p) => `Part ${p.order} "${p.title}"${p.topics.length ? ` (${p.topics.join(", ")})` : ""}${p.isFreePreview ? " [free preview]" : ""}`).join("; ");
    lines.push(
      `- Class ${ch.classLevel} · ${ch.title}: ₹${ch.price} (MRP ₹${ch.mrp}), ${ch.validityDays} days. JEE weightage ~${ch.jeeWeightage}%. ` +
        `${ch.parts.length} parts: ${parts || "coming soon"}. ${ch._count.questions} practice questions (DPPs + PYQs). ` +
        (ch.topTopics.length ? `Most asked JEE topics: ${ch.topTopics.join(", ")}. ` : "") +
        `Link: /chapter/${ch.slug}`,
    );
  }

  if (coupons.length) {
    lines.push(`\n## Live public offers`);
    for (const c of coupons) lines.push(`- Code ${c.code}: ${c.description || (c.type === "PERCENT" ? `${c.value}% off` : `₹${c.value} off`)}${c.minAmount ? ` (min order ₹${c.minAmount})` : ""}`);
  }

  if (faqs.length) {
    lines.push(`\n## FAQ`);
    for (const q of faqs) lines.push(`Q: ${q.question}\nA: ${q.answer}`);
  }

  if (resources.length) {
    lines.push(`\n## Short notes, formula sheets and mind maps (content)`);
    for (const r of resources) {
      lines.push(`### ${r.title}${r.chapter ? ` — ${r.chapter.title}` : ""} (${r.type.toLowerCase().replace("_", " ")})\n${r.knowledgeText}`);
    }
  }
  return lines.join("\n");
}

export async function buildUserContext(userId: string | undefined) {
  if (!userId) return "The student is not logged in. Encourage signing up when relevant; do not invent their progress.";
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      entitlements: { where: { expiresAt: { gt: new Date() } }, include: { chapter: true, course: true } },
      progress: { include: { part: { include: { chapter: { select: { title: true } } } } } },
    },
  });
  if (!user) return "";
  const [correct, total] = await Promise.all([
    db.attempt.count({ where: { userId, isCorrect: true } }),
    db.attempt.count({ where: { userId } }),
  ]);
  const lvl = levelFromXp(user.xp);
  const owned = user.entitlements.map((e) => `${e.chapter?.title ?? e.course?.title} (valid till ${e.expiresAt.toDateString()})`);
  const done = user.progress.filter((p) => p.videoDone && p.practiceDone).map((p) => `${p.part.chapter.title} – Part ${p.part.order}`);
  return [
    `# The student you're talking to`,
    `Name: ${user.name}. Class: ${user.classLevel ?? "not set"}. XP ${user.xp} (Level ${lvl.level} ${lvl.title}). Streak: ${user.streak} days (best ${user.bestStreak}).`,
    `Owns: ${owned.join("; ") || "nothing yet"}.`,
    `Completed parts: ${done.join("; ") || "none yet"}.`,
    `Practice accuracy: ${total ? Math.round((correct / total) * 100) : 0}% over ${total} questions.`,
  ].join("\n");
}

export function systemPrompt(botName: string, siteName: string) {
  return `You are ${botName}, the friendly help assistant inside ${siteName}, a Netflix-style maths learning platform for Class 11–12 students preparing for JEE and board exams.

Your jobs: answer questions about chapters, prices, bundles, offers, how the platform works, and the student's own progress; recommend what to study or buy next; and help with maths doubts at a Class 11–12 level.

Ground platform answers (prices, chapters, offers, policies, the student's progress) only in the facts below. If something isn't covered, say you're not sure and point them to support rather than guessing. For maths doubts, explain step by step, using the notes content below when it's relevant.

Style: you're talking to a 14–18 year old on a phone. Be warm, encouraging and brief — a few short sentences or a short list. Use plain text maths (x^2, √, ∫, π) rather than LaTeX. When you mention a chapter or course, include its link path (e.g. /chapter/limits) so the app can make it clickable.`;
}

// Turn an uploaded PDF or mind-map image into plain text the chatbot can learn from.
export async function extractKnowledge(file: Buffer, mimeType: string, title: string) {
  if (!claudeConfigured()) return "";
  const data = file.toString("base64");
  const source =
    mimeType === "application/pdf"
      ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data } } as const)
      : ({ type: "image", source: { type: "base64", media_type: mimeType as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data } } as const);

  const res = await claude().beta.messages.create({
    model: (await getSettings()).chatbot.model,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    messages: [
      {
        role: "user",
        content: [
          source,
          {
            type: "text",
            text: `This is "${title}", study material from a JEE maths course. Transcribe its content as clean plain-text notes a tutor could answer questions from: every definition, formula (in plain-text maths like x^2, √, ∫), theorem, standard result, shortcut and worked example, organised under headings. For a mind map, describe its hierarchy as a nested list. Output only the notes.`,
          },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal") return "";
  return res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
}
