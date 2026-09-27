import { db } from "./db";
import type { Series } from "@/components/site/ActivityChart";

const IST = 330 * 60_000;
const istDate = (d: Date) => new Date(d.getTime() + IST);
const dayKey = (d: Date) => istDate(d).toISOString().slice(0, 10);

// Buckets the XP ledger + attempts into daily / weekly / monthly series (IST).
export async function activitySeries(userId: string) {
  const since = new Date(Date.now() - 190 * 86_400_000);
  const [events, attempts] = await Promise.all([
    db.xpEvent.findMany({ where: { userId, createdAt: { gte: since } }, select: { amount: true, createdAt: true } }),
    db.attempt.findMany({ where: { userId, createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);
  const xpByDay = new Map<string, number>();
  const qByDay = new Map<string, number>();
  for (const e of events) xpByDay.set(dayKey(e.createdAt), (xpByDay.get(dayKey(e.createdAt)) ?? 0) + e.amount);
  for (const a of attempts) qByDay.set(dayKey(a.createdAt), (qByDay.get(dayKey(a.createdAt)) ?? 0) + 1);

  const sumRange = (from: Date, days: number) => {
    let xp = 0, questions = 0;
    for (let i = 0; i < days; i++) {
      const k = dayKey(new Date(from.getTime() + i * 86_400_000));
      xp += xpByDay.get(k) ?? 0;
      questions += qByDay.get(k) ?? 0;
    }
    return { xp, questions };
  };
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", ...o });

  const now = new Date();
  const daily: Series = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now.getTime() - (13 - i) * 86_400_000);
    return { label: fmt(d, { day: "numeric" }), full: fmt(d, { weekday: "short", day: "numeric", month: "short" }), ...sumRange(d, 1) };
  });
  const weekly: Series = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(now.getTime() - (12 - i) * 7 * 86_400_000 + 86_400_000);
    return { label: fmt(start, { day: "numeric", month: "short" }).replace(" ", " "), full: `Week of ${fmt(start, { day: "numeric", month: "short" })}`, ...sumRange(start, 7) };
  });
  const monthly: Series = Array.from({ length: 6 }, (_, i) => {
    const ist = istDate(now);
    const m = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() - (5 - i), 1) - IST);
    const next = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() - (4 - i), 1) - IST);
    const days = Math.round((next.getTime() - m.getTime()) / 86_400_000);
    return { label: fmt(m, { month: "short" }), full: fmt(m, { month: "long", year: "numeric" }), ...sumRange(m, days) };
  });
  return { daily, weekly, monthly };
}
