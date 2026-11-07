"use client";
import { useRef, useState } from "react";

// Admin analytics charts, drawn as plain SVG/HTML. Colours: the current period wears the brand
// red; the comparison is a dashed neutral line; categorical slots 1–3 (blue, orange, aqua) are the
// validated reference palette, stepped separately for the dark admin theme.
const fmt = (v: number) => v.toLocaleString("en-IN");
const SERIES = "[--s1:#2a78d6] [--s2:#eb6834] [--s3:#1baf7a] [--s4:#8a8984] dark:[--s1:#3987e5] dark:[--s2:#d95926] dark:[--s3:#199e70] dark:[--s4:#8f8e88]";

// Line chart over days: this period (solid, with a soft area) against the same days of the period
// before (dashed). One y-axis; a crosshair and tooltip follow the pointer.
export function TrendChart({ labels, current, previous, name }: { labels: string[]; current: number[]; previous?: number[]; name: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const W = 1000, H = 220;
  const max = Math.max(1, ...current, ...(previous ?? []));
  const nice = (() => { const p = 10 ** Math.floor(Math.log10(max)); const m = max / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; })();
  const x = (i: number) => (labels.length <= 1 ? W / 2 : (i / (labels.length - 1)) * W);
  const y = (v: number) => H - (v / nice) * H;
  const line = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${line(current)}L${x(current.length - 1)},${H}L${x(0)},${H}Z`;
  const day = (s: string) => new Date(`${s}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const pick = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || !labels.length) return;
    setHover(Math.max(0, Math.min(labels.length - 1, Math.round(((clientX - r.left) / r.width) * (labels.length - 1)))));
  };
  if (!labels.length) return <p className="py-10 text-center text-sm text-muted">No data in this period.</p>;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-brand" /> {name}, this period</span>
        {previous && <span className="flex items-center gap-1.5"><span className="h-0 w-5 border-t-2 border-dashed border-current opacity-80" /> Previous period</span>}
      </div>
      <div className="grid grid-cols-[40px_1fr] gap-2">
        <div className="relative h-[220px] text-right text-[11px] tabular-nums text-muted">
          {[1, 0.5, 0].map((t) => <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t) * 100}%` }}>{fmt(Math.round(nice * t))}</span>)}
        </div>
        <div
          ref={box}
          className="relative h-[220px] touch-none"
          onPointerMove={(e) => pick(e.clientX)}
          onPointerDown={(e) => pick(e.clientX)}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`${name} per day`}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            {[0, 0.5, 1].map((t) => <line key={t} x1={0} x2={W} y1={H * t} y2={H * t} className="stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
            <defs>
              <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#trend-fill)" />
            {previous && <path d={line(previous)} fill="none" stroke="currentColor" className="text-muted" strokeWidth={2} strokeDasharray="6 5" strokeOpacity={0.8} vectorEffect="non-scaling-stroke" />}
            <path d={line(current)} fill="none" stroke="var(--color-brand)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} className="stroke-foreground/30" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
          </svg>
          {hover !== null && (
            <>
              <span className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-brand" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(current[hover]) / H) * 100}%` }} />
              <div
                className="pointer-events-none absolute top-0 z-10 min-w-[150px] rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg"
                style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > labels.length / 2 ? "calc(-100% - 10px)" : "10px"})` }}
              >
                <p className="font-semibold text-muted">{day(labels[hover])}</p>
                <p className="mt-0.5 flex justify-between gap-4"><span>This period</span><b className="tabular-nums">{fmt(current[hover])}</b></p>
                {previous && <p className="flex justify-between gap-4 text-muted"><span>Previous</span><span className="tabular-nums">{fmt(previous[hover] ?? 0)}</span></p>}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between pl-[48px] text-[11px] text-muted"><span>{day(labels[0])}</span>{labels.length > 2 && <span>{day(labels[Math.floor(labels.length / 2)])}</span>}<span>{day(labels[labels.length - 1])}</span></div>
      <table className="sr-only"><thead><tr><th>Day</th><th>This period</th>{previous && <th>Previous</th>}</tr></thead><tbody>{labels.map((l, i) => <tr key={l}><td>{l}</td><td>{current[i]}</td>{previous && <td>{previous[i]}</td>}</tr>)}</tbody></table>
    </div>
  );
}

// One whole split into a few parts (devices, logged in vs not): a tall segmented bar with a legend
// that carries each part's value and share, so identity never rests on colour alone.
export function SplitBar({ parts, unit = "people" }: { parts: { label: string; value: number }[]; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (!total) return <p className="py-4 text-sm text-muted">Nothing yet.</p>;
  const shown = parts.filter((p) => p.value > 0).slice(0, 4);
  const pct = (v: number) => Math.round((v / total) * 100);
  return (
    <div className={SERIES}>
      <div className="flex h-9 gap-[2px] overflow-hidden rounded-lg" onPointerLeave={() => setHover(null)}>
        {shown.map((p, i) => (
          <div
            key={p.label}
            title={`${p.label}: ${fmt(p.value)} ${unit} (${pct(p.value)}%)`}
            onPointerEnter={() => setHover(i)}
            className="h-full transition-opacity first:rounded-l-lg last:rounded-r-lg"
            style={{ width: `${(p.value / total) * 100}%`, background: `var(--s${i + 1})`, opacity: hover === null || hover === i ? 1 : 0.4 }}
          />
        ))}
      </div>
      <ul className="mt-3 grid gap-1.5">
        {shown.map((p, i) => (
          <li key={p.label} className={`flex items-center gap-2 rounded-md px-1 text-sm ${hover === i ? "bg-surface-2" : ""}`} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: `var(--s${i + 1})` }} />
            <span className="flex-1 capitalize">{p.label}</span>
            <span className="tabular-nums font-bold">{fmt(p.value)}</span>
            <span className="w-11 text-right tabular-nums text-muted">{pct(p.value)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
