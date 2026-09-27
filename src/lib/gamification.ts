import { db } from "./db";

// Level curve: each level needs 20% more XP than the last, starting at 300.
export function levelFromXp(xp: number) {
  let level = 1;
  let need = 300;
  let floor = 0;
  while (xp >= floor + need) {
    floor += need;
    level++;
    need = Math.round(need * 1.2);
  }
  return { level, intoLevel: xp - floor, levelSize: need, title: levelTitle(level) };
}

function levelTitle(level: number) {
  const titles = ["Rookie", "Explorer", "Solver", "Strategist", "Prodigy", "Grandmaster", "Legend"];
  return titles[Math.min(titles.length - 1, Math.floor((level - 1) / 3))];
}

function dayKey(d: Date) {
  // Streaks are counted in IST, where the students are.
  return new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

export type Reward = { xp: number; badges: { name: string; emoji: string; description: string }[]; streak?: number };

// Award XP, bump the daily streak, and return what should be celebrated on screen.
export async function awardXp(userId: string, amount: number, reason: string, streakBonus = 0): Promise<Reward> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const today = dayKey(new Date());
  const last = user.lastActiveOn ? dayKey(user.lastActiveOn) : null;
  let streak = user.streak;
  let bonus = 0;
  if (last !== today) {
    const yesterday = dayKey(new Date(Date.now() - 86_400_000));
    streak = last === yesterday ? streak + 1 : 1;
    bonus = streakBonus;
  }
  const total = amount + bonus;
  await db.$transaction([
    db.xpEvent.create({ data: { userId, amount: total, reason } }),
    db.user.update({
      where: { id: userId },
      data: { xp: { increment: total }, streak, bestStreak: Math.max(user.bestStreak, streak), lastActiveOn: new Date() },
    }),
  ]);
  const badges = [];
  if (streak >= 7) badges.push(await grantBadge(userId, "STREAK_7"));
  if (streak >= 30) badges.push(await grantBadge(userId, "STREAK_30"));
  if (user.xp + total >= 5000) badges.push(await grantBadge(userId, "XP_5000"));
  return { xp: total, badges: badges.filter((b) => b !== null), streak: last !== today ? streak : undefined };
}

// Returns the badge only when newly earned (so the UI celebrates once).
export async function grantBadge(userId: string, code: string, context = "") {
  const badge = await db.badge.findUnique({ where: { code } });
  if (!badge) return null;
  const existing = await db.userBadge.findUnique({
    where: { userId_badgeId_context: { userId, badgeId: badge.id, context } },
  });
  if (existing) return null;
  await db.userBadge.create({ data: { userId, badgeId: badge.id, context } });
  return { name: badge.name, emoji: badge.emoji, description: badge.description };
}

export const DEFAULT_BADGES = [
  { code: "FIRST_PART", name: "First Episode", emoji: "🎬", description: "Finished your first video part", color: "#F43F5E" },
  { code: "PRACTICE_PRO", name: "Practice Pro", emoji: "🎯", description: "Scored 80%+ on a practice set", color: "#22C55E" },
  { code: "CHAPTER_DONE", name: "Chapter Completed", emoji: "🏆", description: "Completed every part of a chapter", color: "#FACC15" },
  { code: "STREAK_7", name: "On Fire", emoji: "🔥", description: "7-day learning streak", color: "#FB923C" },
  { code: "STREAK_30", name: "Unstoppable", emoji: "⚡", description: "30-day learning streak", color: "#A78BFA" },
  { code: "XP_5000", name: "XP Hoarder", emoji: "💎", description: "Earned 5,000 XP", color: "#38BDF8" },
  { code: "PERFECT_SET", name: "Flawless", emoji: "✨", description: "100% on a practice set", color: "#E879F9" },
];
