import { cache } from "react";
import { db } from "./db";
import { faqGroups, homeFaqs, instructor } from "./site-content";

// Every admin-tunable knob with its default. The admin Settings page edits these;
// anything not yet saved in the DB falls back to the value here.
export const DEFAULT_SETTINGS = {
  // Brand & contact
  siteName: "MathFlex",
  tagline: "Binge-watch your way to a 99 percentile.",
  supportEmail: "support@mathflex.in",
  whatsappNumber: "917888558921",
  mentorName: "Karan",

  // Videos on the home/about pages and /book-a-call: a Bunny video ID and an uploaded thumbnail ("" = none).
  siteVideos: {
    mentor: { videoId: "581f9d86-7fe5-4e96-b2e2-88a6d7ed36fe", poster: "" },
    call: { videoId: "", poster: "" },
  },

  // The running strip above the navbar. Empty colours use the brand gradient. Its messages are MARQUEE
  // banners, and features.marquee shows or hides it; all three are edited on Admin → Banners & popups.
  strip: { from: "", to: "", text: "#FFFFFF" },

  // Commerce
  currencySymbol: "₹",
  mentorshipPrice: 300,
  mentorshipTitle: "1:1 mentorship call with Karan",
  mentorshipBlurb: "45 minutes. Your doubts, your study plan, your rank strategy.",
  // Karan's Calendly event for paid 1:1 calls (e.g. https://calendly.com/karan/1-1-call). Students
  // only reach it after paying; Calendly creates the Google Meet link and emails it to both sides.
  calendlyUrl: "",
  gstPercent: 0, // set to 18 to add GST on top at checkout

  // Feature flags (the "open functionalities")
  features: {
    chatbot: true,
    leaderboard: true,
    mentorshipUpsell: true,
    coupons: true,
    referAndEarn: false,
    // "How to prepare" video that pops up the first time a student opens a chapter they've bought.
    // Off until the videos are uploaded (each chapter's own video in Admin → Chapters). Replaces the
    // old introPopupVideo switch, so it starts off even where that one was saved as on.
    prepVideo: false,
    celebrationSound: true,
    sequentialUnlock: true, // Part 2 unlocks only after Part 1 video + practice
    freePreviews: true,
    marquee: true,
    signupOpen: true,
    practice: true, // chapter-wise question bank + practice analytics
  },

  // JEE marking scheme used to score practice (defaults follow JEE Main / Advanced).
  marking: {
    correct: 4,
    wrong: -1, // single-correct and numerical
    multiWrong: -2, // multi-correct: any wrong option picked
    multiPartial: 1, // multi-correct: per correct option when none are wrong
  },

  // Milestone rewards. A tier is reached when all three targets are met: parts watched to the end,
  // different questions answered correctly, and the best daily streak so far. The team fulfils each
  // claim by hand from Admin → Rewards, where these numbers and rewards are edited.
  rewards: {
    tiers: [
      { key: "BRONZE", name: "Bronze", parts: 20, correct: 200, streak: 14, reward: "One chapter of your choice free, with 3 months of access" },
      { key: "SILVER", name: "Silver", parts: 40, correct: 500, streak: 30, reward: "A free 45-minute 1:1 call with Karan" },
      { key: "GOLD", name: "Gold", parts: 70, correct: 1000, streak: 60, reward: "Mathflex merchandise and a signed certificate, plus a shout-out on our website and Instagram if you'd like one" },
    ],
  },

  // Home page content, edited on Admin → Home page. Text wrapped in *stars* gets the highlighter
  // mark. Hiding a section only hides it on the home page.
  home: {
    sections: { previews: true, problem: true, how: true, inside: true, mentor: true, compare: true, pricing: true, faq: true, finalCta: true },
    // "Book a call" button next to Log in (needs the Mentorship upsell feature on).
    bookCallInHeader: true,
    // Coupon shown under the pricing cards and offered in one tap at checkout ("" = the newest active public coupon).
    featuredCoupon: "",
    // Tick the 1:1 call by default at checkout. Off: students add it themselves (no surprise charge).
    callPreticked: false,
    // Mentor credential and bio (the bio follows his name: "Karan Mittal is ...").
    mentorTitle: instructor.title,
    mentorBio: instructor.bio,
    // "The problem": coaching price against Mathflex.
    problemEyebrow: "The real cost",
    problemTitle: "JEE maths shouldn't cost *a lakh a year*.",
    problemLead: "Most students are stuck on three or four chapters, not the whole syllabus. So why pay for all of it?",
    coachingName: "Big coaching institute",
    coachingPrice: 115000,
    coachingNote: "₹1.15L–₹2.41L a year depending on the city. Fixed batches, fixed pace, a long commute.",
    // {percent} = full Mathflex syllabus as a share of one coaching year; {fullPrice}, {minPrice} also work.
    problemConclusion: "The complete Mathflex syllabus costs less than *{percent}* of one year at a big coaching institute.",
    // "How a chapter works"
    howTitle: "Every chapter plays like a *series*.",
    howLead: "Short parts, practice after each one, and the next part unlocks. You always know what to do next.",
    // "Why Mathflex" comparison table.
    compareKicker: "Same goal.",
    compareTitle: "A *fraction* of the price.",
    compareColumns: { coaching: true, online: true, youtube: false },
    compareRows: { fullSyllabus: true, singleChapter: true, watchFirst: true, practice: false, ownPace: true, iitMentor: true, mentorCall: true },
    // Home FAQs. {supportEmail}, {mentorShort}, {mentorshipPrice} and {notesKind} are filled in;
    // "- " lines become bullets, **text** is bold and [label](/path) is a link.
    faqs: homeFaqs.map(([g, i]) => faqGroups.find((x) => x.id === g)!.items[i]).filter(Boolean) as { q: string; a: string }[],
  },

  // The /enquiry page for ad traffic: a short form that becomes a lead on Admin → Leads.
  enquiry: {
    enabled: true,
    eyebrow: "Free 1:1 guidance",
    title: "Find your *weak chapters* and fix them fast.",
    subtitle: "Tell us where you are in your JEE prep. Karan bhaiya's team will call you with a chapter-wise plan, free.",
    promise: "We'll call you within 24 hours",
  },

  // Gamification rules
  xp: {
    perCorrect: 10,
    perPartVideo: 100,
    perPracticeSet: 50,
    perChapter: 500,
    dailyStreakBonus: 20,
  },

  // MathMate chatbot
  chatbot: {
    name: "MathMate",
    greeting: "Hey! I'm MathMate 👋 Ask me about JEE maths, chapters, prices or your progress.",
    model: "claude-sonnet-5-5",
    // Extra rules and tone the admin adds on top of the built-in ones (never replaces the topic limits).
    // Uploaded photo for the chat bubble and header ("" = a sparkle icon).
    avatar: "",
    // Tappable questions shown under the greeting before the student has typed anything.
    starters: ["Which chapters have the highest JEE weightage?", "What's in the Class 12 course?", "Explain L'Hôpital's rule"] as string[],
    instructions: "",
    // Unpublished edits to the base prompt (null = no draft). Students only ever see `instructions`.
    draft: null as string | null,
    // Free-text facts the bot should know (timings, policies, announcements). Q&A pairs live in the FAQ list.
    knowledge: "",
  },
};

export type Settings = typeof DEFAULT_SETTINGS;

// Character limit of the chatbot's editable base prompt.
export const BOT_PROMPT_MAX = 50_000;
// Character limit of the free-text knowledge notes.
export const BOT_KNOWLEDGE_MAX = 50_000;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Saved values win at every level, so a default added later still shows up inside an older saved
// group (e.g. a new home section switch). Arrays and plain values are replaced as a whole.
function mergeDeep(base: unknown, value: unknown): unknown {
  if (!isObject(base) || !isObject(value)) return value;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(value)) out[k] = k in base ? mergeDeep(base[k], v) : v;
  return out;
}

// Cached per request so every component can call it freely.
export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.setting.findMany();
  const merged: Record<string, unknown> = structuredClone(DEFAULT_SETTINGS);
  for (const { key, value } of rows) merged[key] = key in merged ? mergeDeep(merged[key], value) : value;
  // The bot used to be called FlexCare; a name saved under that label now reads as MathMate.
  const bot = merged.chatbot as Settings["chatbot"];
  if (bot.name === "FlexCare") bot.name = "MathMate";
  // The earlier default was Opus; the bot now defaults to Sonnet, which is faster and far cheaper.
  if (bot.model === "claude-opus-5") bot.model = "claude-sonnet-5-5";
  if (bot.greeting.includes("FlexCare")) bot.greeting = bot.greeting.replaceAll("FlexCare", "MathMate");
  return merged as Settings;
});

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.setting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}
