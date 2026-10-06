import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { categoryTitle, formatPostDate, getPost, getPosts, type BlogBlock } from "@/lib/blog";
import { instructor } from "@/lib/site-content";
import { BlogCard, BlogCover } from "@/components/site/web/blog/BlogCard";
import { ReadingProgress, ShareButtons, Toc } from "@/components/site/web/blog/ArticleChrome";
import { button, container, cx, tone } from "@/components/site/web/ui";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  return post ? { title: post.title, description: post.excerpt, alternates: { canonical: `/blog/${post.slug}` } } : {};
}

// "**bold**" -> <strong>. Stands in for Portable Text marks until Sanity is connected.
function Rich({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((s, i) => (s.startsWith("**") ? <strong key={i} className="font-bold text-foreground">{s.slice(2, -2)}</strong> : s))}</>;
}

type InlineChapter = { slug: string; title: string; tagline: string; coverFrom: string; coverTo: string; symbol: string; free: boolean };

// Blog article (dipankar-design/designs/Blog Article.dc.html).
export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  // Inline chapter cards point at real, published chapters; unknown slugs are skipped.
  const chapterSlugs = post.body.flatMap((b) => (b._type === "chapter" ? [b.slug] : []));
  const [settings, rows, all] = await Promise.all([
    getSettings(),
    chapterSlugs.length
      ? db.chapter.findMany({
          where: { slug: { in: chapterSlugs }, isPublished: true },
          select: { slug: true, title: true, tagline: true, coverFrom: true, coverTo: true, symbol: true, parts: { where: { isFreePreview: true }, select: { id: true }, take: 1 } },
        })
      : Promise.resolve([]),
    getPosts(),
  ]);
  const chapters = new Map<string, InlineChapter>(
    rows.map((c) => [c.slug, { ...c, free: settings.features.freePreviews && c.parts.length > 0 }]),
  );

  const toc = post.body.flatMap((b) => (b._type === "h2" ? [{ id: b.id, text: b.text }] : []));
  const sameCat = all.filter((p) => p.slug !== post.slug && p.category === post.category);
  const related = [...sameCat, ...all.filter((p) => p.slug !== post.slug && p.category !== post.category)].slice(0, 3);
  const byKaran = post.author.name === instructor.fullName;

  return (
    <article>
      <ReadingProgress />

      <header className={cx(container.listing, "pt-[calc(86px+40px)]")}>
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Link href="/blog" className="hover:text-foreground">Blog</Link>
          <span aria-hidden>/</span>
          <span className="text-primary">{categoryTitle(post.category)}</span>
        </nav>
        <h1 className="mt-5 max-w-[920px] text-[clamp(36px,5.4vw,64px)] font-extrabold leading-[1.04] tracking-[-0.045em] text-balance">{post.title}</h1>
        <p className="mt-5 max-w-[720px] text-[19px] leading-[1.55] text-secondary-foreground text-pretty">{post.excerpt}</p>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-border py-5">
          <div className="flex items-center gap-3">
            <Avatar name={post.author.name} photo={byKaran ? instructor.photo : null} />
            <div className="text-sm">
              <div className="font-bold">{post.author.name} · <span className="font-semibold text-muted-foreground">{post.author.role}</span></div>
              <div className="text-muted-foreground">{formatPostDate(post.publishedAt)} · {post.readMinutes} min read</div>
            </div>
          </div>
          <ShareButtons title={post.title} />
        </div>
      </header>

      <div className={cx(container.listing, "mt-10")}>
        <div className="overflow-hidden rounded-2xl shadow-[0_30px_60px_-40px_rgb(80_20_0/0.5)]">
          <BlogCover post={post} big className="aspect-[16/9] rounded-xl min-[760px]:aspect-[21/8]" />
        </div>
      </div>

      <div className={cx(container.listing, "mt-14 flex gap-14 min-[1200px]:gap-20")}>
        {toc.length > 1 && (
          <aside className="hidden w-[240px] flex-none min-[1000px]:block">
            <div className="sticky top-24"><Toc items={toc} /></div>
          </aside>
        )}
        <div className="min-w-0 max-w-[720px] flex-1 text-[18px] leading-[1.75] text-secondary-foreground">
          {post.body.map((b, i) => <Block key={i} b={b} chapters={chapters} />)}

          {post.tags.length > 0 && (
            <div className="mt-12 flex flex-wrap gap-2">
              {post.tags.map((t) => <span key={t} className="rounded-full bg-muted px-3 py-1.5 text-sm font-semibold text-secondary-foreground">#{t}</span>)}
            </div>
          )}

          <div className="mt-12 flex flex-col gap-5 rounded-xl bg-muted p-6 tablet:flex-row tablet:items-center">
            <Avatar name={post.author.name} photo={byKaran ? instructor.photo : null} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Written by</div>
              <div className="mt-1 text-lg font-extrabold tracking-[-0.02em] text-foreground">{post.author.name}</div>
              <p className="mt-1 text-[15px] leading-[1.6]">
                {byKaran ? `${instructor.shortName} ${instructor.bio}` : "Study guides and exam updates from the people who build Mathflex."}
              </p>
            </div>
            {byKaran && <Link href="/book-a-call" className={cx(button.sm, tone.dark, "self-start tablet:self-center")}>Book a 1:1 call</Link>}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className={cx(container.listing, "pb-28 pt-20")}>
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="text-[clamp(28px,3.4vw,40px)] font-extrabold tracking-[-0.04em]">Keep reading</h2>
            <Link href="/blog" className="text-sm font-bold text-primary hover:underline">All articles →</Link>
          </div>
          <div className="grid gap-x-6 gap-y-10 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
            {related.map((p, i) => <BlogCard key={p.slug} post={p} index={i} />)}
          </div>
        </section>
      )}
    </article>
  );
}

function Avatar({ name, photo, size = "md" }: { name: string; photo: string | null; size?: "md" | "lg" }) {
  const cls = cx("grid flex-none place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-brand-2 font-extrabold text-white", size === "lg" ? "size-16 text-xl" : "size-11 text-base");
  return photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo} alt="" className={cx(cls, "object-cover")} />
  ) : (
    <span aria-hidden className={cls}>{name[0]}</span>
  );
}

function Block({ b, chapters }: { b: BlogBlock; chapters: Map<string, InlineChapter> }) {
  switch (b._type) {
    case "p":
      return <p className="mt-6 first:mt-0"><Rich text={b.text} /></p>;
    case "h2":
      return <h2 id={b.id} className="mt-14 scroll-mt-24 text-[clamp(26px,3vw,32px)] font-extrabold leading-[1.2] tracking-[-0.035em] text-foreground">{b.text}</h2>;
    case "list":
      return (
        <ul className="mt-6 space-y-3">
          {b.items.map((t, i) => (
            <li key={i} className="relative pl-7">
              <span aria-hidden className="absolute left-1 top-[0.7em] size-2 rounded-full bg-primary" />
              <Rich text={t} />
            </li>
          ))}
        </ul>
      );
    case "tip":
      return (
        <aside className="mt-8 rounded-xl bg-[color-mix(in_oklab,var(--brand-2)_10%,transparent)] p-6">
          <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.08em] text-foreground">
            <span aria-hidden className="grid size-7 place-items-center rounded-full bg-brand-2 text-sm text-white">★</span>
            {b.title}
          </div>
          <p className="mt-3 text-[17px] leading-[1.65] text-foreground"><Rich text={b.text} /></p>
        </aside>
      );
    case "steps":
      return (
        <ol className="mt-8 space-y-4">
          {b.items.map((s) => (
            <li key={s.label} className="grid gap-1 rounded-xl border border-border bg-card p-5 tablet:grid-cols-[120px_1fr] tablet:gap-5">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-primary tablet:pt-1.5">{s.label}</span>
              <span>
                <span className="block text-lg font-extrabold tracking-[-0.02em] text-foreground">{s.title}</span>
                <span className="mt-1 block text-[16px] leading-[1.6]">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      );
    case "chapter": {
      const c = chapters.get(b.slug);
      if (!c) return null;
      return (
        <Link href={`/chapter/${c.slug}`} className="group mt-8 flex items-center gap-4 rounded-xl border border-border bg-card p-3 pr-5 text-foreground transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-24px_rgb(80_20_0/0.45)]">
          <span className="relative grid aspect-video w-28 flex-none place-items-center overflow-hidden rounded-lg font-black text-white/80 tablet:w-36" style={{ background: `linear-gradient(155deg, ${c.coverFrom}, ${c.coverTo})` }}>
            <span className={c.symbol.length > 2 ? "text-xl" : "text-3xl"}>{c.symbol}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Chapter</span>
            <span className="block text-[17px] font-extrabold leading-tight tracking-[-0.02em]">{c.title}</span>
            {c.tagline && <span className="mt-0.5 hidden text-sm leading-snug text-muted-foreground tablet:line-clamp-1">{c.tagline}</span>}
          </span>
          <span className={cx(button.sm, c.free ? tone.primaryFlat : tone.secondary, "hidden tablet:inline-flex")}>{c.free ? "Watch free" : "View chapter"} →</span>
        </Link>
      );
    }
  }
}
