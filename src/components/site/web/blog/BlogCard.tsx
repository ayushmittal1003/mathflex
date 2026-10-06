import Link from "next/link";
import { categoryTitle, formatPostDate, type BlogPost } from "@/lib/blog";
import { cx } from "../ui";

// Blog card (design.md §4): 16:10 cover with category chip, date and read time on the
// thumbnail, then the title and a 2-line excerpt.
export function BlogCover({ post, className, big = false }: { post: BlogPost; className?: string; big?: boolean }) {
  const sym = post.cover.symbol;
  return (
    <span className={cx("relative block overflow-hidden", className)} style={{ background: `linear-gradient(155deg, ${post.cover.from}, ${post.cover.to})` }}>
      {post.cover.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- CMS image (Sanity CDN later)
        <img src={post.cover.image} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span
          aria-hidden
          className={cx(
            "absolute right-[6%] top-1/2 -translate-y-1/2 whitespace-nowrap font-black leading-none tracking-[-0.05em] text-white/20",
            big ? (sym.length > 2 ? "text-[clamp(120px,15vw,200px)]" : "text-[clamp(160px,20vw,280px)]") : sym.length > 2 ? "text-[72px]" : sym.length > 1 ? "text-[104px]" : "text-[136px]",
          )}
        >
          {sym}
        </span>
      )}
      <span className="absolute inset-0 bg-[linear-gradient(transparent_45%,rgb(0_0_0/0.45))]" />
    </span>
  );
}

export function BlogCard({ post, index = 0 }: { post: BlogPost; index?: number }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex animate-mf-rise flex-col text-foreground" style={{ animationDelay: `${Math.min(index, 9) * 40}ms` }}>
      <span className="relative block overflow-hidden rounded-xl shadow-[0_14px_30px_-22px_rgb(0_0_0/0.5)] transition-transform duration-300 ease-mf group-hover:-translate-y-1">
        <BlogCover post={post} className="aspect-[16/10]" />
        <span className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-xs font-bold text-foreground">{categoryTitle(post.category)}</span>
        <span className="absolute inset-x-3 bottom-3 flex items-center gap-2 text-xs font-bold text-white">
          <span className="rounded-md bg-black/35 px-2 py-1 backdrop-blur-md">{formatPostDate(post.publishedAt)}</span>
          <span className="rounded-md bg-black/35 px-2 py-1 backdrop-blur-md">{post.readMinutes} min read</span>
        </span>
      </span>
      <span className="mt-3.5 block text-lg font-extrabold leading-[1.3] tracking-[-0.025em] text-balance group-hover:text-primary">{post.title}</span>
      <span className="mt-1.5 line-clamp-2 text-[15px] leading-[1.55] text-secondary-foreground">{post.excerpt}</span>
    </Link>
  );
}
