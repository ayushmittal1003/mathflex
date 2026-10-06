import { cx } from "./ui";

// Loading placeholders (loading.tsx) in the site's shapes. Only used on routes where an
// early 200 doesn't matter (signed-in pages, listings, the player); see design.md §6.
const bar = "animate-pulse rounded-md bg-muted";
const card = "rounded-xl border border-border bg-card";

function Head({ wide = false }: { wide?: boolean }) {
  return (
    <>
      <div className={cx(bar, "h-10", wide ? "w-[min(560px,80%)]" : "w-[min(380px,70%)]")} />
      <div className={cx(bar, "mt-3 h-4 w-[min(420px,60%)]")} />
    </>
  );
}

function CardGrid({ n = 3 }: { n?: number }) {
  return (
    <div className="grid gap-5 min-[600px]:grid-cols-2 min-[1000px]:grid-cols-3">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={cx(card, "overflow-hidden")}>
          <div className="aspect-video animate-pulse bg-muted" />
          <div className="space-y-2.5 p-5">
            <div className={cx(bar, "h-4 w-3/4")} />
            <div className={cx(bar, "h-3 w-1/2")} />
          </div>
        </div>
      ))}
    </div>
  );
}

const wrap = "mx-auto w-[min(1240px,calc(100%-48px))] pb-24 pt-[calc(86px+36px)]";

// My Learning, Practice: greeting, a stats strip, a feature card and a grid.
export function DashboardSkeleton() {
  return (
    <div className={wrap} role="status" aria-label="Loading">
      <Head />
      <div className={cx(card, "mt-7 grid grid-cols-2 gap-px overflow-hidden bg-border min-[1000px]:grid-cols-6")}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-2.5 bg-card p-5">
            <div className={cx(bar, "h-3 w-16")} />
            <div className={cx(bar, "h-7 w-20")} />
          </div>
        ))}
      </div>
      <div className={cx(card, "mt-10 h-[260px] animate-pulse bg-muted/60")} />
      <div className="mt-12"><CardGrid /></div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

// Chapters, Courses: centred heading, filter chips and a card grid.
export function ListingSkeleton() {
  return (
    <div className={wrap} role="status" aria-label="Loading">
      <div className="flex flex-col items-center">
        <div className={cx(bar, "h-6 w-40 rounded-full")} />
        <div className={cx(bar, "mt-5 h-12 w-[min(620px,85%)]")} />
        <div className={cx(bar, "mt-4 h-4 w-[min(460px,70%)]")} />
      </div>
      <div className="mt-12 flex gap-2">
        {[64, 96, 96, 120].map((w, i) => <div key={i} className={cx(bar, "h-10 rounded-full")} style={{ width: w }} />)}
      </div>
      <div className="mt-8"><CardGrid n={6} /></div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

// Profile, Plans, chapter practice: a header card and stacked rows.
export function DetailSkeleton() {
  return (
    <div className="mx-auto w-[min(1120px,calc(100%-48px))] pb-24 pt-[calc(86px+36px)]" role="status" aria-label="Loading">
      <Head wide />
      <div className={cx(card, "mt-8 h-[180px] animate-pulse bg-muted/60")} />
      <div className="mt-8 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cx(card, "flex items-center gap-4 p-5")}>
            <div className="size-14 flex-none animate-pulse rounded-xl bg-muted" />
            <div className="flex-1 space-y-2.5">
              <div className={cx(bar, "h-4 w-1/2")} />
              <div className={cx(bar, "h-3 w-1/3")} />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

// Lesson player: dark video frame and the parts list.
export function PlayerSkeleton() {
  return (
    <div className="mx-auto grid w-[min(1320px,calc(100%-32px))] gap-5 pb-16 pt-20 min-[1000px]:grid-cols-[minmax(0,1fr)_360px]" role="status" aria-label="Loading">
      <div>
        <div className="aspect-video animate-pulse rounded-xl bg-foreground/90" />
        <div className={cx(bar, "mt-5 h-7 w-2/3")} />
        <div className={cx(bar, "mt-3 h-4 w-1/3")} />
      </div>
      <div className={cx(card, "space-y-3 p-4")}>
        {[0, 1, 2, 3].map((i) => <div key={i} className={cx(bar, "h-14")} />)}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
