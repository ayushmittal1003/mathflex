import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/settings";
import { getSiteNavProps } from "@/components/site/web/data";
import { inr } from "@/lib/format";
import { SiteNav } from "@/components/site/web/SiteNav";
import { SiteFooter } from "@/components/site/web/SiteFooter";
import { ToastProvider } from "@/components/site/web/Toast";
import { Eyebrow, Mark } from "@/components/site/web/primitives";
import { WashHero, heroLead } from "@/components/site/web/WashHero";
import { button, cx, tone } from "@/components/site/web/ui";

export const metadata = { title: "Page not found", robots: { index: false } };

// 404 for unknown URLs and for notFound() anywhere (missing chapter, leaderboard off…).
// Built from the website design system (no dedicated design file). Always light. The
// suggested chapters are real, the highest JEE weightage first. Rendered per request (not at
// build time) and still renders, with default settings, if the database is unreachable.
export default async function NotFound() {
  await connection();
  const [user, settings, chapters] = await Promise.all([
    getCurrentUser().catch(() => null),
    getSettings().catch(() => DEFAULT_SETTINGS),
    db.chapter
      .findMany({
        where: { isPublished: true },
        orderBy: [{ jeeWeightage: "desc" }, { sortOrder: "asc" }],
        take: 4,
        select: { id: true, slug: true, title: true, classLevel: true, price: true, symbol: true, coverFrom: true, coverTo: true },
      })
      .catch(() => []),
  ]);
  const nav = await getSiteNavProps(user, settings);
  const links = [
    { href: "/chapters", label: "All chapters", sub: "Find the one you need" },
    { href: "/courses", label: "Complete courses", sub: "Every chapter, one price" },
    { href: "/faq", label: "Help centre", sub: "Answers to common questions" },
    { href: "/contact", label: "Contact us", sub: "A real person replies" },
  ];

  return (
    <div className="site-light min-h-dvh overflow-x-clip bg-card text-foreground">
      <ToastProvider>
        <div className="relative">
          <SiteNav {...nav} />
          <main>
            <WashHero>
              <div className="px-6 pt-8 text-center">
                <div aria-hidden className="select-none text-[clamp(120px,22vw,240px)] font-black leading-[0.8] tracking-[0.02em] text-transparent [-webkit-text-stroke:3px_var(--muted-foreground)]">
                  404
                </div>
                <div className="mt-8"><Eyebrow dot="primary" onWash>Page not found</Eyebrow></div>
                <h1 className="mx-auto mt-6 max-w-[900px] text-[clamp(40px,6vw,76px)] font-extrabold leading-none tracking-[-0.045em] text-balance">
                  This page skipped <Mark onWash>class</Mark>.
                </h1>
                <p className={cx(heroLead, "mt-5")}>The link may be old, or the page may have moved. Let&apos;s get you back to your chapters.</p>
                <div className="mt-7.5 flex flex-wrap justify-center gap-2.5">
                  <Link href="/" className={cx(button.lg, tone.primary)}>Go to home</Link>
                  <Link href="/chapters" className={cx(button.lg, tone.glass)}>Browse chapters</Link>
                  {user && <Link href="/my-learning" className={cx(button.lg, tone.glass)}>My Learning</Link>}
                </div>
              </div>
            </WashHero>

            <section className="pb-22 pt-18">
              <div className="mx-auto w-[min(1120px,calc(100%-48px))]">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] border-t-2 border-foreground">
                  {links.map((l) => (
                    <Link key={l.href} href={l.href} className="group flex items-center justify-between gap-3 border-b border-border py-5 pr-4 text-foreground">
                      <span>
                        <span className="block text-[17px] font-extrabold tracking-[-0.015em] group-hover:text-primary">{l.label}</span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">{l.sub}</span>
                      </span>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-card transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                  ))}
                </div>

                {chapters.length > 0 && (
                  <>
                    <h2 className="mt-16 text-[clamp(26px,3vw,38px)] font-extrabold tracking-[-0.035em]">Most marks for your time</h2>
                    <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-3">
                      {chapters.map((c) => (
                        <Link key={c.id} href={`/chapter/${c.slug}`} className="flex min-h-[76px] items-center gap-3.5 rounded-xl border border-border bg-card px-3.5 py-3 text-foreground transition duration-300 hover:-translate-y-[3px] hover:shadow-[0_18px_34px_-22px_rgb(80_20_0/0.45)]">
                          <span className={cx("grid size-12 shrink-0 place-items-center rounded-[10px] font-black text-white", c.symbol.length > 2 ? "text-[13px]" : "text-lg")} style={{ background: `linear-gradient(155deg, ${c.coverFrom}, ${c.coverTo})` }}>{c.symbol}</span>
                          <span className="min-w-0">
                            <span className="line-clamp-2 text-[15px] font-bold leading-[1.3]">{c.title}</span>
                            <span className="mt-1 block text-xs font-semibold text-muted-foreground">Class {c.classLevel} · {inr(c.price)}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
          </main>
        </div>
        <SiteFooter settings={settings} />
      </ToastProvider>
    </div>
  );
}
