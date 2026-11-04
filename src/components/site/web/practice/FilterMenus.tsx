"use client";
import { startTransition, useEffect, useOptimistic, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cx } from "../ui";

export type FilterMenu = {
  param: string;
  all: string; // shown when nothing is ticked, e.g. "All years"
  noun: string; // "3 years" once more than two are ticked
  options: { value: string; label: string; count: number }[];
};

// Checkbox dropdowns for the question bank. Each tick updates the URL straight away (values joined
// by commas, e.g. ?year=2023,2021) and the server page filters from there. Ticks show immediately,
// and all menus share one optimistic value so a quick second tick can't undo the first.
export function FilterMenus({ path, query, menus, selected }: { path: string; query: Record<string, string | undefined>; menus: FilterMenu[]; selected: Record<string, string[]> }) {
  const router = useRouter();
  const [current, setCurrent] = useOptimistic(selected);
  const [open, setOpen] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const change = (param: string, values: string[]) => {
    const next = { ...current, [param]: values };
    const lists = Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v.join(",")]));
    const qs = new URLSearchParams(Object.entries({ ...query, ...lists }).filter(([, v]) => v && v !== "all") as [string, string][]);
    startTransition(() => {
      setCurrent(next);
      router.replace(`${path}${qs.size ? `?${qs}` : ""}`, { scroll: false });
    });
  };

  return (
    <div
      ref={box}
      className="relative flex flex-wrap gap-2"
      onBlur={(e) => {
        if (e.relatedTarget && !box.current?.contains(e.relatedTarget)) setOpen(null);
      }}
    >
      {menus.map((m) => (
        <Menu
          key={m.param}
          menu={m}
          ticked={current[m.param] ?? []}
          open={open === m.param}
          onToggle={() => setOpen(open === m.param ? null : m.param)}
          onClose={() => setOpen(null)}
          onChange={(values) => change(m.param, values)}
        />
      ))}
    </div>
  );
}

function Menu({ menu, ticked, open, onToggle, onClose, onChange }: { menu: FilterMenu; ticked: string[]; open: boolean; onToggle: () => void; onClose: () => void; onChange: (values: string[]) => void }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const names = ticked.map((v) => menu.options.find((o) => o.value === v)?.label ?? v);
  const summary = !names.length ? menu.all : names.length > 2 ? `${names.length} ${menu.noun}` : names.join(", ");

  return (
    <div
      className="tablet:relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          onClose();
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cx(
          "tap relative inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition duration-200 ease-mf",
          names.length ? "border-foreground bg-foreground text-card" : "border-border bg-card text-secondary-foreground hover:border-foreground/40",
        )}
      >
        {summary}
        <ChevronDown className={cx("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div role="group" aria-label={menu.all} className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 animate-mf-rise overflow-y-auto rounded-xl border border-border bg-card p-1.5 text-foreground shadow-[0_30px_60px_-20px_rgb(80_20_0/0.35)] tablet:right-auto tablet:w-64">
          <Row label={menu.all} checked={!ticked.length} onChange={() => onChange([])} />
          <div className="mx-2 my-1 h-px bg-border" />
          {menu.options.map((o) => {
            const checked = ticked.includes(o.value);
            return (
              <Row
                key={o.value}
                label={o.label}
                count={o.count}
                checked={checked}
                disabled={!o.count && !checked}
                onChange={() => onChange(checked ? ticked.filter((v) => v !== o.value) : [...ticked, o.value])}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, count, checked, disabled, onChange }: { label: string; count?: number; checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <label className={cx("flex min-h-11 items-center gap-3 rounded-lg px-2.5 text-sm font-semibold", disabled ? "cursor-not-allowed text-muted-foreground/60" : "cursor-pointer hover:bg-muted")}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="size-4 shrink-0 accent-primary" />
      <span className="min-w-0 flex-1">{label}</span>
      {count !== undefined && <span className="text-xs tabular-nums text-muted-foreground">{count}</span>}
    </label>
  );
}
