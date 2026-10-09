import Link from "next/link";
import { categoryTitle, formatPostDate, getPosts } from "@/lib/blog";
import { Eyebrow, Mark } from "@/components/site/web/primitives";
import { BlogCover } from "@/components/site/web/blog/BlogCard";
import { BlogBrowser } from "@/components/site/web/blog/BlogBrowser";
import { button, container, cx, tone } from "@/components/site/web/ui";

export const metadata = {
  title: "Blog",
  description: "Chapter guides, exam strategy and study tips for JEE maths from Karan bhaiya and the Mathflex team.",
  alternates: { canonical: "/blog" },
};

// Blog listing (dipankar-design/designs/Blog.dc.html): the latest post as a big banner, then
// older posts by category with tag chips and search. Posts come from lib/blog (placeholder
// content until Sanity is connected).
export default async function BlogPage() {
  const [latest, ...older] = await getPosts();

  return (
    <>
      <section className="px-6 pb-10 pt-[calc(86px+40px)] text-center">
        <Eyebrow dot="brand-2">Mathflex Blog</Eyebrow>
        <h1 className="mx-auto mt-5.5 max-w-[900px] text-[clamp(42px,6.4vw,84px)] font-extrabold leading-none tracking-[-0.045em] text-balance">
          Study smarter for <Mark>JEE</Mark>
        </h1>
        <p className="mx-auto mt-5 max-w-[540px] text-[17px] leading-[1.55] text-secondary-foreground text-pretty">
          Chapter guides, exam strategy and study tips from Karan bhaiya and the Mathflex team.
        </p>
      </section>

      {latest ? (
        <>
          <section className={cx(container.listing, "pb-12")}>
            <Link
              href={`/blog/${latest.slug}`}
              className="group grid animate-mf-rise items-center gap-8 rounded-2xl bg-card p-3 text-foreground ring-1 ring-border shadow-[0_1px_2px_rgb(0_0_0/0.04),0_30px_60px_-40px_rgb(80_20_0/0.45)] transition duration-300 ease-mf hover:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_36px_70px_-40px_rgb(80_20_0/0.55)] min-[900px]:grid-cols-[1.15fr_1fr] min-[900px]:gap-12 min-[900px]:p-4"
            >
              <span className="relative block overflow-hidden rounded-xl">
                <BlogCover post={latest} big className="aspect-[16/10] transition-transform duration-700 ease-mf group-hover:scale-[1.03]" />
                <span className="absolute left-4 top-4 flex gap-2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em] text-primary-foreground">Latest</span>
                  <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-bold text-foreground">{categoryTitle(latest.category)}</span>
                </span>
                <span className="absolute inset-x-4 bottom-4 flex gap-2 text-xs font-bold text-white">
                  <span className="rounded-md bg-black/35 px-2 py-1 backdrop-blur-md">{formatPostDate(latest.publishedAt)}</span>
                  <span className="rounded-md bg-black/35 px-2 py-1 backdrop-blur-md">{latest.readMinutes} min read</span>
                </span>
              </span>
              <span className="block px-3 pb-6 min-[900px]:px-0 min-[900px]:pb-0 min-[900px]:pr-10">
                <span className="block text-[clamp(28px,3.4vw,44px)] font-extrabold leading-[1.08] tracking-[-0.04em] text-balance group-hover:text-primary">{latest.title}</span>
                <span className="mt-4 block text-[17px] leading-[1.6] text-secondary-foreground text-pretty">{latest.excerpt}</span>
                <span className="mt-7 flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-primary to-brand-2 text-sm font-extrabold text-white">{latest.author.name[0]}</span>
                  <span className="text-sm">
                    <span className="block font-bold">{latest.author.name}</span>
                    <span className="block text-muted-foreground">{formatPostDate(latest.publishedAt)} · {latest.readMinutes} min read</span>
                  </span>
                </span>
                <span className={cx(button.md, tone.primary, "mt-8")}>Read article →</span>
              </span>
            </Link>
          </section>
          {older.length > 0 && <BlogBrowser posts={older} />}
        </>
      ) : (
        <section className={cx(container.text, "pb-28")}>
          <div className="mx-auto max-w-[560px] rounded-xl border border-dashed border-border bg-muted/50 px-6 py-10 text-center">
            <div className="text-xl font-extrabold tracking-[-0.02em]">First articles coming soon</div>
            <p className="mt-2 text-sm text-muted-foreground">We&apos;ll post them here.</p>
            <Link href="/chapters" className={cx(button.md, tone.primary, "mt-6")}>Browse chapters</Link>
          </div>
        </section>
      )}
    </>
  );
}
