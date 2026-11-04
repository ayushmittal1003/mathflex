"use client";
import { startTransition, useEffect, useOptimistic, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { cx } from "../ui";

export type FilterGroup = {
  param: string;
  title: string;
  all: string; // the row that clears this group, e.g. "All years"
  multi?: boolean; // checkboxes (several values) rather than radio buttons (one value)
  compact?: boolean; // two rows side by side, for long lists of short labels like years
  options: { value: string; label: string; count: number }[];
};

// The one Filters button for the question bank. `children` sits beside it (the mode tabs). Each choice
// updates the URL straight away (several values are joined by commas, e.g. ?year=2023,2021) and the
// server page filters from there. Choices show immediately, and all groups share one optimistic value
// so a quick second tick can't undo the first.
export function PracticeFilters({ path, query, groups, picked, children }: { path: string; query: Record<string, string | undefined>; groups: FilterGroup[]; picked: Record<string, string[]>; children: React.ReactNode }) {
  const router = useRouter();
  const [current, setCurrent] = useOptimistic(picked);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.scrollIntoView({ block: "nearest" });
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const apply = (next: Record<string, string[]>) => {
    const lists = Object.fromEntries(groups.map((g) => [g.param, (next[g.param] ?? []).join(",")]));
    const qs = new URLSearchParams(Object.entries({ ...query, ...lists }).filter(([, v]) => v && v !== "all") as [string, string][]);
    startTransition(() => {
      setCurrent(next);
      router.replace(`${path}${qs.size ? `?${qs}` : ""}`, { scroll: false });
    });
  };
  const change = (param: string, values: string[]) => apply({ ...current, [param]: values });
  const clearAll = () => apply({});

  const active = groups.flatMap((g) => (current[g.param] ?? []).map((value) => ({ param: g.param, value, label: g.options.find((o) => o.value === value)?.label ?? value })));

  return (
    <>
      <div
        ref={box}
        className="relative flex flex-col items-start gap-3 tablet:flex-row tablet:justify-between"
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            setOpen(false);
            trigger.current?.focus();
          }
        }}
        onBlur={(e) => {
          if (e.relatedTarget && !box.current?.contains(e.relatedTarget)) setOpen(false);
        }}
      >
        <div className="min-w-0">{children}</div>
        <div className="shrink-0 tablet:relative">
          <button
            ref={trigger}
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-bold transition hover:border-foreground/40"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters
            {active.length > 0 && <span className="grid size-5 place-items-center rounded-full bg-primary text-xs font-extrabold tabular-nums text-primary-foreground">{active.length}</span>}
          </button>
          {open && (
            <div ref={panel} role="group" aria-label="Filters" className="absolute inset-x-0 top-full z-30 mt-2 flex max-h-[min(72vh,620px)] scroll-mb-24 scroll-mt-24 animate-mf-rise flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-[0_30px_60px_-20px_rgb(80_20_0/0.35)] tablet:left-auto tablet:right-0 tablet:w-[600px]">
              <div className="min-h-0 flex-1 gap-4 overflow-y-auto p-3 tablet:columns-2">
                {groups.map((g) => {
                  const values = current[g.param] ?? [];
                  return (
                    <fieldset key={g.param} className="mb-3 break-inside-avoid">
                      <legend className="px-2.5 pb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">{g.title}</legend>
                      <Row name={g.param} multi={g.multi} label={g.all} checked={!values.length} onChange={() => change(g.param, [])} />
                      <div className={cx(g.compact && "grid grid-cols-2")}>
                        {g.options.map((o) => {
                          const checked = values.includes(o.value);
                          return (
                            <Row
                              key={o.value}
                              name={g.param}
                              multi={g.multi}
                              label={o.label}
                              count={o.count}
                              checked={checked}
                              disabled={!o.count && !checked}
                              onChange={() => change(g.param, !g.multi ? [o.value] : checked ? values.filter((v) => v !== o.value) : [...values, o.value])}
                            />
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 border-t border-border p-3">
                <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-lg bg-foreground px-5 text-sm font-bold text-card">Done</button>
                <button type="button" onClick={clearAll} disabled={!active.length} className="h-11 rounded-lg px-4 text-sm font-bold text-muted-foreground hover:text-foreground disabled:opacity-50">Clear all</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {active.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {active.map((a) => (
            <button
              key={`${a.param}:${a.value}`}
              type="button"
              onClick={() => change(a.param, (current[a.param] ?? []).filter((v) => v !== a.value))}
              aria-label={`Remove filter: ${a.label}`}
              className="tap relative inline-flex items-center gap-1.5 rounded-full bg-muted py-1.5 pl-3 pr-2 text-sm font-semibold transition hover:bg-selected"
            >
              {a.label}
              <X className="size-3.5" aria-hidden />
            </button>
          ))}
          <button type="button" onClick={clearAll} className="tap relative px-2 py-1.5 text-sm font-bold text-muted-foreground hover:text-foreground">Clear all</button>
        </div>
      )}
    </>
  );
}

function Row({ name, multi, label, count, checked, disabled, onChange }: { name: string; multi?: boolean; label: string; count?: number; checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <label className={cx("flex min-h-11 items-center gap-3 rounded-lg px-2.5 text-sm font-semibold", disabled ? "cursor-not-allowed text-muted-foreground/60" : "cursor-pointer hover:bg-muted")}>
      <input type={multi ? "checkbox" : "radio"} name={multi ? undefined : name} checked={checked} disabled={disabled} onChange={onChange} className="size-4 shrink-0 accent-primary" />
      <span className="min-w-0 flex-1">{label}</span>
      {count !== undefined && <span className="text-xs tabular-nums text-muted-foreground">{count}</span>}
    </label>
  );
}
