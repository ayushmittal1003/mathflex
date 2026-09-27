"use client";
import { useState } from "react";

export type Series = { label: string; full: string; xp: number; questions: number }[];

// Single-series XP bar chart with a period switch. One hue (brand), thin rounded
// bars, recessive grid, per-bar hover tooltip, and a table fallback for screen readers.
export function ActivityChart({ daily, weekly, monthly }: { daily: Series; weekly: Series; monthly: Series }) {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [hover, setHover] = useState<number | null>(null);
  const data = { daily, weekly, monthly }[period];
  const max = Math.max(50, ...data.map((d) => d.xp));
  const nice = Math.ceil(max / 50) * 50;
  const total = data.reduce((s, d) => s + d.xp, 0);
  const h = 180;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">XP earned</h3>
          <p className="text-sm text-muted">{total.toLocaleString("en-IN")} XP {period === "daily" ? "in the last 14 days" : period === "weekly" ? "in the last 12 weeks" : "in the last 6 months"}</p>
        </div>
        <div className="flex gap-1 rounded-full bg-surface-2 p-1 text-sm font-semibold">
          {(["daily", "weekly", "monthly"] as const).map((p) => (
            <button key={p} onClick={() => { setPeriod(p); setHover(null); }} className={`rounded-full px-3 py-1.5 capitalize ${period === p ? "bg-surface shadow" : "text-muted"}`}>{p}</button>
          ))}
        </div>
      </div>

      <div className="relative mt-6 flex gap-2" aria-hidden>
        <div className="flex h-[180px] flex-col justify-between text-right text-[11px] text-muted">
          <span>{nice}</span><span>{nice / 2}</span><span>0</span>
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-border" />
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
          <div className="absolute inset-x-0 bottom-0 border-t border-border" />
          <div className="relative flex h-[180px] items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => (
              <div
                key={d.full}
                className="group relative flex h-full flex-1 cursor-default items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onTouchStart={() => setHover(i)}
              >
                <div
                  className="w-full max-w-7 rounded-t-[4px] transition-[height,opacity] duration-500"
                  style={{ height: `${(d.xp / nice) * h}px`, background: "var(--brand)", opacity: hover === null || hover === i ? 1 : 0.35, minHeight: d.xp ? 2 : 0 }}
                />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg">
                    <p className="font-semibold text-muted">{d.full}</p>
                    <p className="font-bold text-fg">{d.xp} XP</p>
                    <p className="text-muted">{d.questions} questions</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-[2px] text-[10px] text-muted">
            {data.map((d, i) => (
              <span key={d.full} className="flex-1 text-center">{data.length > 8 && i % 2 ? "" : d.label}</span>
            ))}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>XP per {period} period</caption>
        <tbody>{data.map((d) => <tr key={d.full}><th>{d.full}</th><td>{d.xp} XP</td><td>{d.questions} questions</td></tr>)}</tbody>
      </table>
    </div>
  );
}
