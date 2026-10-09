// Blog content source.
//
// PLACEHOLDER: every post below is sample content so the blog design can be reviewed. The
// plan is to publish posts from Sanity Studio; when that's connected, replace the bodies of
// getPosts() and getPost() with Sanity queries that return the same BlogPost shape, and
// delete PLACEHOLDER_POSTS. The pages don't need to change.

export type BlogCategory = { slug: string; title: string };

export const BLOG_CATEGORIES: BlogCategory[] = [
  { slug: "exam-prep", title: "Exam preparation" },
  { slug: "chapter-guides", title: "Chapter guides" },
  { slug: "study-tips", title: "Study tips" },
  { slug: "exam-updates", title: "Exam updates" },
  { slug: "mathflex-news", title: "Mathflex news" },
];

// Body blocks (maps to Sanity Portable Text plus a few custom block types).
export type BlogBlock =
  | { _type: "p"; text: string } // supports **bold**
  | { _type: "h2"; id: string; text: string }
  | { _type: "list"; items: string[] }
  | { _type: "tip"; title: string; text: string }
  | { _type: "steps"; items: { label: string; title: string; text: string }[] }
  | { _type: "chapter"; slug: string }; // inline card for a real chapter (hidden if not found)

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string; // BlogCategory.slug
  tags: string[];
  publishedAt: string; // ISO date
  readMinutes: number;
  author: { name: string; role: string };
  cover: { from: string; to: string; symbol: string; image?: string | null };
  body: BlogBlock[];
  placeholder?: boolean;
};

const KARAN = { name: "Karan Mittal", role: "B.Tech, IIT Delhi" };
const TEAM = { name: "Mathflex Team", role: "Mathflex" };

const PLACEHOLDER_POSTS: BlogPost[] = [
  {
    slug: "100-day-jee-main-plan",
    title: "Your 100-day JEE Main plan, chapter by chapter",
    excerpt: "Which chapters to finish first, when to start mocks and how to fit revision around school.",
    category: "exam-prep",
    tags: ["JEE Main", "Study plan", "Revision", "Mock tests"],
    publishedAt: "2026-10-02",
    readMinutes: 9,
    author: KARAN,
    cover: { from: "#FF2E63", to: "#FF8A3D", symbol: "100" },
    placeholder: true,
    body: [
      { _type: "p", text: "A hundred days sounds like a lot until you list the chapters. Most students reach the last three months with half of them still shaky. This plan works if you follow it roughly, not perfectly." },
      { _type: "h2", id: "weigh", text: "Start with what carries the most marks" },
      { _type: "p", text: "Not every chapter is worth the same. A handful of high-weightage chapters make up a large share of the maths paper, so they come first." },
      { _type: "chapter", slug: "3d-geometry" },
      { _type: "h2", id: "phases", text: "The plan in four phases" },
      {
        _type: "steps",
        items: [
          { label: "Day 1–35", title: "Finish the high-weightage chapters", text: "One chapter every 6–7 days. Watch the parts, solve the practice set the same day and do the PYQs on the weekend." },
          { label: "Day 36–65", title: "Cover the rest, lightly", text: "Smaller chapters take 2–3 days each. Aim for the PYQs, not every textbook exercise." },
          { label: "Day 66–85", title: "Mocks and fixing gaps", text: "Two full mocks a week. Spend as long reviewing a mock as you spent writing it." },
          { label: "Day 86–100", title: "Revise, don't learn", text: "Only formula sheets, notes and your own mistake log. No new chapters in the last two weeks." },
        ],
      },
      { _type: "tip", title: "Karan bhaiya's tip", text: "If a chapter isn't clicking after two days, move on and come back in phase 3. Being stuck for a week costs more marks than skipping." },
      { _type: "h2", id: "day", text: "What a normal day looks like" },
      { _type: "list", items: ["**40 minutes** of video, one part at a time, before school or right after.", "**30 minutes** on that part's practice set the same evening, while it's fresh.", "**20 minutes** on yesterday's mistakes, written into a single notebook.", "**Sundays** for PYQs and one timed section test."] },
      { _type: "h2", id: "mocks", text: "When to start mock tests" },
      { _type: "p", text: "Start full mocks in phase 3, not before. After each mock, sort every wrong answer into one of three buckets: **didn't know the concept**, **knew it but made a slip**, or **ran out of time**." },
      { _type: "h2", id: "behind", text: "If you're already behind" },
      { _type: "p", text: "Cut phase 2 short. Pick the high-weightage chapters you haven't done, skip the rest for now and protect the last two weeks for revision." },
    ],
  },
  {
    slug: "definite-integrals-properties",
    title: "Definite Integrals: the properties that solve most JEE questions",
    excerpt: "King's rule, periodicity and the rest, with the kind of PYQs where each one shows up.",
    category: "chapter-guides",
    tags: ["Calculus", "Definite Integrals", "PYQs"],
    publishedAt: "2026-09-26",
    readMinutes: 7,
    author: KARAN,
    cover: { from: "#1a0610", to: "#FF2E63", symbol: "∫" },
    placeholder: true,
    body: [
      { _type: "p", text: "Most definite integral questions in JEE aren't about integrating at all. They're about spotting which property turns a scary integral into a simple one." },
      { _type: "h2", id: "kings-rule", text: "King's rule first" },
      { _type: "p", text: "Replacing x with (a + b − x) is the single most useful move in this chapter. Try it whenever the limits are symmetric." },
      { _type: "tip", title: "Quick check", text: "If adding the original integral to its King's-rule version gives something easy, you're on the right track." },
      { _type: "chapter", slug: "definite-integrals" },
    ],
  },
  {
    slug: "review-a-mock-in-30-minutes",
    title: "How to review a mock test in 30 minutes",
    excerpt: "A simple three-column method to turn every wrong answer into marks next time.",
    category: "study-tips",
    tags: ["Mock tests", "Revision"],
    publishedAt: "2026-09-19",
    readMinutes: 5,
    author: TEAM,
    cover: { from: "#10B981", to: "#0EA5E9", symbol: "✓" },
    placeholder: true,
    body: [
      { _type: "p", text: "Writing a mock is half the work. The marks come from reviewing it properly, and that doesn't need to take all evening." },
      { _type: "h2", id: "three-columns", text: "Three columns, every wrong answer" },
      { _type: "list", items: ["**Concept gap:** go back to the part that teaches it.", "**Silly slip:** write the slip in your mistake log.", "**Out of time:** practise that question type with a timer."] },
    ],
  },
  {
    slug: "reading-the-jee-main-notice",
    title: "How to read the JEE Main information bulletin",
    excerpt: "The sections that actually matter for your preparation, and the ones you can skip.",
    category: "exam-updates",
    tags: ["JEE Main", "Exam pattern"],
    publishedAt: "2026-09-11",
    readMinutes: 4,
    author: TEAM,
    cover: { from: "#6366F1", to: "#EC4899", symbol: "27" },
    placeholder: true,
    body: [
      { _type: "p", text: "Every year the official bulletin answers most of the questions students ask online. Here's how to find the parts that affect your preparation." },
      { _type: "h2", id: "pattern", text: "Start with the exam pattern" },
      { _type: "p", text: "Check the number of questions, marking scheme and any changes from last year before planning your mocks." },
    ],
  },
  {
    slug: "3d-geometry-in-a-weekend",
    title: "3D Geometry in one weekend",
    excerpt: "Lines, planes and shortest distance, in the order that makes the most sense.",
    category: "chapter-guides",
    tags: ["Vectors & 3D", "3D Geometry"],
    publishedAt: "2026-09-03",
    readMinutes: 8,
    author: KARAN,
    cover: { from: "#10B981", to: "#0EA5E9", symbol: "xyz" },
    placeholder: true,
    body: [
      { _type: "p", text: "3D Geometry rewards a clear order: direction ratios, then lines, then planes, then distances. Do it in that order and it fits in a weekend." },
      { _type: "chapter", slug: "3d-geometry" },
    ],
  },
  {
    slug: "streaks-that-stick",
    title: "Streaks that stick: studying a little every day",
    excerpt: "Why 40 focused minutes a day beats a 6-hour Sunday, and how to keep it going.",
    category: "study-tips",
    tags: ["Habits", "Consistency"],
    publishedAt: "2026-08-27",
    readMinutes: 4,
    author: TEAM,
    cover: { from: "#F59E0B", to: "#DC2626", symbol: "7" },
    placeholder: true,
    body: [{ _type: "p", text: "Consistency compounds. A short, daily session keeps a chapter warm in a way a weekly marathon never does." }],
  },
  {
    slug: "probability-without-panic",
    title: "Probability without panic",
    excerpt: "Conditional probability and Bayes' theorem, explained with the questions JEE likes to ask.",
    category: "chapter-guides",
    tags: ["Probability", "PYQs"],
    publishedAt: "2026-08-20",
    readMinutes: 6,
    author: KARAN,
    cover: { from: "#0EA5E9", to: "#6366F1", symbol: "P" },
    placeholder: true,
    body: [
      { _type: "p", text: "Most probability mistakes come from setting up the sample space wrong. Fix that first and the formulas follow." },
      { _type: "chapter", slug: "probability" },
    ],
  },
  {
    slug: "boards-and-jee-together",
    title: "Preparing for Boards and JEE together",
    excerpt: "How to use one chapter's preparation for both, without doubling your workload.",
    category: "exam-prep",
    tags: ["Boards", "JEE Main", "Study plan"],
    publishedAt: "2026-08-12",
    readMinutes: 6,
    author: KARAN,
    cover: { from: "#7C3AED", to: "#FF2E63", symbol: "12" },
    placeholder: true,
    body: [{ _type: "p", text: "Boards reward complete, well-presented answers; JEE rewards speed and the right shortcut. One chapter can prepare you for both if you plan it." }],
  },
  {
    slug: "pyqs-the-right-way",
    title: "PYQs the right way: when and how to solve them",
    excerpt: "Previous year questions are the best practice you have. Here's how not to waste them.",
    category: "exam-prep",
    tags: ["PYQs", "JEE Main"],
    publishedAt: "2026-09-15",
    readMinutes: 5,
    author: KARAN,
    cover: { from: "#0EA5E9", to: "#10B981", symbol: "PYQ" },
    placeholder: true,
    body: [{ _type: "p", text: "Save PYQs for after you've finished a chapter's practice set. Solved too early, they only tell you what you haven't learned yet." }],
  },
  {
    slug: "last-30-days-before-jee",
    title: "The last 30 days before JEE Main",
    excerpt: "What to revise, what to drop and how to keep your nerves steady in the final month.",
    category: "exam-prep",
    tags: ["Revision", "JEE Main"],
    publishedAt: "2026-08-24",
    readMinutes: 6,
    author: KARAN,
    cover: { from: "#DC2626", to: "#7C3AED", symbol: "30" },
    placeholder: true,
    body: [{ _type: "p", text: "The final month is for sharpening, not learning. Protect your sleep, revise from your own notes and write mocks at exam time." }],
  },
  {
    slug: "one-mistake-notebook",
    title: "Why every JEE student needs a mistake notebook",
    excerpt: "One notebook, three columns, five minutes a day. The cheapest marks you'll ever earn.",
    category: "study-tips",
    tags: ["Habits", "Revision"],
    publishedAt: "2026-08-16",
    readMinutes: 3,
    author: TEAM,
    cover: { from: "#6366F1", to: "#0EA5E9", symbol: "✎" },
    placeholder: true,
    body: [{ _type: "p", text: "Write down every mistake, the reason and the fix. Reread it every Sunday. Most students repeat the same five mistakes all year." }],
  },
  {
    slug: "jee-main-exam-pattern-explained",
    title: "JEE Main maths section, explained",
    excerpt: "How the maths section is structured and how to split your time across it.",
    category: "exam-updates",
    tags: ["Exam pattern", "JEE Main"],
    publishedAt: "2026-08-08",
    readMinutes: 4,
    author: TEAM,
    cover: { from: "#F59E0B", to: "#EC4899", symbol: "%" },
    placeholder: true,
    body: [{ _type: "p", text: "Always check the latest official information bulletin for the current pattern. This guide covers how to plan your time once you know it." }],
  },
  {
    slug: "welcome-to-mathflex",
    title: "Welcome to Mathflex",
    excerpt: "Why we built a chapter-wise way to learn JEE maths, and what's coming next.",
    category: "mathflex-news",
    tags: ["Mathflex"],
    publishedAt: "2026-08-01",
    readMinutes: 3,
    author: KARAN,
    cover: { from: "#EC4899", to: "#F59E0B", symbol: "M" },
    placeholder: true,
    body: [{ _type: "p", text: "Mathflex started with a simple idea: pay for the chapter you're stuck on, not the whole syllabus." }],
  },
];

// Newest first. Swap for a Sanity query when connected.
export async function getPosts(): Promise<BlogPost[]> {
  return [...PLACEHOLDER_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  return PLACEHOLDER_POSTS.find((p) => p.slug === slug) ?? null;
}

export const categoryTitle = (slug: string) => BLOG_CATEGORIES.find((c) => c.slug === slug)?.title ?? slug;

export const formatPostDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
