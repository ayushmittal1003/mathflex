// Static marketing copy for the public website. None of this is managed in /admin yet.
// Rules: no invented people, names, stats or counts. Prices, chapter counts, durations,
// coupons and the call's price/length always come from the database or settings at
// render time, never from this file.
import type { Settings } from "./settings";

// ---- Placeholders ---------------------------------------------------------------------
// Shown, clearly marked, until real values exist. A matching setting (when Ayush adds one)
// always wins. Never shown on invoices, payment screens or legal documents: hide the
// field there instead.
export const placeholders = {
  phone: "+91 788 855 8921", // support line (same number as WhatsApp)
  phoneHref: "tel:+917888558921",
  hours: "Mon–Sat, 10am–7pm",
  // Registered address and CIN/GSTIN are hidden on the site until the real ones are added.
  address: "Mathflex Learning Pvt. Ltd., [Registered address], [City, State, PIN]",
  cin: "CIN: [to be added]",
  gstin: "GSTIN: [to be added]",
  socials: { instagram: "#", youtube: "#" },
};

// Real links that already exist in code (Ayush's footer). These beat the placeholders above.
export const knownSocials: Partial<Record<keyof typeof placeholders.socials, string>> = {
  instagram: "https://www.instagram.com/mathflex.in/",
};

// ---- Instructor -----------------------------------------------------------------------
// shortName everywhere on the site (CTAs, call booking, FAQs, tips, leaderboard, upsells);
// fullName only where he's formally introduced (instructor sections, author boxes, About).
export const instructor = {
  shortName: "Karan bhaiya",
  fullName: "Karan Mittal",
  title: "B.Tech, IIT Delhi",
  introVideoId: null as string | null, // Bunny video ID; null shows "Video coming soon"
  // Portrait for the Book a call card, e.g. "/brand/karan.jpg" in public/. null shows a placeholder.
  photo: null as string | null,
  studentsGuided: "1,000+", // real figure from the founder
  bio: "cracked JEE and studied at IIT Delhi. He has spent his career building learning products and has mentored 1,000+ JEE aspirants along the way. Every Mathflex video is built around the questions that actually show up in the exam.",
  // Only the education credential is shown on the site (employers are left out by request).
  credentials: [{ org: "B.Tech, IIT Delhi", role: "Indian Institute of Technology Delhi" }],
};

// Short line for the instructor block on chapter pages.
export const instructorChapterLine = "builds every part around the questions that actually appear in JEE, with the shortcuts that save minutes in the exam hall.";

export const about = {
  storyVideoId: null as string | null, // Bunny video ID; null shows "Video coming soon"
  // {fullName}, {minPrice} are filled at render time.
  story: [
    "{fullName} cracked JEE and studied at IIT Delhi. Over the years he has guided more than 1,000 JEE aspirants, and he kept hearing the same thing: students were stuck on a few chapters, but the only way to get help was a coaching course that cost lakhs or an online bundle with the whole syllabus.",
    "So we built Mathflex around one idea. Pay for the chapter you're stuck on, not the whole course. Every chapter is split into short parts, with practice after each one, so you can fix a weak topic in a weekend.",
  ],
  storyFree: "Every chapter has a free 3–4 minute preview. Watch it, and if it clicks, the full chapter starts at {minPrice}.",
  // "The usual way" vs "The Mathflex way". {minPrice}/{fullPrice} are live.
  problems: [
    { k: "Cost", bad: "₹1–2 lakh for coaching, ₹30,000+ for online bundles", good: "From {minPrice} a chapter{fullPriceLine}" },
    { k: "What you buy", bad: "The whole syllabus, even the chapters you're good at", good: "Only the chapters you need" },
    { k: "How you learn", bad: "Long lectures, fixed batch timings", good: "Short parts you watch any time" },
    { k: "Practice", bad: "Separate test series, often at extra cost", good: "DPPs and past JEE questions after every part" },
  ],
  rules: [
    { t: "Pay per chapter", d: "You shouldn't have to buy the whole syllabus to fix one weak topic. Every chapter is sold on its own." },
    { t: "Watch before you pay", d: "Every chapter has a free 3–4 minute preview, with no card and no sign-up. If it doesn't click, you've lost nothing." },
    { t: "Practice right after", d: "Every part ends with practice problems and past JEE questions, so what you watched turns into marks." },
  ],
};

const DEFAULT_MENTOR = "Karan";

// The instructor's names, preferring settings.mentorName once it's changed in admin.
export function instructorNames(settings: Pick<Settings, "mentorName">) {
  const custom = settings.mentorName && settings.mentorName !== DEFAULT_MENTOR ? settings.mentorName : null;
  return { short: custom ?? instructor.shortName, full: custom ?? instructor.fullName };
}

// ---- The problem (home "JEE maths shouldn't cost a lakh") -----------------------------
// Competitor rows are approximate market prices, labelled as such on the page.
// Our own rows (full-syllabus course, cheapest chapter) are filled from the database.
export const problem = {
  lead: "Most students are stuck on three or four chapters, not the whole syllabus. So why pay for all of it?",
  competitors: [
    { name: "Big coaching institute", note: "Fixed batches, fixed pace, a long commute. Miss two classes and you're behind.", price: 150000, unit: "per year, approx." },
    { name: "Online course bundle", note: "Every chapter of the syllabus, including the ones you've already got.", price: 30000, unit: "one-time, approx." },
  ],
  courseNote: "Every chapter in both classes, with every part, DPPs, PYQs and notes.",
  chapterNote: "Just the chapter you're stuck on.",
};

// ---- How a chapter works ----------------------------------------------------------------
// Matches the real unlock rule: practice opens after watching most of a part (threshold
// set per part in admin); the next part opens after video + practice.
export const howSteps = [
  { kicker: "Watch", title: "Watch a part, at your pace.", body: "Short, focused parts instead of 3-hour lectures. Only the time you actually watch counts, so skipping ahead won't unlock anything." },
  { kicker: "Unlock", title: "Watch most of it and practice opens.", body: "Its practice set unlocks: daily practice problems and previous-year JEE questions on exactly what you just learnt." },
  { kicker: "Practise", title: "Solve, check, understand.", body: "Instant feedback on every answer, worked solutions, and XP for each one you get right the first time." },
  { kicker: "Level up", title: "Clear it, and the next part unlocks.", body: "Finish the practice and the next part opens. Keep your streak alive, collect badges and climb the leaderboard." },
];

// ---- Every chapter includes --------------------------------------------------------------
export const chapterIncludes = [
  { key: "parts", title: "Chapter-wise parts", body: "Short video parts you can rewatch as often as you like." },
  { key: "pyq", title: "PYQs & DPPs", body: "Previous-year JEE questions and practice problems matched to each part, with worked solutions." },
  { key: "xp", title: "XP & streaks", body: "Daily, weekly and monthly progress you can see." },
  { key: "board", title: "Leaderboard", body: "Weekly, monthly and all-time rankings with other students." },
  { key: "notes", title: "Notes", body: "Notes and formula sheets for every chapter you own." },
] as const;

// ---- Comparison table ----------------------------------------------------------------------
// true = ✓, false = ✕, string = text. "{fullPrice}" / "{callPrice}" are filled from live
// data; a row whose live value is missing is hidden.
export const comparison = {
  columns: ["Big coaching", "Online giants", "Free YouTube"],
  rows: [
    { label: "Full syllabus cost", cells: ["{fullPrice}", "₹1–2 lakh", "₹30,000+", "Free"] },
    { label: "Buy a single chapter", cells: [true, false, false, "—"] },
    { label: "Watch before you pay", cells: [true, false, "Limited", true] },
    { label: "Practice after every part", cells: [true, true, "Varies", false] },
    { label: "Learn at your own pace", cells: [true, false, true, true] },
    { label: "Taught by an IIT Delhi alumnus", cells: [true, "Varies", "Varies", "Varies"] },
    { label: "1:1 call with your mentor", cells: ["{callPrice}", "Rare", false, false] },
  ] as { label: string; cells: (string | boolean)[] }[],
};

// ---- Dashboard mock-ups ------------------------------------------------------------------
// Product UI inside dark frames. Neutral labels only (no invented students). Chapter rows
// use real chapters; progress numbers are illustrative.
export const mockLabels = {
  greeting: "Welcome back",
  you: "You",
};

// ---- FAQs ----------------------------------------------------------------------------------
// Matches what the product does today and the refund policy (lib/legal/refund.ts).
// {tokens} are filled at render time; [label](/path) becomes a link.
export type Faq = { q: string; a: string };
export type FaqGroup = { id: string; title: string; items: Faq[] };

export const faqGroups: FaqGroup[] = [
  {
    id: "start",
    title: "Getting started",
    items: [
      { q: "What is Mathflex?", a: "Chapter-wise JEE maths videos for Class 11 and 12. Each chapter is split into short video parts, with practice problems, previous-year JEE questions and notes." },
      { q: "Can I watch anything for free?", a: "Yes. Every chapter has a free 3–4 minute preview you can watch without paying or signing up. The full parts unlock when you buy the chapter." },
      { q: "Is this for JEE or Boards?", a: "Both. Chapters follow the Class 11 and 12 syllabus, and each one shows how much of JEE Main it carries so you can prioritise." },
      { q: "Do I need an account to buy?", a: "You can add chapters to your cart without an account. You log in or sign up with your email and a password just before you pay." },
    ],
  },
  {
    id: "buy",
    title: "Chapters & courses",
    items: [
      { q: "Should I buy chapters or a full course?", a: "Buy chapters if you only need a few. If you need most of a class, the full course usually works out cheaper. Compare the prices on the [Courses page](/courses)." },
      { q: "Why are parts locked?", a: "Inside a chapter you own, each part unlocks after you watch most of the previous one and clear its practice set. It keeps you from skipping the bits that cost marks later." },
      { q: "How long do I get access?", a: "Each chapter and course shows its access period on its page, counted from the date you buy it. You can renew early from your Profile page once it's within 30 days of expiring." },
      { q: "Does it work on my phone?", a: "Yes. Videos adjust to your connection, and {notesKind} open right on your phone." },
    ],
  },
  {
    id: "pay",
    title: "Payments & refunds",
    items: [
      { q: "How can I pay?", a: "UPI, debit or credit card, or netbanking, through Cashfree, our payment partner." },
      { q: "Are there any discounts?", a: "When an offer is running, you can enter its coupon code at checkout. Only one coupon can be used per order." },
      { q: "Money was deducted but my chapter didn't unlock.", a: "UPI payments can take a minute to confirm, so please don't pay again. If it still hasn't unlocked, email {supportEmail} with your order number and we'll unlock it or refund you." },
      { q: "Can I get a refund?", a: "Refunds are available for duplicate payments, payments where you didn't get access, technical faults on our side, or a wrong purchase reported within 7 days before you've used the content beyond a small preview. See the [refund policy](/refund-policy)." },
    ],
  },
  {
    id: "account",
    title: "Account & access",
    items: [
      { q: "I forgot my password.", a: "Email {supportEmail} from your registered email address and we'll help you get back in." },
      { q: "Can I share my account?", a: "No. Your access is for you only. Sharing an account, or letting others use your purchases, isn't allowed under our terms." },
      { q: "How do I change my details?", a: "You can update your name, phone number and class on your Profile page. To change your email, contact us." },
      { q: "What is the leaderboard?", a: "XP you earn from watching parts and solving questions ranks you against other students, this week, this month and all time." },
    ],
  },
  {
    id: "call",
    title: "1:1 calls with {mentorShort}",
    items: [
      { q: "What is the 1:1 call?", a: "{mentorshipBlurb}" },
      { q: "How do I book?", a: "Add the call at checkout for {mentorshipPrice}, or start from the [Book a call](/book-a-call) page. After you pay, our team will WhatsApp you to pick a time." },
    ],
  },
];

// Which FAQs the home page shows: [group id, question index].
export const homeFaqs: [string, number][] = [
  ["start", 1], ["start", 2], ["buy", 1], ["buy", 2], ["buy", 3], ["pay", 0], ["pay", 3],
];

export type FaqVars = Record<string, string>;

// Fills {tokens} in FAQ text. Unknown tokens are left as-is so they're easy to spot.
export function fillFaq(text: string, vars: FaqVars) {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

// Chapter detail FAQs. Matches the real unlock and access rules.
export function chapterFaqs(c: { classLevel: number; free: boolean; validityDays: number; sequential: boolean }): Faq[] {
  return [
    {
      q: "Can I watch before I buy?",
      a: "Yes. Watch the chapter's free 3–4 minute preview, no sign-up needed. Buy the chapter to unlock every part.",
    },
    {
      q: "How do the parts unlock?",
      a: c.sequential
        ? "Each part opens after you watch most of the previous one and clear its practice set."
        : "Once you own the chapter, every part is open. Watch them in any order.",
    },
    { q: "How long do I get access?", a: `${c.validityDays} days from the date you buy it, on phone and laptop. You can renew early from your Profile page.` },
    { q: "Is this enough for Boards too?", a: `It follows the Class ${c.classLevel} syllabus, so it works for Boards as well as JEE.` },
  ];
}

// Courses page FAQs. {tokens} are filled from live course data.
export const courseFaqs: Faq[] = [
  { q: "Course or chapters: which should I buy?", a: "If you need help with only a few chapters, buy those. If you want most of a class, the full course costs less{breakevenLine}." },
  { q: "Do all parts unlock at once?", a: "Every chapter in the course is yours from day one. Inside a chapter, {unlockRule}" },
  { q: "How long can I access the course?", a: "{accessLine} from the date of purchase, on phone and laptop. You can renew early from your Profile page." },
  { q: "What if I already own some chapters?", a: "They keep their own access period. Buying the course gives you every chapter in it, including the ones you own." },
];

// Pricing page FAQs. {tokens} are filled from live data; lines whose data is missing are dropped.
export const pricingFaqs: (Faq & { needs?: "free" | "gst" })[] = [
  { q: "Is there a monthly fee?", a: "No. You pay once for a chapter or a course and keep access for its access period." },
  { q: "What's free?", a: "A 3–4 minute preview of every chapter. No card or sign-up needed. All parts unlock when you buy the chapter." },
  { q: "Why do chapter prices differ?", a: "Each chapter is priced on its own, from {minPrice} to {maxPrice}. You only pay for the chapters you pick." },
  { q: "Is GST included?", a: "GST at {gstPercent}% is added to the total at checkout, before you pay.", needs: "gst" },
  { q: "What if it isn't right for me?", a: "Watch the chapter's free preview first. For how refunds work, see the [refund policy](/refund-policy)." },
];

// Thank-you page "Your first week" steps. Copy only; links are set on the page.
export const firstWeek = [
  { t: "Watch Part 1", d: "Short, focused parts. Pause and rewind as much as you like.", cta: "Start now" },
  { t: "Clear the practice set", d: "Practice right after the part, with worked solutions for every answer you get wrong.", cta: "How practice works" },
  { t: "Keep your streak", d: "Study a little every day to build your streak and earn XP.", cta: "View leaderboard" },
  { t: "Revise with notes", d: "Open your chapter's notes any time for quick revision.", cta: "Go to My Learning" },
];

// Book a call page. Matches how the call works today: it's the mentorship add-on bought at
// checkout; after payment the team arranges a time on WhatsApp and the call link shows on
// the student's Profile page. {tokens} are filled from settings.
export const bookCall = {
  gets: [
    { t: "A diagnosis of your weak chapters", d: "{mentorShort} looks at your recent scores and tells you which chapters are costing you the most marks." },
    { t: "A week-by-week study plan", d: "Which chapters to do first, how long to spend on each and when to revise." },
    { t: "Exam-day strategy", d: "Which questions to attempt first, how to split your time and how to avoid silly mistakes." },
  ],
  steps: [
    { t: "Add the call at checkout", d: "It's {price}. Add a chapter or a course too if you like, or book the call on its own." },
    { t: "Pay securely", d: "UPI, cards or netbanking through Cashfree. Your call is confirmed as soon as the payment goes through." },
    { t: "Pick a time on WhatsApp", d: "Our team messages you to fix a time. Once it's set, the call link shows on your Profile page." },
  ],
  faqs: [
    { q: "What happens on the call?", a: "{blurb}" },
    { q: "What should I bring to the call?", a: "Your recent test scores, the chapters you find hardest and any questions about your plan." },
    { q: "Do I need to buy a chapter first?", a: "No. You can book the call on its own, or add it to an order with chapters or a course." },
    { q: "How do I choose the time?", a: "After you pay, our team WhatsApps you to pick a slot that suits you. The call link then appears on your Profile page." },
  ] as Faq[],
};

// About page: proof cards, timeline and offerings (Allen-style structure, honest for a new
// platform: no invented years or results). {tokens} are filled from live data; a card or
// step whose data is missing is hidden on the page.
export const aboutPillars = [
  { key: "mentor", kicker: "Proven teaching", big: "{studentsGuided}", small: "JEE aspirants guided by {mentorShort}", body: "The same way of teaching that has already helped students into IITs and NITs, now chapter by chapter." },
  { key: "chapters", kicker: "Every chapter", big: "{chapterCount}", small: "chapters across Class {classes}", body: "Each one split into short parts, with practice after every part and notes for revision." },
  { key: "hours", kicker: "Depth", big: "{hours}", small: "hours of chapter-wise video", body: "Built from the questions that actually show up in JEE, not from a textbook's table of contents." },
  { key: "practice", kicker: "Practice", big: "{questionCount}", small: "practice questions and PYQs", body: "Daily practice problems and past JEE questions, matched to the part you just watched." },
  { key: "price", kicker: "Fair price", big: "{minPrice}", small: "to start a chapter", body: "Pay for the chapter you're stuck on, not the whole syllabus. {freeLine}" },
];

export const aboutTimeline = [
  { tag: "The start", t: "Cracks JEE, studies at IIT Delhi", d: "{fullName} goes through the same prep you're going through now." },
  { tag: "Mentoring", t: "{studentsGuided} aspirants guided", d: "Year after year, the same story: students stuck on a few chapters, with no way to fix just those." },
  { tag: "Building", t: "Learning products at Allen and beyond", d: "Product roles at Allen, Transify, DaMENSCH and Meesho: how students actually learn, at scale." },
  { tag: "Today", t: "Mathflex launches", d: "{chapterCount} chapters for Class {classes}, sold one at a time. We're new, and we're building it with our first students." },
  { tag: "Next", t: "Your chapter", d: "Pick the chapter that's costing you marks and fix it this week.", you: true },
];
