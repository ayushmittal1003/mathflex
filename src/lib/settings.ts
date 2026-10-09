import { cache } from "react";
import { db } from "./db";

// Every admin-tunable knob with its default. The admin Settings page edits these;
// anything not yet saved in the DB falls back to the value here.
export const DEFAULT_SETTINGS = {
  // Brand & contact
  siteName: "MathFlex",
  tagline: "Binge-watch your way to a 99 percentile.",
  supportEmail: "support@mathflex.in",
  whatsappNumber: "917888558921",
  mentorName: "Karan",

  // Commerce
  currencySymbol: "₹",
  mentorshipPrice: 300,
  mentorshipTitle: "1:1 mentorship call with Karan",
  mentorshipBlurb: "45 minutes. Your doubts, your study plan, your rank strategy.",
  gstPercent: 0, // set to 18 to add GST on top at checkout

  // Feature flags (the "open functionalities")
  features: {
    chatbot: true,
    leaderboard: true,
    mentorshipUpsell: true,
    coupons: true,
    referAndEarn: false,
    introPopupVideo: true,
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
    instructions: "",
    // Unpublished edits to the base prompt (null = no draft). Students only ever see `instructions`.
    draft: null as string | null,
    // Free-text facts the bot should know (timings, policies, announcements). Q&A pairs live in the FAQ list.
    knowledge: "",
  },
};

export type Settings = typeof DEFAULT_SETTINGS;

// Character limit of the chatbot's editable base prompt.
export const BOT_PROMPT_MAX = 4500;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Cached per request so every component can call it freely.
export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.setting.findMany();
  const merged: Record<string, unknown> = structuredClone(DEFAULT_SETTINGS);
  for (const { key, value } of rows) {
    const base = merged[key];
    merged[key] = isObject(base) && isObject(value) ? { ...base, ...value } : value;
  }
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
