import { requestNow } from "@/lib/time";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { levelFromXp } from "@/lib/gamification";
import { Mark } from "@/components/site/web/primitives";
import { LeaderboardView, type LbRow } from "@/components/site/web/leaderboard/LeaderboardView";

export const metadata = { title: "Leaderboard" };

const PERIODS = { week: "This week", month: "This month", all: "All time" } as const;
const WORD = { week: "this week", month: "this month", all: "of all time" } as const;

// Leaderboard (dipankar-design/designs/Leaderboard.dc.html). Same ranking query as before
// (top 50 students by XP for the period, blocked accounts excluded), refreshed on page load.
// City, rank movement and live XP flashes have no backend, so they aren't shown.
export default async function Leaderboard({ searchParams }: { searchParams: Promise<{ p?: keyof typeof PERIODS }> }) {
  const settings = await getSettings();
  if (!settings.features.leaderboard) notFound();
  const { p: rawP = "week" } = await searchParams;
  const p = rawP in PERIODS ? rawP : "week";
  const me = await getCurrentUser();

  let rows: { id: string; name: string; avatarColor: string; streak: number; xp: number; totalXp: number; classLevel: number | null }[];
  if (p === "all") {
    const users = await db.user.findMany({ where: { role: "STUDENT", isBlocked: false, xp: { gt: 0 } }, orderBy: { xp: "desc" }, take: 50 });
    rows = users.map((u) => ({ id: u.id, name: u.name, avatarColor: u.avatarColor, streak: u.streak, xp: u.xp, totalXp: u.xp, classLevel: u.classLevel }));
  } else {
    const since = new Date(requestNow() - (p === "week" ? 7 : 30) * 86_400_000);
    const grouped = await db.xpEvent.groupBy({ by: ["userId"], where: { createdAt: { gte: since }, user: { role: "STUDENT", isBlocked: false } }, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } }, take: 50 });
    const users = await db.user.findMany({ where: { id: { in: grouped.map((g) => g.userId) } } });
    const byId = new Map(users.map((u) => [u.id, u]));
    rows = grouped.map((g) => {
      const u = byId.get(g.userId)!;
      return { id: u.id, name: u.name, avatarColor: u.avatarColor, streak: u.streak, xp: g._sum.amount ?? 0, totalXp: u.xp, classLevel: u.classLevel };
    });
  }

  const list: LbRow[] = rows.map((r, i) => ({ ...r, rank: i + 1, level: levelFromXp(r.totalXp).level, me: r.id === me?.id }));

  return (
    <>
      <section className="px-6 pt-[calc(86px+56px)] text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-[13px] font-semibold text-secondary-foreground">
          <span className="size-2 rounded-full bg-primary" />
          {list.length} student{list.length === 1 ? "" : "s"} ranked {WORD[p]}
        </div>
        <h1 className="mx-auto mt-5.5 max-w-[980px] text-[clamp(42px,6.4vw,84px)] font-extrabold leading-none tracking-[-0.045em] text-balance">
          Who&apos;s on top <Mark>{WORD[p]}</Mark>
        </h1>
        <p className="mx-auto mt-5 max-w-[540px] text-[17px] leading-[1.55] text-secondary-foreground text-pretty">
          Earn XP for every part you finish and every question you get right. {p === "week" ? "The weekly board counts the last 7 days." : p === "month" ? "The monthly board counts the last 30 days." : "All-time XP since you joined."}
        </p>
      </section>
      <LeaderboardView rows={list} period={p} periods={PERIODS} signedIn={!!me} />
    </>
  );
}
