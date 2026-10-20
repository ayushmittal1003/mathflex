"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cx } from "../ui";

export type LbRow = { id: string; name: string; avatarColor: string; streak: number; xp: number; totalXp: number; classLevel: number | null; rank: number; level: number; me: boolean };

const short = (n: string) => { const [f, l] = n.split(" "); return l ? `${f} ${l[0]}.` : f; };
const classLabel = (c: number | null) => (c === 13 ? "Dropper" : c ? `Class ${c}` : "—");

// Shown only while there is no real data for the period (rows is empty), so the board does not
// look broken before the first students join. Generic names, clearly marked; they disappear on
// their own as soon as a real row exists. Never present these as real students.
const SAMPLE_ROWS = [
  { name: "Student A", cls: "Class 12", xp: 2480 },
  { name: "Student B", cls: "Class 11", xp: 2115 },
  { name: "Student C", cls: "Class 12", xp: 1870 },
  { name: "Student D", cls: "Class 11", xp: 1540 },
  { name: "Student E", cls: "Class 12", xp: 1295 },
  { name: "Student F", cls: "Class 11", xp: 960 },
];

// Podium, sticky filters (period links, class, name search) and the ranked list.
export function LeaderboardView({ rows, period, periods, signedIn }: { rows: LbRow[]; period: string; periods: Record<string, string>; signedIn: boolean }) {
  const [cls, setCls] = useState<"all" | number>("all");
  const [q, setQ] = useState("");
  // The filter bar has no border until it sticks under the nav; then it gets a hairline.
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 68), { rootMargin: "-68px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const classes = [...new Set(rows.map((r) => r.classLevel).filter((c): c is number => !!c))].sort();
  const filtered = useMemo(() => rows.filter((r) => (cls === "all" || r.classLevel === cls) && (!q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase()))), [rows, cls, q]);
  const me = rows.find((r) => r.me);
  const above = me && me.rank > 1 ? rows[me.rank - 2] : null;
  const podium = rows.length >= 3 ? [rows[1], rows[0], rows[2]] : [];

  return (
    <>
      {podium.length === 3 && (
        <section className="px-6 pt-14">
          <div className="mx-auto flex w-[min(760px,100%)] items-end justify-center gap-3 tablet:gap-6">
            {podium.map((r) => {
              const first = r.rank === 1;
              const medal = r.rank === 1 ? "text-foreground" : r.rank === 2 ? "text-[oklch(0.7_0.02_255)]" : "text-[oklch(0.62_0.12_55)]";
              const ring = r.rank === 1 ? "var(--gold)" : r.rank === 2 ? "oklch(0.7 0.02 255)" : "oklch(0.62 0.12 55)";
              return (
                <div key={r.id} className="flex min-w-0 max-w-[220px] flex-1 flex-col items-center text-center">
                  <span className={cx("mb-2.5 text-xs font-extrabold uppercase tracking-[0.08em]", medal)}>{["1st", "2nd", "3rd"][r.rank - 1]}</span>
                  <span
                    className={cx("grid place-items-center rounded-full border-4 border-card font-extrabold text-white", first ? "size-22 text-[28px] tablet:size-24" : "size-16 text-xl tablet:size-[72px]")}
                    style={{ background: r.avatarColor, boxShadow: `0 0 0 3px ${ring}, 0 18px 30px -14px rgb(0 0 0 / 0.4)` }}
                  >
                    {r.name[0]}
                  </span>
                  <span className={cx("mt-3 max-w-full truncate font-extrabold tracking-[-0.02em]", first ? "text-lg" : "text-[15px]")}>{short(r.name)}{r.me && " (you)"}</span>
                  <span className="mt-0.5 text-[13px] text-muted-foreground">{classLabel(r.classLevel)}</span>
                  <span className="mt-2 text-[15px] font-extrabold text-xp">{r.xp.toLocaleString("en-IN")} XP</span>
                  <span
                    className={cx("mt-4 grid w-full place-items-start justify-center rounded-t-xl pt-3.5 font-black leading-none tracking-[-0.05em]", first ? "h-36 bg-foreground text-[56px] text-white" : r.rank === 2 ? "h-26 bg-muted text-[44px] text-foreground" : "h-20 bg-muted text-[40px] text-foreground")}
                  >
                    {r.rank}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div ref={sentinel} aria-hidden className="h-px" />
      <div className={cx("sticky top-[67px] z-30 border-b transition-colors", stuck ? "border-border bg-card/90 backdrop-blur-lg" : "border-transparent")}>
        <div className="mx-auto flex w-[min(1000px,calc(100%-var(--gutter)*2))] flex-wrap items-center gap-x-3 gap-y-2.5 py-3">
          <div className="flex shrink-0 gap-0.5 rounded-lg bg-foreground p-1">
            {Object.entries(periods).map(([k, label]) => (
              <Link key={k} href={`/leaderboard?p=${k}`} scroll={false} aria-current={k === period ? "page" : undefined} className={cx("tap relative whitespace-nowrap rounded-md px-3 py-[7px] text-[13px] font-bold", k === period ? "bg-card text-foreground" : "text-white/75 hover:text-white")}>
                {label}
              </Link>
            ))}
          </div>
          {classes.length > 0 && (
            <div className="flex shrink-0 gap-1.5">
              {(["all", ...classes] as const).map((c) => (
                <button key={c} type="button" onClick={() => setCls(c)} aria-pressed={cls === c} className={cx("tap relative whitespace-nowrap rounded-lg border px-3 py-2 text-[13px] font-bold", cls === c ? "border-foreground bg-foreground text-white" : "border-border bg-card text-foreground")}>
                  {c === "all" ? "All" : classLabel(c)}
                </button>
              ))}
            </div>
          )}
          {rows.length > 0 && (
          <label className="flex h-10 flex-[1_1_220px] items-center gap-2 rounded-lg border border-border bg-card px-3">
            <svg className="size-[15px] shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a name" aria-label="Search a name" className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground" />
            {q && <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="grid size-5.5 shrink-0 place-items-center rounded-full bg-muted text-[13px] leading-none">×</button>}
          </label>
          )}
        </div>
      </div>

      <section className="pb-14 pt-5">
        <div className="mx-auto w-[min(1000px,calc(100%-var(--gutter)*2))]">
          <div className="flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
            <span className="w-12 shrink-0">Rank</span>
            <span className="flex-1">Student</span>
            <span className="hidden w-20 shrink-0 tablet:block">Class</span>
            <span className="hidden w-[90px] shrink-0 tablet:block">Streak</span>
            <span className="w-[100px] shrink-0 text-right">XP</span>
          </div>
          <ol>
            {filtered.map((r, i) => (
              <li
                key={r.id}
                className={cx("flex h-16 animate-mf-rise items-center gap-3.5 border-b border-border px-4", r.me && "rounded-lg bg-selected")}
                style={{ animationDelay: `${Math.min(i, 15) * 25}ms` }}
              >
                <span className={cx("w-12 shrink-0 text-base font-extrabold", r.rank <= 3 ? "text-foreground" : "text-muted-foreground")}>{r.rank}</span>
                <span className="grid size-[38px] shrink-0 place-items-center rounded-full text-sm font-extrabold text-white" style={{ background: r.avatarColor }}>{r.name[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">{r.name}{r.me && " (you)"}</span>
                  <span className="block text-xs text-muted-foreground">Level {r.level}<span className="tablet:hidden"> · {classLabel(r.classLevel)}</span></span>
                </span>
                <span className="hidden w-20 shrink-0 text-sm font-semibold text-secondary-foreground tablet:block">{classLabel(r.classLevel)}</span>
                <span className="hidden w-[90px] shrink-0 text-sm font-semibold text-secondary-foreground tablet:block">{r.streak > 0 ? `${r.streak} day${r.streak === 1 ? "" : "s"}` : "—"}</span>
                <span className="w-[100px] shrink-0 text-right text-base font-extrabold text-xp">{r.xp.toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ol>
          {rows.length === 0 && (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted px-4 py-3 text-sm text-secondary-foreground">
                <Sample />
                <span>These rows only show how the board will look. They are not real students.</span>
              </div>
              <ol className="select-none opacity-60 grayscale" aria-label="Sample leaderboard rows, not real students">
                {SAMPLE_ROWS.map((r, i) => (
                  <li key={r.name} className="flex h-16 items-center gap-3.5 border-b border-border px-4">
                    <span className="w-12 shrink-0 text-base font-extrabold text-muted-foreground">{i + 1}</span>
                    <span aria-hidden className="grid size-[38px] shrink-0 place-items-center rounded-full bg-muted-foreground/50 text-sm font-extrabold text-white">{r.name.slice(-1)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[15px] font-bold"><span className="truncate">{r.name}</span><Sample /></span>
                      <span className="block text-xs text-muted-foreground tablet:hidden">{r.cls}</span>
                    </span>
                    <span className="hidden w-20 shrink-0 text-sm font-semibold text-secondary-foreground tablet:block">{r.cls}</span>
                    <span className="hidden w-[90px] shrink-0 text-sm font-semibold text-secondary-foreground tablet:block">—</span>
                    <span className="w-[100px] shrink-0 text-right text-base font-extrabold text-muted-foreground">{r.xp.toLocaleString("en-IN")}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
          {rows.length > 0 && filtered.length === 0 && (
            <div className="px-6 py-14 text-center">
              <div className="text-[22px] font-extrabold tracking-[-0.02em]">{q ? `No one called “${q}” here` : "No one in this class yet"}</div>
              <button type="button" onClick={() => { setQ(""); setCls("all"); }} className="mt-4 rounded-lg bg-foreground px-4 py-2.5 text-sm font-bold text-white">Show everyone</button>
            </div>
          )}
          {rows.length > 0 && <p className="mt-5 text-center text-sm text-muted-foreground">Showing the top {rows.length} students. Rankings refresh when you reload the page.</p>}

          {signedIn && rows.length > 0 && (
            <div className="sticky bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 mt-6 flex h-[68px] items-center gap-3.5 rounded-xl bg-foreground px-4 text-white shadow-[0_24px_44px_-18px_rgb(0_0_0/0.5)] tablet:bottom-4">
              {me ? (
                <>
                  <span className="shrink-0 text-base font-extrabold text-brand-2">#{me.rank}</span>
                  <span className="grid size-[38px] shrink-0 place-items-center rounded-full text-sm font-extrabold" style={{ background: me.avatarColor }}>{me.name[0]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold">{short(me.name)} (you)</span>
                    <span className="block truncate text-xs text-white/65">{above ? `${(above.xp - me.xp + 1).toLocaleString("en-IN")} XP to pass ${short(above.name)}` : "You're top of the board"}</span>
                  </span>
                  <span className="shrink-0 text-base font-extrabold">{me.xp.toLocaleString("en-IN")} XP</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-white/80">You&apos;re not in the top {rows.length} yet. Solve a practice set to climb.</span>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Sample() {
  return <span className="shrink-0 rounded-md border border-border bg-card px-1.5 py-0.5 text-xs font-extrabold uppercase tracking-[0.06em] text-secondary-foreground">Sample</span>;
}
