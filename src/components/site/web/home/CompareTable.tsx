import { inr } from "@/lib/format";
import { comparison } from "@/lib/site-content";
import type { Settings } from "@/lib/settings";
import { CheckIcon, Eyebrow, Marked } from "../primitives";
import { cx } from "../ui";

type Copy = Pick<Settings["home"], "compareKicker" | "compareTitle" | "compareColumns" | "compareRows">;

// 08 Comparison. Rows and columns come from site-content.ts and are switched on and off on
// Admin → Home page; our own full-syllabus price is live. A row whose live value is missing
// (no full-syllabus course, or the 1:1 call switched off) is hidden.
export function CompareTable({ fullPrice, hasCall, copy }: { fullPrice: number | null; hasCall: boolean; copy: Copy }) {
  const vars: Record<string, number | null> = { "{fullPrice}": fullPrice };
  const colOn = comparison.columns.map((c) => copy.compareColumns[c.key as keyof Copy["compareColumns"]] !== false);
  const columns = comparison.columns.filter((_, i) => colOn[i]).map((c) => c.label);
  const rows = comparison.rows
    .filter((r) => copy.compareRows[r.key as keyof Copy["compareRows"]] !== false && (r.key !== "mentorCall" || hasCall))
    .filter((r) => r.cells.every((c) => typeof c !== "string" || !(c in vars) || vars[c] !== null))
    .map((r) => ({ ...r, cells: [r.cells[0], ...r.cells.slice(1).filter((_, i) => colOn[i])].map((c) => (typeof c === "string" && c in vars ? inr(vars[c]!) : c)) }));
  const n = columns.length;

  // One DOM, two layouts: below 860px each row is a card (feature on top, Mathflex first and
  // highlighted, the others in a 3-up strip with their names); from 860px it is the grid.
  const wordmark = <>math<span className="text-[color-mix(in_oklab,var(--primary)_90%,black)]">flex</span></>;
  const value = (cell: string | boolean) =>
    cell === true ? (
      <span role="img" className="grid size-6.5 place-items-center rounded-full bg-ok/15 text-ok" aria-label="Yes"><CheckIcon className="size-3.5" strokeWidth={3.5} /></span>
    ) : cell === false ? (
      <span role="img" className="grid size-6.5 place-items-center rounded-full bg-muted text-muted-foreground" aria-label="No">
        <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
      </span>
    ) : (
      <span>{cell}</span>
    );

  return (
    <section id="compare" className="py-9 tablet:py-14">
      <div className="px-4 text-center tablet:px-6">
        <Eyebrow dot="ok">Why Mathflex</Eyebrow>
        {/* Two lines: a quiet set-up, then the promise in full weight. */}
        <h2 className="mx-auto mt-5 max-w-[900px] text-balance tablet:mt-6">
          {copy.compareKicker && <span className="block text-[clamp(20px,2.6vw,32px)] font-bold tracking-[-0.025em] text-muted-foreground">{copy.compareKicker}</span>}
          <span className="mt-1.5 block text-[clamp(32px,5.6vw,68px)] font-extrabold leading-[1.05] tracking-[-0.045em]"><Marked text={copy.compareTitle} /></span>
        </h2>
      </div>
      <div
        className="mx-auto mt-10 grid w-[min(640px,calc(100%-var(--gutter)*2))] gap-3 min-[860px]:mt-12 min-[860px]:w-[min(1120px,calc(100%-var(--gutter)*2))] min-[860px]:grid-cols-[var(--cols)] min-[860px]:gap-0"
        style={{ "--cols": `1.5fr repeat(${n + 1},minmax(0,1fr))`, "--n": String(Math.max(n, 1)) } as React.CSSProperties}
      >
        <div className="hidden min-[860px]:block" />
        <div className="hidden rounded-t-xl border-2 border-b-0 border-primary bg-selected px-3 py-5 text-center min-[860px]:block">
          <div className="text-lg font-extrabold tracking-[-0.025em]">{wordmark}</div>
        </div>
        {columns.map((c) => <div key={c} className="hidden px-3 py-5 text-center text-[15px] font-bold text-muted-foreground min-[860px]:block">{c}</div>)}

        {rows.map((r, ri) => {
          const last = ri === rows.length - 1;
          return (
            <div key={r.label} className="max-[859px]:rounded-xl max-[859px]:border max-[859px]:border-border max-[859px]:bg-card max-[859px]:p-3.5 min-[860px]:contents">
              <div className="text-base font-extrabold leading-snug min-[860px]:border-t min-[860px]:border-border min-[860px]:py-4.5 min-[860px]:pr-3 min-[860px]:text-[15px] min-[860px]:font-bold">{r.label}</div>
              <div className="mt-2.5 grid grid-cols-[repeat(var(--n),minmax(0,1fr))] gap-1.5 max-[359px]:grid-cols-1 min-[860px]:contents">
                {r.cells.map((cell, ci) => {
                  const us = ci === 0;
                  return (
                    <div
                      key={ci}
                      className={cx(
                        us
                          ? "col-span-full flex items-center justify-between gap-3 rounded-lg border-2 border-primary bg-selected px-3.5 py-2.5 font-extrabold text-foreground min-[860px]:col-span-1 min-[860px]:justify-center min-[860px]:rounded-none min-[860px]:border-0 min-[860px]:border-t min-[860px]:border-x-2 min-[860px]:border-primary min-[860px]:border-t-border min-[860px]:px-3 min-[860px]:py-4.5 min-[860px]:text-center min-[860px]:text-sm"
                          : "flex flex-col items-start gap-1 max-[359px]:flex-row max-[359px]:items-center max-[359px]:justify-between rounded-lg bg-muted/60 px-2.5 py-2 text-[13px] font-medium leading-snug min-[860px]:text-sm text-muted-foreground min-[860px]:items-center min-[860px]:justify-center min-[860px]:gap-0 min-[860px]:rounded-none min-[860px]:border-t min-[860px]:border-border min-[860px]:bg-transparent min-[860px]:px-3 min-[860px]:py-4.5 min-[860px]:text-center",
                        us && last && "min-[860px]:rounded-b-xl min-[860px]:border-b-2",
                      )}
                    >
                      <span className={cx("text-[11px] font-bold leading-tight min-[860px]:hidden", us ? "text-foreground" : "text-muted-foreground")}>{us ? wordmark : columns[ci - 1]}</span>
                      {value(cell)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
