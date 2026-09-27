"use client";
import { useState } from "react";

// Single-series bar chart with hover tooltip (admin revenue etc.).
export function Bars({ data, format }: { data: { label: string; value: number }[]; format: "inr" | "count" }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = (v: number) => (format === "inr" ? `₹${v.toLocaleString("en-IN")}` : v.toLocaleString("en-IN"));
  return (
    <div>
      <div className="relative flex h-40 items-end gap-[2px] border-b border-border" onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div key={d.label} className="relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
            <div className="w-full rounded-t-[4px] bg-brand transition-opacity" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 2 : 0, opacity: hover === null || hover === i ? 1 : 0.35 }} />
            {hover === i && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg">
                <p className="text-muted">{d.label}</p>
                <p className="font-bold">{fmt(d.value)}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted"><span>{data[0]?.label}</span><span>{data[data.length - 1]?.label}</span></div>
      <table className="sr-only"><tbody>{data.map((d) => <tr key={d.label}><th>{d.label}</th><td>{fmt(d.value)}</td></tr>)}</tbody></table>
    </div>
  );
}
