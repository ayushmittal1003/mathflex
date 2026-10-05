import Link from "next/link";
import { requestNow } from "@/lib/time";
import { notFound } from "next/navigation";
import { Flame, Crown } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { levelFromXp } from "@/lib/gamification";

export const metadata = { title: "Leaderboard" };

const PERIODS = { week: "This week", month: "This month", all: "All time" } as const;

export default async function Leaderboard({ searchParams }: { searchParams: Promise<{ p?: keyof typeof PERIODS }> }) {
  const settings = await getSettings();
  if (!settings.features.leaderboard) notFound();
  const { p = "week" } = await searchParams;
  const me = await getCurrentUser();

  let rows: { id: string; name: string; avatarColor: string; streak: number; xp: number; totalXp: number }[];
  if (p === "all") {
    const users = await db.user.findMany({ where: { role: "STUDENT", isBlocked: false, xp: { gt: 0 } }, orderBy: { xp: "desc" }, take: 50 });
    rows = users.map((u) => ({ id: u.id, name: u.name, avatarColor: u.avatarColor, streak: u.streak, xp: u.xp, totalXp: u.xp }));
  } else {
    const since = new Date(requestNow() - (p === "week" ? 7 : 30) * 86_400_000);
    const grouped = await db.xpEvent.groupBy({ by: ["userId"], where: { createdAt: { gte: since }, user: { role: "STUDENT", isBlocked: false } }, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } }, take: 50 });
    const users = await db.user.findMany({ where: { id: { in: grouped.map((g) => g.userId) } } });
    const byId = new Map(users.map((u) => [u.id, u]));
    rows = grouped.map((g) => {
      const u = byId.get(g.userId)!;
      return { id: u.id, name: u.name, avatarColor: u.avatarColor, streak: u.streak, xp: g._sum.amount ?? 0, totalXp: u.xp };
    });
  }
  const myIndex = me ? rows.findIndex((r) => r.id === me.id) : -1;
  const podium = [rows[1], rows[0], rows[2]];
  const short = (n: string) => { const [f, l] = n.split(" "); return l ? `${f} ${l[0]}.` : f; };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-[calc(var(--nav-h)+2rem)]">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Leaderboard</h1>
      <p className="text-muted-foreground">Earn XP by finishing parts and solving questions.</p>
      <div className="mt-5 flex gap-1 rounded-full bg-surface-2 p-1 text-sm font-semibold">
        {(Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map((k) => (
          <Link key={k} href={`/leaderboard?p=${k}`} className={`flex-1 rounded-full py-2 text-center ${p === k ? "bg-card shadow" : "text-muted-foreground"}`}>{PERIODS[k]}</Link>
        ))}
      </div>

      {rows.length >= 3 && (
        <div className="mt-10 grid grid-cols-3 items-end gap-2 sm:gap-4">
          {podium.map((r, i) => {
            const place = [2, 1, 3][i];
            return (
              <div key={r.id} className="flex flex-col items-center text-center">
                {place === 1 && <Crown className="mb-1 size-7 fill-gold text-gold" />}
                <div className={`grid place-items-center rounded-full font-bold text-white ring-4 ${place === 1 ? "size-20 text-2xl ring-gold" : "size-16 text-xl ring-border"}`} style={{ background: r.avatarColor }}>{r.name[0]}</div>
                <p className="mt-2 w-full truncate text-sm font-bold">{short(r.name)}</p>
                <p className="text-xs font-semibold text-xp">{r.xp.toLocaleString("en-IN")} XP</p>
                <div className={`mt-3 grid w-full place-items-center rounded-t-2xl bg-brand-gradient font-display text-3xl font-extrabold text-white ${place === 1 ? "h-28" : place === 2 ? "h-20" : "h-14"}`}>{place}</div>
              </div>
            );
          })}
        </div>
      )}

      <ol className="card mt-6 divide-y divide-border overflow-hidden">
        {rows.slice(rows.length >= 3 ? 3 : 0).map((r, i) => {
          const rank = i + (rows.length >= 3 ? 4 : 1);
          return <LbRow key={r.id} rank={rank} r={r} me={r.id === me?.id} />;
        })}
        {!rows.length && <li className="p-8 text-center text-muted-foreground">No XP earned in this period yet. Be the first!</li>}
      </ol>
      {me && myIndex === -1 && <p className="mt-4 text-center text-sm text-muted-foreground">You&apos;re not in the top 50 yet — solve a practice set to climb.</p>}
    </div>
  );
}

function LbRow({ rank, r, me }: { rank: number; r: { name: string; avatarColor: string; streak: number; xp: number; totalXp: number }; me: boolean }) {
  return (
    <li className={`flex items-center gap-3 px-4 py-3 ${me ? "bg-primary/10" : ""}`}>
      <span className="w-7 text-center font-display font-extrabold text-muted-foreground">{rank}</span>
      <span className="grid size-10 shrink-0 place-items-center rounded-full font-bold text-white" style={{ background: r.avatarColor }}>{r.name[0]}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{r.name}{me && " (you)"}</span>
        <span className="text-xs text-muted-foreground">Level {levelFromXp(r.totalXp).level}</span>
      </span>
      {r.streak > 0 && <span className="flex items-center gap-0.5 text-sm font-bold text-brand-2"><Flame className="size-4" />{r.streak}</span>}
      <span className="w-20 text-right font-bold text-xp">{r.xp.toLocaleString("en-IN")}</span>
    </li>
  );
}
