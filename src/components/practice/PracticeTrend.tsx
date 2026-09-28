"use client";
import { useState } from "react";

type Day = { label: string; attempted: number; correct: number };

// Questions practised per day (single series, brand hue). Correct count and accuracy
// live in the tooltip and the screen-reader table rather than as a second colour.
export function PracticeTrend({ data }: { data: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(10, ...data.map((d) => d.attempted));
  const nice = Math.ceil(max / 10) * 10;
  const total = data.reduce((s, d) => s + d.attempted, 0);
  const h = 160;

  return (
    <div className="card p-5">
      <h3 className="font-bold">Questions practised</h3>
      <p className="text-sm text-muted">{total} in the last 14 days</p>

      <div className="relative mt-6 flex gap-2" aria-hidden>
        <div className="flex h-[160px] flex-col justify-between text-right text-[11px] text-muted">
          <span>{nice}</span><span>{nice / 2}</span><span>0</span>
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-border" />
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
          <div className="absolute inset-x-0 bottom-0 border-t border-border" />
          <div className="relative flex h-[160px] items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => (
              <div key={d.label} className="relative flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
                <div
                  className="w-full max-w-7 rounded-t-[4px] transition-[height,opacity] duration-500"
                  style={{ height: `${(d.attempted / nice) * h}px`, background: "var(--brand)", opacity: hover === null || hover === i ? 1 : 0.35, minHeight: d.attempted ? 2 : 0 }}
                />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg">
                    <p className="font-semibold text-muted">{d.label}</p>
                    <p className="font-bold text-fg">{d.attempted} questions</p>
                    {d.attempted > 0 && <p className="text-muted">{d.correct} correct · {Math.round((d.correct / d.attempted) * 100)}%</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-[2px] text-[10px] text-muted">
            {data.map((d, i) => <span key={d.label} className="flex-1 text-center">{i % 2 ? "" : d.label.split(" ")[0]}</span>)}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>Questions practised per day</caption>
        <tbody>{data.map((d) => <tr key={d.label}><th>{d.label}</th><td>{d.attempted} questions</td><td>{d.correct} correct</td></tr>)}</tbody>
      </table>
    </div>
  );
}
