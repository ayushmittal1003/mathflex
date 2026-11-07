"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2, X } from "lucide-react";

const PRESETS = [["1", "24h"], ["7", "7d"], ["30", "30d"], ["90", "90d"]] as const;
const COUNTRY = (c: string) => {
  if (c === "??") return "Unknown";
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(c) ?? c; } catch { return c; }
};

// Analytics filter bar: every change updates the URL, so the page (and any tab) re-renders with it
// and the view can be bookmarked or shared.
export function AnalyticsFilters({ sources, countries }: { sources: string[]; countries: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const get = (k: string) => params.get(k) ?? "";

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  const custom = !!get("from") && !!get("to");
  const preset = custom ? "custom" : get("days") || "7";
  const active = (["device", "source", "country", "who", "path"] as const).filter((k) => get(k));
  const select = "h-9 rounded-lg border border-border bg-surface px-2.5 text-sm font-semibold outline-none focus:border-brand";

  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-surface-2 p-0.5">
          {PRESETS.map(([d, l]) => (
            <button key={d} type="button" onClick={() => set({ days: d, from: null, to: null })} className={`rounded-md px-3 py-1.5 text-sm font-bold ${preset === d ? "bg-brand text-white" : "hover:bg-border"}`}>{l}</button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-xs font-semibold text-muted">
          <input type="date" value={get("from")} onChange={(e) => set({ from: e.target.value || null, to: get("to") || e.target.value || null, days: null })} className={`${select} ${custom ? "border-brand" : ""}`} aria-label="From date" />
          –
          <input type="date" value={get("to")} onChange={(e) => set({ to: e.target.value || null, from: get("from") || e.target.value || null, days: null })} className={`${select} ${custom ? "border-brand" : ""}`} aria-label="To date" />
        </label>
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <select value={get("device")} onChange={(e) => set({ device: e.target.value || null })} className={select} aria-label="Device">
          <option value="">All devices</option><option value="mobile">Mobile</option><option value="tablet">Tablet</option><option value="desktop">Desktop</option>
        </select>
        <select value={get("source")} onChange={(e) => set({ source: e.target.value || null })} className={`${select} max-w-[180px]`} aria-label="Source">
          <option value="">All sources</option>
          {[...new Set([...(get("source") ? [get("source")] : []), ...sources])].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={get("country")} onChange={(e) => set({ country: e.target.value || null })} className={select} aria-label="Country">
          <option value="">All countries</option>
          {countries.map((c) => <option key={c} value={c}>{COUNTRY(c)}</option>)}
        </select>
        <select value={get("who")} onChange={(e) => set({ who: e.target.value || null })} className={select} aria-label="Visitor type">
          <option value="">Everyone</option><option value="user">Logged in</option><option value="visitor">Not logged in</option>
        </select>
        <form onSubmit={(e) => { e.preventDefault(); set({ path: String(new FormData(e.currentTarget).get("path") ?? "").trim() || null }); }} className="flex">
          <input key={get("path")} name="path" defaultValue={get("path")} placeholder="Visited page, e.g. /chapter/" className={`${select} w-48 font-normal`} aria-label="Visited a page containing" />
        </form>
        {pending && <Loader2 className="size-4 animate-spin text-muted" aria-label="Updating" />}
      </div>
      {active.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted">Filtered by</span>
          {active.map((k) => (
            <button key={k} type="button" onClick={() => set({ [k]: null })} className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 font-semibold text-brand hover:bg-brand/20">
              {k === "who" ? (get(k) === "user" ? "Logged in" : "Not logged in") : k === "country" ? COUNTRY(get(k)) : k === "path" ? `Visited ${get(k)}` : get(k)}
              <X className="size-3" />
            </button>
          ))}
          <button type="button" onClick={() => set({ device: null, source: null, country: null, who: null, path: null })} className="font-semibold text-muted underline hover:text-foreground">Clear all</button>
        </div>
      )}
    </div>
  );
}
