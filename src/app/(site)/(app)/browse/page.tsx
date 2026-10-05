import Link from "next/link";
import { Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { ChapterPoster } from "@/components/site/ChapterCard";

export const metadata = { title: "All chapters" };

const SORTS = { default: "Syllabus order", weight: "JEE weightage", price: "Price: low to high" } as const;

export default async function Browse({ searchParams }: { searchParams: Promise<{ q?: string; class?: string; sort?: keyof typeof SORTS }> }) {
  const { q = "", class: cls, sort = "default" } = await searchParams;
  const user = await getCurrentUser();
  let list = await getCatalog(user?.id);
  if (cls === "11" || cls === "12") list = list.filter((c) => c.classLevel === Number(cls));
  if (q) list = list.filter((c) => `${c.title} ${c.tagline}`.toLowerCase().includes(q.toLowerCase()));
  if (sort === "weight") list = [...list].sort((a, b) => b.jeeWeightage - a.jeeWeightage);
  if (sort === "price") list = [...list].sort((a, b) => a.price - b.price);

  const href = (p: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(Object.entries({ q, class: cls, sort, ...p }).filter(([, v]) => v && v !== "default") as [string, string][]);
    return `/browse${sp.size ? `?${sp}` : ""}`;
  };
  const chip = (active: boolean) => `shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${active ? "bg-foreground text-background" : "bg-surface-2 text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="mx-auto max-w-[1500px] px-4 pt-[calc(var(--nav-h)+2rem)] md:px-8">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Find your chapter</h1>
      <form className="relative mt-5 max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input name="q" defaultValue={q} placeholder="Search chapters — try “integrals”" className="input !rounded-full !py-3.5 !pl-12" />
        {cls && <input type="hidden" name="class" value={cls} />}
      </form>
      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
        <Link href={href({ class: undefined })} className={chip(!cls)}>All</Link>
        <Link href={href({ class: "11" })} className={chip(cls === "11")}>Class 11</Link>
        <Link href={href({ class: "12" })} className={chip(cls === "12")}>Class 12</Link>
        <span className="mx-1 w-px shrink-0 bg-border" />
        {(Object.keys(SORTS) as (keyof typeof SORTS)[]).map((s) => (
          <Link key={s} href={href({ sort: s })} className={chip(sort === s)}>{SORTS[s]}</Link>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">{list.length} chapter{list.length === 1 ? "" : "s"}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 [&>a]:!w-full">
        {list.map((c) => <ChapterPoster key={c.id} c={c} />)}
      </div>
      {!list.length && <p className="py-20 text-center text-muted-foreground">No chapters match “{q}”.</p>}
    </div>
  );
}
