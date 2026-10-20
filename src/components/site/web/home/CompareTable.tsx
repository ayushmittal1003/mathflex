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
    <section id="compare" className="py-12 tablet:py-22">
      <SectionHead eyebrow="Why Mathflex" dot="ok" title={<>Same goal. A <Mark>fraction</Mark> of the price.</>} />
      <div className="mx-auto mt-10 grid w-[min(640px,calc(100%-var(--gutter)*2))] gap-3 min-[860px]:mt-12 min-[860px]:w-[min(1120px,calc(100%-var(--gutter)*2))] min-[860px]:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))] min-[860px]:gap-0">
        <div className="hidden min-[860px]:block" />
        <div className="hidden rounded-t-xl border-2 border-b-0 border-primary bg-selected px-3 py-5 text-center min-[860px]:block">
          <div className="text-lg font-extrabold tracking-[-0.025em]">{wordmark}</div>
        </div>
        {comparison.columns.map((c) => <div key={c} className="hidden px-3 py-5 text-center text-[15px] font-bold text-muted-foreground min-[860px]:block">{c}</div>)}

        {rows.map((r, ri) => {
          const last = ri === rows.length - 1;
          return (
            <div key={r.label} className="max-[859px]:rounded-xl max-[859px]:border max-[859px]:border-border max-[859px]:bg-card max-[859px]:p-4 min-[860px]:contents">
              <div className="text-base font-extrabold leading-snug min-[860px]:border-t min-[860px]:border-border min-[860px]:py-4.5 min-[860px]:pr-3 min-[860px]:text-[15px] min-[860px]:font-bold">{r.label}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 max-[359px]:grid-cols-1 min-[860px]:contents">
                {r.cells.map((cell, ci) => {
                  const us = ci === 0;
                  return (
                    <div
                      key={ci}
                      className={cx(
                        us
                          ? "col-span-3 max-[359px]:col-span-1 flex items-center justify-between gap-3 rounded-lg border-2 border-primary bg-selected px-3.5 py-3 font-extrabold text-foreground min-[860px]:col-span-1 min-[860px]:justify-center min-[860px]:rounded-none min-[860px]:border-0 min-[860px]:border-t min-[860px]:border-x-2 min-[860px]:border-primary min-[860px]:border-t-border min-[860px]:px-3 min-[860px]:py-4.5 min-[860px]:text-center min-[860px]:text-sm"
                          : "flex flex-col items-start gap-1.5 max-[359px]:flex-row max-[359px]:items-center max-[359px]:justify-between rounded-lg bg-muted/60 px-3 py-2.5 text-sm font-medium text-muted-foreground min-[860px]:items-center min-[860px]:justify-center min-[860px]:gap-0 min-[860px]:rounded-none min-[860px]:border-t min-[860px]:border-border min-[860px]:bg-transparent min-[860px]:px-3 min-[860px]:py-4.5 min-[860px]:text-center",
                        us && last && "min-[860px]:rounded-b-xl min-[860px]:border-b-2",
                      )}
                    >
                      <span className={cx("text-xs font-bold min-[860px]:hidden", us ? "text-foreground" : "text-muted-foreground")}>{us ? wordmark : comparison.columns[ci - 1]}</span>
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
