import { CheckIcon } from "../primitives";
import { cx } from "../ui";

// "What you get" illustrations on /book-a-call: small framed product screens (design.md §3.4)
// using real chapter names. Scores, weeks and minutes are illustrative examples.

function Window({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[280px] overflow-hidden rounded-[10px] border-[3px] border-foreground bg-card shadow-[0_22px_40px_-22px_rgb(80_20_0/0.55)]">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex gap-1" aria-hidden>
          <i className="size-1.5 rounded-full bg-primary/70" />
          <i className="size-1.5 rounded-full bg-gold/80" />
          <i className="size-1.5 rounded-full bg-ok/70" />
        </span>
        <span className="truncate font-mono text-[10px] font-bold text-muted-foreground">{title}</span>
        {badge && <span className="ml-auto shrink-0">{badge}</span>}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

export function DiagnosisVisual({ chapters }: { chapters: string[] }) {
  const scores = [34, 78, 41, 86];
  const rows = (chapters.length >= 4 ? chapters : ["Chapter A", "Chapter B", "Chapter C", "Chapter D"]).slice(0, 4).map((t, i) => ({ t, v: scores[i], weak: scores[i] < 50 }));
  return (
    <Window title="mock-test-scores" badge={<span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-extrabold text-primary">2 to fix</span>}>
      <div className="grid gap-2.5">
        {rows.map((r) => (
          <div key={r.t}>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className={cx("truncate font-bold", r.weak ? "text-foreground" : "text-muted-foreground")}>{r.t}</span>
              <span className={cx("shrink-0 font-mono font-bold", r.weak ? "text-primary" : "text-muted-foreground")}>{r.v}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cx("h-full rounded-full", r.weak ? "bg-gradient-to-r from-primary to-brand-2" : "bg-[oklch(0.82_0.02_260)]")} style={{ width: `${r.v}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Window>
  );
}

export function PlanVisual({ chapters }: { chapters: string[] }) {
  const [a, b] = chapters.length >= 2 ? chapters : ["Weakest chapter", "Next chapter"];
  const weeks = [
    { w: "Week 1", t: a, st: "done" as const },
    { w: "Week 2", t: b, st: "now" as const },
    { w: "Week 3", t: "Revise + PYQs", st: "next" as const },
    { w: "Week 4", t: "Full mock test", st: "next" as const },
  ];
  return (
    <Window title="study-plan" badge={<span className="rounded bg-ok/14 px-1.5 py-0.5 text-[10px] font-extrabold text-[oklch(0.5_0.16_149)]">4 weeks</span>}>
      <ol className="relative grid gap-2">
        <span aria-hidden className="absolute bottom-3 left-[9px] top-3 w-px bg-border" />
        {weeks.map((x) => (
          <li key={x.w} className="relative flex items-center gap-2.5">
            <span className={cx("relative z-10 grid size-[19px] shrink-0 place-items-center rounded-full border-[1.5px]", x.st === "done" ? "border-ok bg-ok text-white" : x.st === "now" ? "border-primary bg-card" : "border-border bg-card")}>
              {x.st === "done" && <CheckIcon className="size-2.5" strokeWidth={4} />}
              {x.st === "now" && <i className="size-2 rounded-full bg-primary" />}
            </span>
            <span className={cx("flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 py-1.5", x.st === "now" && "bg-selected")}>
              <span className="min-w-0">
                <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{x.w}</span>
                <span className="block truncate text-[11px] font-bold">{x.t}</span>
              </span>
              {x.st === "now" && <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[9px] font-extrabold text-white">NOW</span>}
            </span>
          </li>
        ))}
      </ol>
    </Window>
  );
}

export function StrategyVisual() {
  const blocks = [
    { label: "Strong topics", w: 40, cls: "bg-primary" },
    { label: "The rest", w: 35, cls: "bg-brand-2" },
    { label: "Review", w: 25, cls: "bg-xp" },
  ];
  return (
    <Window title="exam-day-plan" badge={<span className="font-mono text-[10px] font-bold text-foreground">3:00:00</span>}>
      <div className="flex h-7 overflow-hidden rounded-md">
        {blocks.map((b) => (
          <div key={b.label} className={cx("h-full first:rounded-l-md last:rounded-r-md", b.cls)} style={{ width: `${b.w}%` }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[9px] font-bold text-muted-foreground"><span>0h</span><span>1h</span><span>2h</span><span>3h</span></div>
      <div className="mt-3 grid gap-1.5">
        {blocks.map((b, i) => (
          <div key={b.label} className="flex items-center gap-2 text-[11px]">
            <span className="grid size-4 shrink-0 place-items-center rounded bg-muted font-mono text-[9px] font-extrabold">{i + 1}</span>
            <i className={cx("size-2 rounded-sm", b.cls)} />
            <span className="font-bold">{b.label}</span>
            <span className="ml-auto font-mono font-bold text-muted-foreground">{b.w}%</span>
          </div>
        ))}
      </div>
    </Window>
  );
}
