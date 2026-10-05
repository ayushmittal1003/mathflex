"use client";
import { useMemo, useState } from "react";
import { BLOG_CATEGORIES, type BlogPost } from "@/lib/blog";
import { BlogCard } from "./BlogCard";
import { button, container, cx, tone } from "../ui";

// Sticky tag chips + search over the older posts. "All" groups posts by category (3 per row
// on desktop); picking a tag or searching shows a flat grid.
export function BlogBrowser({ posts }: { posts: BlogPost[] }) {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");

  const cats = BLOG_CATEGORIES.filter((c) => posts.some((p) => p.category === c.slug));
  const query = q.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      posts.filter(
        (p) =>
          (cat === "all" || p.category === cat) &&
          (!query || [p.title, p.excerpt, ...p.tags].some((s) => s.toLowerCase().includes(query))),
      ),
    [posts, cat, query],
  );
  const grouped = cat === "all" && !query;

  const chip = (active: boolean) =>
    cx(
      "shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition duration-200 ease-mf",
      active ? "border-foreground bg-foreground text-card" : "border-border bg-card text-secondary-foreground hover:border-foreground/40",
    );

  return (
    <>
      <div className="sticky top-[67px] z-30 bg-card/90 py-3.5 backdrop-blur-md">
        <div className={cx(container.listing, "flex flex-wrap items-center gap-3")}>
          <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1">
            <button type="button" onClick={() => setCat("all")} className={chip(cat === "all")}>All</button>
            {cats.map((c) => (
              <button key={c.slug} type="button" onClick={() => setCat(c.slug)} className={chip(cat === c.slug)}>{c.title}</button>
            ))}
          </div>
          <label className="relative w-full tablet:w-64">
            <span className="sr-only">Search articles</span>
            <svg className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search articles"
              className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-foreground"
            />
          </label>
        </div>
      </div>

      <div className={cx(container.listing, "pb-28 pt-8")}>
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/50 px-6 py-14 text-center">
            <div className="text-xl font-extrabold tracking-[-0.02em]">No articles match that</div>
            <p className="mt-2 text-sm text-muted-foreground">Try another word or tag.</p>
            <button type="button" onClick={() => { setQ(""); setCat("all"); }} className={cx(button.sm, tone.secondary, "mt-5")}>Show all articles</button>
          </div>
        ) : grouped ? (
          <div className="space-y-16">
            {cats.map((c) => {
              const list = filtered.filter((p) => p.category === c.slug);
              if (!list.length) return null;
              return (
                <section key={c.slug} aria-labelledby={`cat-${c.slug}`}>
                  <div className="mb-6 flex items-end justify-between gap-4">
                    <h2 id={`cat-${c.slug}`} className="text-[clamp(24px,2.6vw,30px)] font-extrabold leading-tight tracking-[-0.035em]">{c.title}</h2>
                    {list.length > 3 && (
                      <button type="button" onClick={() => { setCat(c.slug); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-sm font-bold text-primary hover:underline">
                        See all {list.length} →
                      </button>
                    )}
                  </div>
                  <Grid posts={list.slice(0, 3)} />
                </section>
              );
            })}
          </div>
        ) : (
          <Grid posts={filtered} />
        )}
      </div>
    </>
  );
}

function Grid({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="grid gap-x-6 gap-y-10 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
      {posts.map((p, i) => <BlogCard key={p.slug} post={p} index={i} />)}
    </div>
  );
}
