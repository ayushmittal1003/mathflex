// Seeds a fully browsable MathFlex: every chapter from the BRD, bundles, sample
// questions, coupons, banners, badges, FAQ and demo students for the leaderboard.
// Everything here is editable from /admin afterwards.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_BADGES } from "../src/lib/gamification";

const DEMO = process.env.NODE_ENV !== "production" && process.env.SEED_DEMO !== "false";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Public sample clip so the player works before real lectures are uploaded.
const SAMPLE_VIDEO = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";

const PALETTE: [string, string][] = [
  ["#FF2E63", "#7C3AED"],
  ["#FF8A3D", "#E11D48"],
  ["#0EA5E9", "#6366F1"],
  ["#10B981", "#0EA5E9"],
  ["#8B5CF6", "#EC4899"],
  ["#F59E0B", "#EF4444"],
  ["#14B8A6", "#4F46E5"],
  ["#EC4899", "#F97316"],
];

type Ch = { title: string; symbol: string; w: number; price?: number; trending?: boolean; featured?: boolean; low?: boolean; tagline?: string; topics?: string[] };

const CLASS_11: Ch[] = [
  { title: "Sets & Relations", symbol: "∈", w: 3 },
  { title: "Functions", symbol: "f(x)", w: 3.3, trending: true },
  { title: "Trigonometric Ratios & Identities", symbol: "θ", w: 3 },
  { title: "Trigonometric Equations", symbol: "tan", w: 2 },
  { title: "Quadratic Equations & Expressions", symbol: "x²", w: 3.3, trending: true },
  { title: "Complex Numbers", symbol: "i", w: 5, trending: true, featured: true, tagline: "Rotate, reflect and conquer the Argand plane. i² = −1 is just the beginning.", topics: ["Modulus & argument", "Cube roots of unity", "Locus in Argand plane"] },
  { title: "Sequence & Series", symbol: "Σ", w: 5, trending: true },
  { title: "Straight Lines", symbol: "m", w: 3.3 },
  { title: "Pair of Straight Lines", symbol: "∥", w: 1 },
  { title: "Circle", symbol: "○", w: 3.3 },
  { title: "Parabola", symbol: "∪", w: 2.5 },
  { title: "Ellipse", symbol: "e", w: 2 },
  { title: "Hyperbola", symbol: "×", w: 2 },
  { title: "Statistics", symbol: "σ", w: 3.3 },
  { title: "Principle of Mathematical Induction", symbol: "n+1", w: 0.5, price: 199 },
  { title: "Permutations & Combinations", symbol: "ⁿCᵣ", w: 3.3, trending: true },
  { title: "Binomial Theorem", symbol: "ⁿ", w: 3.3 },
  { title: "Mathematical Reasoning", symbol: "∴", w: 1, price: 199 },
  { title: "Inequalities", symbol: "≤", w: 1, price: 199 },
  {
    title: "Limits & Derivatives",
    symbol: "lim",
    w: 3.3,
    trending: true,
    featured: true,
    tagline: "From 0/0 panic to L'Hôpital power moves. The chapter every calculus topic stands on.",
    topics: ["Standard limits", "L'Hôpital's rule", "1^∞ form", "Derivative from first principles"],
  },
];

const CLASS_12: Ch[] = [
  { title: "Relations & Functions (Advanced)", symbol: "f∘g", w: 3 },
  { title: "Inverse Trigonometric Functions", symbol: "sin⁻¹", w: 2 },
  { title: "Matrices", symbol: "[A]", w: 3.3, trending: true },
  { title: "Determinants", symbol: "|A|", w: 3.3 },
  { title: "Continuity & Differentiability", symbol: "d/dx", w: 3.3 },
  { title: "Application of Derivatives", symbol: "f′", w: 5, trending: true },
  { title: "Indefinite Integrals", symbol: "∫", w: 3.3, trending: true },
  { title: "Definite Integrals", symbol: "∫ₐᵇ", w: 5, featured: true, tagline: "Properties, King's rule and the tricks that turn 10-minute questions into 90-second ones.", topics: ["King's property", "Leibniz rule", "Periodic integrals"] },
  { title: "Application of Integrals", symbol: "∮", w: 2 },
  { title: "Differential Equations", symbol: "dy", w: 3.3 },
  { title: "Vector Algebra", symbol: "v⃗", w: 5, trending: true },
  { title: "3D Geometry", symbol: "xyz", w: 6.7, trending: true, featured: true, tagline: "Lines, planes and shortest distances. The single highest-scoring chapter in JEE Main.", topics: ["Shortest distance between skew lines", "Angle between planes", "Image of a point"] },
  { title: "Probability", symbol: "P", w: 5, trending: true },
  { title: "Statistics (Advanced)", symbol: "μ", w: 2 },
  { title: "Linear Programming", symbol: "LPP", w: 0.5, price: 149, low: true },
];

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type Q = { prompt: string; options: string[]; correct: number; solution: string; type?: "DPP" | "PYQ"; difficulty?: number };

const LIMITS_QUESTIONS: Q[][] = [
  [
    { prompt: "lim (x→0) sin(3x) / x = ?", options: ["0", "1", "3", "1/3"], correct: 2, solution: "Write sin(3x)/x = 3 · sin(3x)/(3x). Since sin(t)/t → 1 as t → 0, the limit is 3." },
    { prompt: "lim (x→2) (x² − 4) / (x − 2) = ?", options: ["0", "2", "4", "Does not exist"], correct: 2, solution: "Factor: (x−2)(x+2)/(x−2) = x + 2 → 4." },
    { prompt: "lim (x→0) (1 − cos x) / x² = ?", options: ["0", "1/2", "1", "2"], correct: 1, solution: "1 − cos x = 2 sin²(x/2), so the expression is (1/2)·[sin(x/2)/(x/2)]² → 1/2." },
    { prompt: "lim (x→0) (e^(2x) − 1) / x = ?", options: ["1", "2", "e", "0"], correct: 1, type: "PYQ", solution: "(e^(2x) − 1)/x = 2 · (e^(2x) − 1)/(2x) → 2 · 1 = 2." },
  ],
  [
    { prompt: "lim (x→0) (1 + x)^(1/x) = ?", options: ["1", "e", "0", "∞"], correct: 1, solution: "This is the definition of e (a 1^∞ form)." },
    { prompt: "lim (x→∞) (1 + 2/x)^x = ?", options: ["e", "e²", "2", "1"], correct: 1, type: "PYQ", solution: "1^∞ form: limit = e^(lim x · 2/x) = e²." },
    { prompt: "lim (x→0) (tan x − x) / x³ = ?", options: ["1/3", "1/6", "0", "1"], correct: 0, difficulty: 3, solution: "tan x = x + x³/3 + …, so (tan x − x)/x³ → 1/3." },
    { prompt: "lim (x→0) (x − sin x) / x³ = ?", options: ["1/3", "1/6", "−1/6", "0"], correct: 1, difficulty: 3, solution: "sin x = x − x³/6 + …, so (x − sin x)/x³ → 1/6." },
  ],
  [
    { prompt: "d/dx (x² sin x) = ?", options: ["2x cos x", "2x sin x + x² cos x", "x² cos x", "2x sin x − x² cos x"], correct: 1, solution: "Product rule: (x²)′ sin x + x² (sin x)′ = 2x sin x + x² cos x." },
    { prompt: "If f(x) = ln(x² + 1), then f′(1) = ?", options: ["0", "1/2", "1", "2"], correct: 2, solution: "f′(x) = 2x/(x² + 1), so f′(1) = 2/2 = 1." },
    { prompt: "The derivative of e^(3x) at x = 0 is", options: ["1", "3", "e³", "0"], correct: 1, solution: "d/dx e^(3x) = 3e^(3x); at x = 0 this is 3." },
    { prompt: "f(x) = |x| at x = 0 is", options: ["Differentiable with f′(0) = 0", "Differentiable with f′(0) = 1", "Continuous but not differentiable", "Not continuous"], correct: 2, type: "PYQ", solution: "Left derivative = −1, right derivative = +1. They differ, so |x| is continuous but not differentiable at 0." },
  ],
];

const COMPLEX_QUESTIONS: Q[] = [
  { prompt: "i^2026 = ?", options: ["1", "i", "−1", "−i"], correct: 2, solution: "Powers of i repeat every 4. 2026 = 4·506 + 2, so i^2026 = i² = −1." },
  { prompt: "|3 + 4i| = ?", options: ["5", "7", "25", "√7"], correct: 0, solution: "|a + bi| = √(a² + b²) = √(9 + 16) = 5." },
  { prompt: "(1 + i)² = ?", options: ["2", "2i", "0", "1 + 2i"], correct: 1, solution: "(1 + i)² = 1 + 2i + i² = 2i." },
];

async function main() {
  console.log("Seeding MathFlex…");

  for (const b of DEFAULT_BADGES) await db.badge.upsert({ where: { code: b.code }, create: b, update: b });

  const pw = (p: string) => bcrypt.hash(p, 10);
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@mathflex.in";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? (DEMO ? "admin12345" : null);
  if (!adminPassword) throw new Error("Set SEED_ADMIN_PASSWORD when seeding production.");
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    create: { name: "MathFlex Admin", email: adminEmail, passwordHash: await pw(adminPassword), role: "ADMIN", avatarColor: "#8B5CF6" },
    update: {},
  });

  // Chapters + 3 parts each
  const all = [...CLASS_11.map((c) => ({ ...c, cls: 11 })), ...CLASS_12.map((c) => ({ ...c, cls: 12 }))];
  const chapterIds: Record<string, string> = {};
  for (const [i, c] of all.entries()) {
    const slug = slugify(c.title);
    const [from, to] = PALETTE[i % PALETTE.length];
    const price = c.price ?? (c.w >= 5 ? 399 : 299);
    const ch = await db.chapter.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        title: c.title,
        classLevel: c.cls,
        symbol: c.symbol,
        coverFrom: from,
        coverTo: to,
        price,
        mrp: price * 2,
        jeeWeightage: c.w,
        difficulty: c.w >= 5 ? 3 : 2,
        isTrending: !!c.trending,
        isFeatured: !!c.featured,
        isLowPriority: !!c.low,
        sortOrder: i,
        tagline: c.tagline ?? `Everything you need in ${c.title} for JEE Main, Advanced and boards — in three bingeable parts.`,
        description: `${c.title}, taught from scratch to JEE Advanced level by IIT Delhi & NIT Jalandhar alumni. Each part ends with a Daily Practice Problem set and past-year questions on exactly the topics you just watched.`,
        topTopics: c.topics ?? [],
        testMapping: ["JEE Main Mock 1", `Class ${c.cls} Unit Test`],
        introVideoProvider: "URL",
        introVideoRef: SAMPLE_VIDEO,
        parts: {
          create: [1, 2, 3].map((n) => ({
            order: n,
            title: slug === "limits-and-derivatives"
              ? ["Limits: the 0/0 toolkit", "Indeterminate forms & L'Hôpital", "Derivatives from first principles"][n - 1]
              : `${c.title} · Part ${n}`,
            summary: n === 1 ? "Foundations and must-know standard results." : n === 2 ? "Core techniques and problem patterns." : "JEE Advanced level problem solving.",
            topics: slug === "limits-and-derivatives"
              ? [["Standard limits", "Factorisation", "Rationalisation"], ["1^∞ form", "L'Hôpital's rule", "Series expansions"], ["First principles", "Product & chain rule", "Differentiability"]][n - 1]
              : [],
            videoProvider: "URL" as const,
            videoRef: SAMPLE_VIDEO,
            durationSec: 3600,
            isFreePreview: n === 1,
          })),
        },
      },
      include: { parts: true },
    });
    chapterIds[slug] = ch.id;

    const qs = slug === "limits-and-derivatives" ? LIMITS_QUESTIONS : slug === "complex-numbers" ? [COMPLEX_QUESTIONS] : [];
    if (qs.length && (await db.question.count({ where: { chapterId: ch.id } })) === 0) {
      for (const [pi, set] of qs.entries()) {
        const part = ch.parts.find((p) => p.order === pi + 1)!;
        for (const q of set) {
          await db.question.create({
            data: {
              chapterId: ch.id,
              partId: part.id,
              type: q.type ?? "DPP",
              exam: q.type === "PYQ" ? "JEE Main (sample)" : null,
              prompt: q.prompt,
              options: q.options,
              correctIndex: q.correct,
              solution: q.solution,
              difficulty: q.difficulty ?? 2,
            },
          });
        }
      }
    }
  }

  // Bundles
  const bundle = async (slug: string, data: { title: string; subtitle: string; price: number; mrp: number; from: string; to: string; ids: string[]; highlights: string[]; order: number }) => {
    await db.course.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        title: data.title,
        subtitle: data.subtitle,
        description: `${data.subtitle} Every video part, DPP, PYQ, formula sheet and mind map included.`,
        price: data.price,
        mrp: data.mrp,
        coverFrom: data.from,
        coverTo: data.to,
        highlights: data.highlights,
        sortOrder: data.order,
        chapters: { create: data.ids.map((chapterId) => ({ chapterId })) },
      },
    });
  };
  const ids11 = CLASS_11.map((c) => chapterIds[slugify(c.title)]);
  const ids12 = CLASS_12.map((c) => chapterIds[slugify(c.title)]);
  await bundle("class-11-complete", { title: "Class 11 Complete", subtitle: "All 20 Class 11 chapters.", price: 2999, mrp: 5999, from: "#FF2E63", to: "#FF8A3D", ids: ids11, highlights: ["60+ hours of video", "DPPs + 15 years of PYQs", "Formula sheets & mind maps"], order: 1 });
  await bundle("class-12-complete", { title: "Class 12 Complete", subtitle: "All 15 Class 12 chapters.", price: 2999, mrp: 5999, from: "#6366F1", to: "#EC4899", ids: ids12, highlights: ["45+ hours of video", "DPPs + 15 years of PYQs", "Formula sheets & mind maps"], order: 2 });
  await bundle("class-11-and-12", { title: "Class 11 + 12 Combo", subtitle: "The full JEE maths syllabus.", price: 4999, mrp: 11998, from: "#F59E0B", to: "#DC2626", ids: [...ids11, ...ids12], highlights: ["Every chapter, both years", "Best value — save 58%", "Free 1:1 planning call"], order: 0 });

  // Coupons
  await db.coupon.upsert({ where: { code: "WELCOME20" }, update: {}, create: { code: "WELCOME20", description: "20% off your first order (up to ₹200)", type: "PERCENT", value: 20, maxDiscount: 200, isPublic: true } });
  await db.coupon.upsert({ where: { code: "FLEX100" }, update: {}, create: { code: "FLEX100", description: "₹100 off orders above ₹499", type: "FLAT", value: 100, minAmount: 499, isPublic: true, perUserLimit: 3 } });

  // Banners
  if ((await db.banner.count()) === 0) {
    await db.banner.createMany({
      data: [
        { kind: "HERO", title: "Stop buying ₹30,000 courses. Buy one chapter.", subtitle: "Start with the chapter you're stuck on — from ₹149. IIT Delhi & NIT Jalandhar alumni teach, you binge.", ctaText: "Browse chapters", ctaHref: "/browse", colorFrom: "#1a0610", colorTo: "#FF2E63", sortOrder: 0 },
        { kind: "MARQUEE", title: "🔥 Use WELCOME20 for 20% off your first chapter", ctaHref: "/browse" },
        { kind: "MARQUEE", title: "🎬 Limits & Derivatives: Part 1 is free to watch", ctaHref: "/chapter/limits-and-derivatives" },
        { kind: "MARQUEE", title: "📞 1:1 mentorship call with Karan — just ₹300", ctaHref: "/cart?mentorship=1" },
        { kind: "POPUP", title: "Your first chapter, 20% off", subtitle: "Use code WELCOME20 at checkout. Valid on any chapter or course.", ctaText: "Pick a chapter", ctaHref: "/browse", colorFrom: "#FF2E63", colorTo: "#7C3AED" },
        { kind: "OFFER", title: "Combo: Class 11 + 12 at ₹4,999", subtitle: "Save 58% on the full syllabus", ctaHref: "/courses/class-11-and-12", colorFrom: "#F59E0B", colorTo: "#DC2626" },
        { kind: "OFFER", title: "₹100 off with FLEX100", subtitle: "On orders above ₹499", ctaHref: "/browse", colorFrom: "#0EA5E9", colorTo: "#6366F1" },
        { kind: "OFFER", title: "3D Geometry = 6.7% of JEE Main", subtitle: "Highest-weightage chapter. Start today.", ctaHref: "/chapter/3d-geometry", colorFrom: "#10B981", colorTo: "#0EA5E9" },
      ],
    });
  }

  // Chatbot FAQ (edit in Admin → FlexCare)
  if ((await db.knowledgeEntry.count()) === 0) {
    await db.knowledgeEntry.createMany({
      data: [
        { question: "How long do I get access after buying?", answer: "Each chapter or course has its validity shown on its page (365 days by default). You can see your plan expiry in the menu under Plan validity, and renew from there." },
        { question: "Can I watch on my phone or iPad?", answer: "Yes. MathFlex works in any browser on phones, iPads and laptops. Your progress syncs across devices." },
        { question: "Why is Part 2 locked?", answer: "Parts unlock one by one: finish Part 1's video and its practice set (DPPs + PYQs), and Part 2 unlocks automatically." },
        { question: "How does the mentorship call work?", answer: "Add the 1:1 mentorship call at checkout. After payment, our team contacts you on WhatsApp to schedule a 45-minute call." },
      ],
    });
  }

  if (DEMO) await seedDemo(pw, chapterIds);

  console.log(`Done. Admin: ${admin.email}${DEMO && !process.env.SEED_ADMIN_PASSWORD ? " / admin12345 · Student: student@mathflex.in / student12345" : ""}`);
}

// Demo data for local development only: a sample student with progress and a
// populated leaderboard. Never runs in production (or with SEED_DEMO=false).
async function seedDemo(pw: (p: string) => Promise<string>, chapterIds: Record<string, string>) {
  const student = await db.user.upsert({
    where: { email: "student@mathflex.in" },
    create: { name: "Aarav Sharma", email: "student@mathflex.in", passwordHash: await pw("student12345"), classLevel: 11 },
    update: {},
  });

  // Demo student owns Limits, with Part 1 done
  const limitsId = chapterIds["limits-and-derivatives"];
  if (!(await db.entitlement.findFirst({ where: { userId: student.id, chapterId: limitsId } }))) {
    await db.entitlement.create({ data: { userId: student.id, chapterId: limitsId, source: "admin", expiresAt: new Date(Date.now() + 365 * 86_400_000) } });
    const p1 = await db.part.findFirstOrThrow({ where: { chapterId: limitsId, order: 1 } });
    await db.partProgress.create({ data: { userId: student.id, partId: p1.id, watchedSec: 3600, videoDone: true, practiceDone: true, completedAt: new Date() } });
  }

  // Question bank extras for Limits: JEE Advanced multi-correct + numerical, tagged by topic.
  if ((await db.question.count({ where: { chapterId: limitsId, format: { not: "SINGLE" } } })) === 0) {
    const bank = [
      { format: "NUMERICAL" as const, type: "PYQ" as const, exam: "JEE Main", year: 2023, topic: "1^∞ form", difficulty: 2, prompt: "If lim (x→0) (1 + 3x)^(1/x) = e^k, find k.", options: [], numericAnswer: 3, tolerance: 0, solution: "1^∞ form: e^(lim 3x · 1/x) = e³, so k = 3." },
      { format: "NUMERICAL" as const, type: "DPP" as const, topic: "L'Hôpital's rule", difficulty: 2, prompt: "Evaluate lim (x→0) (1 − cos 4x) / x².", options: [], numericAnswer: 8, tolerance: 0, solution: "1 − cos 4x ≈ (4x)²/2 = 8x², so the limit is 8." },
      { format: "NUMERICAL" as const, type: "DPP" as const, topic: "Standard limits", difficulty: 3, prompt: "Evaluate lim (x→0) (e^x − 1 − x) / x², correct to two decimals.", options: [], numericAnswer: 0.5, tolerance: 0.01, solution: "e^x = 1 + x + x²/2 + …, so the limit is 1/2 = 0.50." },
      { format: "MULTIPLE" as const, type: "PYQ" as const, exam: "JEE Advanced", year: 2021, topic: "Differentiability", difficulty: 3, prompt: "Let f(x) = |x| + |x − 1|. Which of the following are true?", options: ["f is continuous everywhere", "f is differentiable at x = 0", "f is not differentiable at x = 1", "f has a minimum value of 1"], correctIndices: [0, 2, 3], solution: "Sum of |·| terms is continuous; corners at x = 0 and x = 1 make it non-differentiable there; on [0, 1] f = 1, the minimum." },
      { format: "MULTIPLE" as const, type: "DPP" as const, topic: "Standard limits", difficulty: 2, prompt: "Which of these limits (x → 0) equal 1?", options: ["sin x / x", "tan x / x", "(1 − cos x) / x", "ln(1 + x) / x"], correctIndices: [0, 1, 3], solution: "sin x/x, tan x/x and ln(1+x)/x all → 1; (1 − cos x)/x → 0." },
    ];
    for (const q of bank) await db.question.create({ data: { chapterId: limitsId, ...q } });
  }

  // Demo leaderboard students with XP spread over the last 30 days
  const names = ["Ishita Verma", "Rohan Mehta", "Ananya Iyer", "Kabir Singh", "Diya Patel", "Arjun Nair", "Saanvi Gupta", "Vihaan Reddy", "Myra Kapoor", "Aditya Joshi", "Tara Menon", "Reyansh Das"];
  const colors = ["#F43F5E", "#FB923C", "#8B5CF6", "#0EA5E9", "#10B981", "#EC4899"];
  for (const [i, name] of names.entries()) {
    const email = `${name.split(" ")[0].toLowerCase()}@demo.mathflex.in`;
    if (await db.user.findUnique({ where: { email } })) continue;
    const u = await db.user.create({ data: { name, email, passwordHash: await pw("demo-student"), classLevel: i % 2 ? 12 : 11, avatarColor: colors[i % colors.length], streak: (i * 3) % 17 } });
    let total = 0;
    for (let d = 0; d < 30; d++) {
      if ((i + d) % 3 === 0) continue;
      const amount = 40 + ((i * 37 + d * 53) % 260);
      total += amount;
      await db.xpEvent.create({ data: { userId: u.id, amount, reason: "practice", createdAt: new Date(Date.now() - d * 86_400_000 - i * 3_600_000) } });
    }
    await db.user.update({ where: { id: u.id }, data: { xp: total, lastActiveOn: new Date() } });
  }
  // Give the demo student some history too
  if ((await db.xpEvent.count({ where: { userId: student.id } })) === 0) {
    let total = 0;
    for (let d = 0; d < 14; d++) {
      const amount = 30 + ((d * 71) % 180);
      total += amount;
      await db.xpEvent.create({ data: { userId: student.id, amount, reason: "practice", createdAt: new Date(Date.now() - d * 86_400_000) } });
    }
    await db.user.update({ where: { id: student.id }, data: { xp: total, streak: 5, bestStreak: 9, lastActiveOn: new Date(Date.now() - 86_400_000) } });
  }

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
