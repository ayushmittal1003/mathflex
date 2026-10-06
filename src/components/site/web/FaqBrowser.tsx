"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FaqList } from "./FaqList";
import { cx } from "./ui";

type Group = { id: string; title: string; items: { q: string; a: string }[] };

// FAQ search + categories (sticky aside on wide screens, scrolling chips on phones).
export function FaqBrowser({ groups }: { groups: Group[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const term = q.trim().toLowerCase();
  const match = (f: { q: string; a: string }) => !term || `${f.q} ${f.a}`.toLowerCase().includes(term);
  const filtered = useMemo(
    () => groups.filter((g) => cat === "all" || g.id === cat).map((g) => ({ ...g, items: g.items.filter(match) })).filter((g) => g.items.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- match depends only on term
    [groups, cat, term],
  );
  const total = groups.reduce((s, g) => s + g.items.filter(match).length, 0);
  const cats = [{ id: "all", title: "All questions", count: total }, ...groups.map((g) => ({ id: g.id, title: g.title, count: g.items.filter(match).length }))];

  return (
    <>
      <div className="mx-auto mt-8 flex w-[min(620px,calc(100%-48px))] items-center gap-2.5 rounded-xl border border-border bg-card py-1.5 pl-4.5 pr-1.5 shadow-[0_20px_44px_-28px_rgb(80_20_0/0.4)]">
        <svg className="size-5 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions" aria-label="Search questions" className="h-11 min-w-0 flex-1 bg-transparent text-[17px] text-foreground outline-none placeholder:text-muted-foreground" />
        {q && <button type="button" onClick={() => setQ("")} className="shrink-0 rounded-lg bg-muted px-3.5 py-2.5 text-[13px] font-bold">Clear</button>}
      </div>

      <section className="pb-18 pt-14">
        <div className="mx-auto flex w-[min(1120px,calc(100%-48px))] flex-wrap items-start gap-x-14 gap-y-8">
          <aside className="w-full min-w-0 min-[860px]:sticky min-[860px]:top-24 min-[860px]:w-[240px] min-[860px]:flex-none">
            <div className="no-scrollbar flex gap-2 overflow-x-auto min-[860px]:grid min-[860px]:gap-1.5">
              {cats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCat(c.id)}
                  aria-pressed={cat === c.id}
                  className={cx("flex shrink-0 items-center justify-between gap-2.5 whitespace-nowrap rounded-lg border px-3.5 py-[11px] text-left min-[860px]:w-full", cat === c.id ? "border-foreground bg-foreground text-white" : "border-border bg-card text-foreground")}
                >
                  <span className="text-sm font-bold">{c.title}</span>
                  <span className="text-xs font-semibold opacity-65">{c.count}</span>
                </button>
              ))}
            </div>
          </aside>
          <div className="min-w-0 flex-[1_1_480px]">
            {filtered.map((g) => (
              <div key={g.id} className="mb-10">
                <h2 className="border-b-2 border-foreground pb-3 text-[22px] font-extrabold tracking-[-0.025em]">{g.title}</h2>
                <FaqList key={`${g.id}-${term}`} items={g.items} initialOpen={term ? 0 : -1} />
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="border-t-2 border-foreground py-12 text-center">
                <div className="text-[22px] font-extrabold tracking-[-0.02em]">No answers for “{q}”</div>
                <p className="mt-2 text-[15px] text-muted-foreground">Try another word, or ask us directly.</p>
                <Link href="/contact" className="mt-4.5 inline-flex rounded-lg bg-foreground px-4.5 py-3 text-sm font-bold text-white">Contact us</Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
