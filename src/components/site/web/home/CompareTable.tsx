import { inr } from "@/lib/format";
import { comparison } from "@/lib/site-content";
import { CheckIcon, Mark, SectionHead } from "../primitives";
import { cx } from "../ui";

// 08 Comparison. Copy from site-content.ts; our own prices are live. A row whose live
// value is missing (no full-syllabus course, mentorship off) is hidden.
export function CompareTable({ fullPrice, callPrice }: { fullPrice: number | null; callPrice: number | null }) {
  const vars: Record<string, number | null> = { "{fullPrice}": fullPrice, "{callPrice}": callPrice };
  const rows = comparison.rows
    .filter((r) => r.cells.every((c) => typeof c !== "string" || !(c in vars) || vars[c] !== null))
    .map((r) => ({ ...r, cells: r.cells.map((c) => (typeof c === "string" && c in vars ? inr(vars[c]!) : c)) }));

  return (
    <section id="compare" className="py-22">
      <SectionHead eyebrow="Why Mathflex" dot="ok" title={<>Same goal. A <Mark>fraction</Mark> of the price.</>} />
      <div className="no-scrollbar mx-auto mt-12 w-[min(1120px,calc(100%-48px))] overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-[1.5fr_repeat(4,minmax(0,1fr))]">
          <div />
          <div className="rounded-t-xl border-2 border-b-0 border-primary bg-selected px-3 py-5 text-center">
            <div className="text-lg font-extrabold tracking-[-0.025em]">math<span className="text-primary">flex</span></div>
          </div>
          {comparison.columns.map((c) => <div key={c} className="px-3 py-5 text-center text-[15px] font-bold text-muted-foreground">{c}</div>)}

          {rows.map((r, ri) => {
            const last = ri === rows.length - 1;
            return [
              <div key={`${r.label}-l`} className="border-t border-border py-4.5 pr-3 text-[15px] font-bold">{r.label}</div>,
              ...r.cells.map((cell, ci) => {
                const us = ci === 0;
                return (
                  <div
                    key={`${r.label}-${ci}`}
                    className={cx(
                      "flex items-center justify-center border-t border-border px-3 py-4.5 text-center text-sm",
                      us ? "border-x-2 border-x-primary bg-selected font-extrabold text-foreground" : "font-medium text-muted-foreground",
                      us && last && "rounded-b-xl border-b-2 border-b-primary",
                    )}
                  >
                    {cell === true ? (
                      <span className="grid size-6.5 place-items-center rounded-full bg-ok/15 text-ok" aria-label="Yes"><CheckIcon className="size-3.5" strokeWidth={3.5} /></span>
                    ) : cell === false ? (
                      <span className="grid size-6.5 place-items-center rounded-full bg-muted text-muted-foreground" aria-label="No">
                        <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
                      </span>
                    ) : (
                      <span>{cell}</span>
                    )}
                  </div>
                );
              }),
            ];
          })}
        </div>
      </div>
    </section>
  );
}
