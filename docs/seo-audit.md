# MathFlex SEO audit (Phase 0)

Branch `feature/seo`, based on `main` at `90d3af8`. Audit date: 2026-10-10. Read-only: no source files were changed.

**Method and limits.** Everything below comes from reading the code (`file:line` evidence) and the git history. I did **not** run `next build`, Lighthouse, axe or a live crawl, so there are no measured bundle sizes, LCP values or axe results in this document. Section 7 and 8 list what is known from code and what Phase 3/4 must measure. Contrast ratios in section 8 are computed from the design tokens in `src/app/globals.css`.

---

## 1. Stack inventory

| Item | Finding |
|---|---|
| Framework | Next.js **16.3.6**, React **19.2.8**, App Router, Tailwind v4, Prisma 7 (`package.json`) |
| `cacheComponents` / PPR | **Not enabled.** `next.config.ts` has no `cacheComponents`, `ppr` or `use cache`; none used anywhere in `src/` |
| `next.config.ts` | Only `experimental.serverActions.bodySizeLimit: "32mb"` and a global `headers()` (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN`). No redirects, rewrites, `trailingSlash`, `images` config, `htmlLimitedBots` |
| `vercel.json` | `regions: ["sin1"]` only |
| Middleware / proxy | **None.** No `src/proxy.ts` or `middleware.ts`. Auth is enforced per page (`requireUser` redirects to `/login?next=…`), so anonymous users and bots are never redirected on public pages |
| Fonts | `next/font/google` (Inter preloaded; JetBrains Mono and Noto Serif `preload: false`) in `src/app/layout.tsx:6-8` |
| `<html lang>` | `lang="en"` (`src/app/layout.tsx:31`) |
| Root metadata | `title.default "MathFlex — Binge-learn JEE Maths"`, template `"%s · MathFlex"`, description, `metadataBase = new URL(process.env.APP_URL ?? "http://localhost:3000")` (`layout.tsx:11-17`) |
| Site URL source | `APP_URL` env var. **If it is unset in a deployment, `metadataBase` falls back to `http://localhost:3000`** and every absolute URL would be wrong |
| Icons | `src/app/icon.svg` only. No `apple-icon`, `favicon.ico`, `opengraph-image`, `manifest` |
| Root layout sharing | `src/app/layout.tsx` and `globals.css` are shared with `/admin` |

## 2. Route map

All pages are server components (`"use client"` count in `page.tsx` files is 0), so primary content is in the initial HTML. **However, every `(public)` page is rendered dynamically per request**, because `(public)/layout.tsx:14` calls `getCurrentUser()` (reads cookies) and `getSettings()`. No page uses `generateStaticParams` or `revalidate`. That means no static/ISR HTML for any public page (see finding F-04).

| URL | File | Render | Data source | Auth | Proposed index decision |
|---|---|---|---|---|---|
| `/` | `(public)/page.tsx` | Dynamic (SSR) | `db.chapter`, `db.course`, settings | none | **Index**, sitemap |
| `/chapters` | `chapters/page.tsx` | Dynamic | `getCatalog`, `db.course` | optional user | **Index** (clean URL only), sitemap |
| `/chapters?q=&class=&sort=` | same | Dynamic | same | none | **Not indexed as separate pages** (canonical to `/chapters`) |
| `/chapter/[slug]` | `chapter/[slug]/page.tsx` | Dynamic | `db.chapter` (+ parts, resources, courses) | optional user | **Index** if published, sitemap |
| `/courses` | `courses/page.tsx` | Dynamic | `db.course` | optional user | **Index**, sitemap |
| `/courses/[slug]` | `courses/[slug]/page.tsx` | Dynamic | `db.course` | optional user | **Index** if published, sitemap |
| `/pricing` | `pricing/page.tsx` | Dynamic | chapters/courses/settings | none | **Index**, sitemap |
| `/blog` | `blog/page.tsx` | Dynamic | `lib/blog.ts` (**static in-code array**) | none | Index only once real posts exist (see F-02) |
| `/blog/[slug]` | `blog/[slug]/page.tsx` | Dynamic | `lib/blog.ts` | none | **Noindex while `placeholder: true`**; index real posts |
| `/about` | `about/page.tsx` | Dynamic | `lib/site-content.ts`, settings | none | **Index**, sitemap |
| `/contact` | `contact/page.tsx` | Dynamic | settings | none | **Index**, sitemap |
| `/book-a-call` | `book-a-call/page.tsx` | Dynamic | settings | none | **Index**, sitemap |
| `/faq` | `faq/page.tsx` | Dynamic | `lib/site-content.ts` | none | **Index**, sitemap |
| `/free-practice` | `free-practice/page.tsx` | Dynamic | `lib/free-practice.ts` (**placeholder set**) | none | Index only once the question set is real (F-02) |
| `/privacy`, `/terms`, `/refund-policy` | `…/page.tsx` | Dynamic | `lib/legal` | none | **Index**, sitemap |
| `/leaderboard` | `leaderboard/page.tsx` | Dynamic | top 50 users by XP | optional user; `notFound()` if feature off | Decision needed: it lists real students' names. Recommend **noindex** (privacy, volatile content) |
| `/my-learning`, `/profile`, `/plans`, `/practice`, `/practice/[slug]` | `(public)/…` | Dynamic | per-user | `requireUser` | **Noindex** |
| `/learn/[slug]` | `(focus)/learn/[slug]/page.tsx` | Dynamic | chapter + parts | owner or free-preview part, else redirect to `/chapter/[slug]` | **Noindex** |
| `/checkout`, `/payment/status`, `/login`, `/signup`, `/invite/[token]` | `(focus)/…` | Dynamic | – | varies | **Noindex** (`invite` already is) |
| `/cart`, `/browse` | `(app)/…` | redirect (`redirect()`, 307) to `/checkout`, `/chapters` | – | none | Not indexed; redirects only |
| `/payment/mock` | `(app)/payment/mock` | Dynamic; 404 unless mock payments allowed | – | `requireUser` | **Noindex** |
| `/admin/**` (18 pages) | `src/app/admin` | Dynamic | – | `requireStaff` | `Disallow: /admin` in robots.txt (admin = ask) |
| `/api/**` (8 route handlers) | `src/app/api` | – | – | varies | `Disallow: /api/` |
| 404 | `src/app/not-found.tsx` | Dynamic (`connection()`) | 4 top chapters | none | `robots: { index: false }` already set |

Missing content calls `notFound()` correctly on chapter, course, blog, learn and practice pages (grep: `notFound` present in each). Unpublished chapters/courses are visible to staff only.

## 3. Metadata audit

| Route | Current metadata | Problems |
|---|---|---|
| Root | title default + template `%s · MathFlex`, description, `metadataBase` | No `openGraph`, `twitter`, `alternates.canonical`, `robots`, `applicationName`, `icons` beyond `icon.svg` |
| `/` | none (inherits root) | Home has no canonical. Description is the root one |
| `/chapters` | `{ title: "All chapters" }` | No description, no canonical |
| `/chapter/[slug]` | `generateMetadata` → `{ title: c.title, description: c.tagline }` (`chapter/[slug]/page.tsx:21`) | Title is only the chapter name (no "JEE" intent). No canonical, no OG. Does a second `findUnique` (not deduped with the page query). Does not check `isPublished`, so an unpublished chapter's title leaks in metadata for non-staff (the page itself 404s for them) |
| `/courses` | `{ title: "Complete courses" }` | No description/canonical |
| `/courses/[slug]` | `generateMetadata` → title, `subtitle` as description (`courses/[slug]/page.tsx:20`) | No canonical/OG; second DB query |
| `/pricing` | `{ title: "Pricing" }` | No description/canonical |
| `/blog` | title, description, canonical `/blog` | OK basis |
| `/blog/[slug]` | title, `excerpt`, canonical (`blog/[slug]/page.tsx:13`) | No OG image, no `article` type, no dates |
| `/about`, `/contact`, `/faq`, `/privacy`, `/terms`, `/refund-policy`, `/book-a-call` | title + canonical (relative path, resolved by `metadataBase`) | No descriptions on most |
| `/free-practice` | title, description, canonical | OK basis |
| `/leaderboard`, `/plans`, `/profile`, `/my-learning`, `/practice`, `/checkout`, `/login`, `/signup`, `/payment/status` | title only | **No `robots: noindex`** on any of them |
| `/practice/[slug]` | `"{chapter} · Practice"` | Private page; needs noindex |
| `invite/[token]`, `not-found` | `robots: { index: false }` | Good |

Duplicates: all pages without a description inherit the same root description. Titles are unique per route but do not include the keywords people search.
Other findings: root description says "By IIT Delhi & NIT Jalandhar alumni" (`layout.tsx:14`) while the site content names only an IIT Delhi mentor. Please confirm which is true before it is repeated in OG tags.

## 4. Crawl and index controls

- `robots.ts` / `robots.txt`: **missing.** `sitemap.ts` / `sitemap.xml`: **missing.** `manifest`: **missing.** `public/` has only `brand/` assets.
- Nothing blocks crawling today (no `Disallow`), but nothing tells crawlers to skip `/admin`, `/api`, checkout or account pages either.
- `noindex` exists only on `not-found` and `invite/[token]`.
- Canonical host: cannot be determined from the code (domain redirects live in Vercel). **Owner/Ayush item:** confirm `mathflex.in` vs `www.mathflex.in` redirect and that `APP_URL` is set to the canonical host in Production.

## 5. URL hygiene

- Slugs are unique and slug-based (`Chapter.slug`, `Course.slug` `@unique`); blog slugs are strings in `lib/blog.ts`.
- Query params that change content: `/chapters?q&class&sort` (only `class` 11/12 and `sort` weight/price are honoured), `/leaderboard?p=`, `/practice/[slug]?status&difficulty&type&format&topic`, `/learn/[slug]?part=`. Listing variants currently have no canonical, so Google could index `/chapters?class=11` as a separate URL.
- Two URL patterns for chapters: `/chapter/[slug]` (singular, detail) and `/chapters` (listing). Consistent, but note `/courses/[slug]` is plural while `/chapter/[slug]` is singular. Changing it needs redirects (config = ask), so leave as is.
- Trailing slash: Next default (no trailing slash); no config override.
- 404: `not-found.tsx` and `notFound()` are used. In App Router a `notFound()` response returns HTTP 404. **To verify with curl in Phase 1.**
- Old URLs: `/browse` and `/cart` use `redirect()`, which sends **307 (temporary)**, not 308/301. For SEO these should be permanent, but a permanent change needs `next.config` redirects (ask) or `permanentRedirect()` in these two pages (frontend-only; propose in Phase 1).
- No redirect from old (pre-redesign) `/practice` and `/profile` is needed; same URLs were kept.

## 6. Structured data

None. `grep` finds no `ld+json`, no `JSON.stringify` for schema. All of Phase 2 is greenfield.

## 7. Performance (code review only; nothing measured)

| Area | Finding |
|---|---|
| Rendering | All public pages are dynamic SSR (section 2). TTFB depends on Prisma queries in `sin1`; no CDN caching of HTML. `getSettings`, `getCurrentUser`, `getCatalog` are wrapped in React `cache()`, so queries dedupe inside one request |
| Images | **No `next/image` anywhere** in `src`. Five `<img>` usages: `SiteLogo.tsx` (PNG, eslint-disabled with a reason), `InsideMathflex.tsx:44` (SVG mark), `book-a-call/page.tsx:97` (mentor photo, has alt), `blog/[slug]/page.tsx:128` and `BlogCard.tsx:13` (blog cover, `alt=""`). Chapter posters are CSS gradients; `Chapter.coverImage` exists in the schema but is **not used on any public page** |
| Fonts | `next/font` self-hosted. Good. Inter is preloaded; no external `<link>` tags found |
| Scripts | One `next/script` (`beforeInteractive` theme script, tiny). **No analytics script exists** (no GA, GTM, Vercel analytics). Cashfree SDK is a dynamic import inside `CartView.tsx` (`load()` at pay time), so it is already scoped to checkout. No Google sign-in script (server-side redirect flow) |
| Video | Bunny embeds are `<iframe loading="lazy">` (`VideoFrame.tsx`, `PreviewExplorer.tsx:110`). No click-to-load facade; the home preview section renders the iframe directly once a `previewSrc` exists (currently always `null`) |
| LCP candidates | Home: hero text (H1) / hero chapter poster (gradient, no image). Chapter detail: H1 / gradient poster. Blog: cover gradient. Because there are no hero images, LCP is likely text and should be fast once TTFB is fixed; confirm with Lighthouse |
| Layout shift | Phone bottom bar uses fixed padding (`pb-[calc(64px+env(safe-area-inset-bottom))]`); marquee/banners and `PromoPopup` load from DB and need a Phase 3 check |
| Bundle | `canvas-confetti`, `CelebrateProvider`, `ChatWidget`, `PromoPopup`, `ToastProvider` are mounted for all visitors via layouts. Sizes not measured |

## 8. Accessibility

Code-level findings (axe not run):

- `<html lang="en">` should be `en-IN` (`layout.tsx:31`).
- **No "Skip to content" link.** `(public)/layout.tsx` has `<main>`, `SiteNav` has `<header>` + `<nav aria-label="Main">`, bottom bar `<nav aria-label="Quick links">`, `<footer>` exists. Landmarks are mostly good.
- **H1:** one `<h1>` in nearly every page file. `payment/status` has 4 and `book-a-call` has 2 `<h1>` in source (likely conditional branches, verify rendered output). `invite/[token]` has 2 (conditional states).
- **Alt text:** blog covers and card images use `alt=""` (decorative, acceptable only if the title is adjacent); the mentor photo has alt. There is no alt-text field in the schema for chapter/course/banner images (`Banner.imageUrl`, `Chapter.coverImage` have none).
- Dialogs: the phone "More" sheet has `role="dialog" aria-modal aria-label="More"` (`SiteNav.tsx:316`). Focus trap, Esc and focus return are unverified.
- Video iframes have titles.
- Maths rendering: **no KaTeX/MathJax in the project.** Formulas are plain text/Unicode (e.g. chapter `symbol` glyphs). If formulas are added in Phase 6, a maths renderer needs a dependency (ask).
- Hindi/Hinglish text: not present in code samples reviewed; no `lang="hi"` needed yet.

**Contrast, computed from `globals.css` tokens (WCAG: 4.5:1 text, 3:1 large text and UI):**

| Pair | Ratio | Result |
|---|---|---|
| Light: foreground on card | 19.5 | Pass |
| Light: `secondary-foreground` on card | 14.9 | Pass |
| Light: `muted-foreground` on card | 4.70 | Pass (marginal) |
| Light: `muted-foreground` on `muted` bg | 4.35 | **Fail** for normal text |
| Light: `primary` text/link on card | 3.77 | **Fail** for normal text; passes only as large text/UI |
| Light: `primary-foreground` on `primary` (btn-primary, white on red) | 3.66 | **Fail** for normal-size button text; passes as large (≥18.66px bold) text only |
| Light: `ok` text on card | 3.17 | **Fail** |
| Light: `gold` text on card | 1.89 | **Fail** (badge text) |
| Light: `xp` text on card | 4.34 | **Fail** (marginal) |
| Light: `destructive` on card | 4.70 | Pass |
| Dark: foreground on bg | 18.96 | Pass |
| Dark: `muted-foreground` on bg | 15.75 | Pass |
| Dark: `primary` on bg | 5.18 | Pass |
| Dark: `primary-foreground` on `primary` | 3.66 | **Fail** (same pair as light) |
| Dark: `ok` on card | 7.98 | Pass |
| Dark: `gold` on card | 11.31 | Pass |

Note: the public site is forced light (`.site-light`), so the **light failures are the ones visitors see**. Dark tokens matter for admin and the learner player. Fixing these changes the brand colours in `design.md`, so Phase 4 proposes values for approval; nothing is changed now. Target size and `prefers-reduced-motion` are unverified.

## 9. Content and E-E-A-T

- About page exists with mentor section; mentor: Karan Mittal, "B.Tech, IIT Delhi" (`lib/site-content.ts:30-40`). Bio claims "mentored 1,000+ JEE aspirants". These claims are the owner's; flag that each public claim needs to be true and provable.
- Support phone `+91 788 855 8921` and hours are in `site-content.ts` and used in the footer. Registered address, CIN and GSTIN are **placeholders and hidden** until real ones are added.
- Social links: Instagram real (`https://www.instagram.com/mathflex.in/`); YouTube is `#` (placeholder). **Do not put `#` into `sameAs`.**
- Policies: privacy, terms, refund pages exist.
- **Blog: all 9 posts are `placeholder: true` sample content** (`lib/blog.ts:4`, comment: "every post below is sample content"). Dates (`2026-10-02` etc.) and the "100-day plan" content are samples. Indexing them would publish fake dated articles under real author names. Blog also has no `updatedAt`/`dateModified`.
- **Free practice** question set is a placeholder starter set (`lib/free-practice.ts`).
- Thin or conditional pages: `/leaderboard` (volatile), `/pricing` (mostly components), legal pages (short by nature).
- No "last updated" dates visible on exam info (none exists yet).

## 10. Internal linking

- Global: `SiteNav` (main links + account menu), phone bottom bar, `SiteFooter`. Chapter detail links to its courses (`courses` include) and to `/learn/[slug]` for previews; course page links to its chapters; home links to chapters and courses; blog posts embed chapter cards (`_type: "chapter"`).
- No breadcrumbs anywhere. No related-chapter links. No class hubs. No chapter → blog or blog → course contextual links beyond the chapter card block.
- Orphan risk: `/pricing`, `/faq`, `/free-practice`, `/book-a-call` depend on nav/footer only; verify they are in the footer in Phase 1.
- The sitemap will be the only discovery path for most chapter pages beyond `/chapters`.

## 11. Findings

| ID | Issue | Severity | Evidence | Proposed fix | Phase | Frontend-only? |
|---|---|---|---|---|---|---|
| F-01 | No `robots.ts` or `sitemap.ts` | Critical | `src/app` listing | Add both, DB-driven, with real filters | 1 | Y |
| F-02 | Blog (9 posts) and free-practice set are **placeholder content**; indexing would publish samples as real dated articles | Critical | `src/lib/blog.ts:4`, `src/lib/free-practice.ts:1-4` | `noindex` posts where `placeholder` is true; keep them out of sitemap. Real content needs Sanity/CMS or admin (Ayush) | 1 | Y for noindex; N for real content |
| F-03 | Private/transactional pages have no `noindex` (`/plans`, `/profile`, `/my-learning`, `/practice*`, `/checkout`, `/login`, `/signup`, `/payment/status`, `/learn/*`, `/leaderboard`) | High | metadata greps, section 3 | Add `robots: { index:false, follow:true }` per route or segment layout | 1 | Y |
| F-04 | Every public page is dynamic SSR (layout reads cookies); no HTML caching, slower TTFB for bots and users | High | `(public)/layout.tsx:14`, no `generateStaticParams`/`revalidate` | Cannot become static while the shared layout reads the session. Options: move user-specific nav into a client island/`Suspense`, or accept SSR and rely on query dedupe. This restructures a shared layout, so propose in Phase 3 and ask first | 3 | Y (needs approval, touches layout) |
| F-05 | `metadataBase` falls back to `http://localhost:3000` if `APP_URL` is unset | High | `src/app/layout.tsx:15` | Confirm `APP_URL` is set in Vercel Production/Preview; add a build-time guard in the SEO helper (no new env vars) | 1 | Config check → Ayush |
| F-06 | No canonical on home, chapters, chapter, course, courses, pricing, practice; listing variants (`?class`, `?sort`, `?q`) are indexable duplicates | High | section 3, 5 | `alternates.canonical` per page without query string | 1 | Y |
| F-07 | Chapter metadata: weak title, tagline as description, extra DB query, ignores `isPublished`, no OG/Twitter | High | `chapter/[slug]/page.tsx:21` | `buildMetadata` + shared `cache()`d loader | 1 | Y |
| F-08 | No OpenGraph/Twitter images or tags anywhere | Medium | section 3 | `opengraph-image.tsx` per segment | 1 | Y |
| F-09 | Duplicate generic description on all pages without one | Medium | section 3 | Per-page descriptions from DB/real copy | 1 | Y |
| F-10 | `/browse` and `/cart` use 307 redirects | Medium | `(app)/browse/page.tsx`, `(app)/cart/page.tsx` | Use `permanentRedirect()` (frontend-only), or leave | 1 | Y |
| F-11 | `<html lang="en">` | Medium | `layout.tsx:31` | `en-IN`. Shared with admin, report impact | 1/4 | Y |
| F-12 | No structured data of any kind | Medium | grep | Phase 2 | 2 | Y |
| F-13 | No breadcrumbs, related-chapter links, class or exam hubs | Medium | section 10 | Phase 5/6 | 5/6 | Y (relations = Ayush) |
| F-14 | `Course` has no `updatedAt`; no `seoTitle`, `metaDescription`, `ogImage`, alt-text fields, `publishedAt`, slug history; Part has no `uploadDate`/thumbnail | Medium | `prisma/schema.prisma:206-226`, `138-158` | Sitemap omits `lastModified` for courses; report to Ayush | 1 | **N** (Ayush) |
| F-15 | Chapter posters never use `coverImage`; blog covers have `alt=""`; no `next/image` | Medium | section 7, 8 | Phase 3 `next/image`; alt fields → Ayush | 3/4 | Y / N |
| F-16 | Light-mode contrast failures: `primary` text 3.77, btn-primary 3.66, `ok` 3.17, `gold` 1.89, `xp` 4.34, `muted-fg` on `muted` 4.35 | Medium | section 8 | Propose token adjustments in design.md terms | 4 | Y (brand change → approval) |
| F-17 | No skip link; Esc/focus-trap unverified | Medium | section 8 | Phase 4 | 4 | Y |
| F-18 | Leaderboard publishes student names/XP on a public URL | Medium | `leaderboard/page.tsx:25-31` | `noindex`; privacy review by owner | 1 | Y |
| F-19 | Social `sameAs`: YouTube link is `#` | Low | `site-content.ts:19` | Use only real URLs | 2 | Y |
| F-20 | Root description claims "IIT Delhi & NIT Jalandhar alumni" while site content names an IIT Delhi mentor | Low | `layout.tsx:14` vs `site-content.ts:33` | Owner to confirm wording | 1 | Y |
| F-21 | No analytics / Search Console verification present | Low | no scripts | Owner adds GSC; tokens needed | 7 | Owner/Ayush |
| F-22 | No maths renderer; formula/PYQ pages need KaTeX | Low | no deps | Ask before adding dependency | 6 | Y (dependency approval) |
| F-23 | Canonical host (apex vs www) and Vercel redirects unverified | Low | not in repo | Owner checks Vercel domains | 1 | N |

## Report for Ayush (SEO items found in this audit)

Listed in `dipankar-design/ayush-handoff.md` under "SEO — Report for Ayush".

---

## Phase 3 results (2026-10-11, local production build, Lighthouse 12.2.1 mobile defaults, one run each)

Local numbers only: the database is on the same machine, so TTFB (90–160 ms) is not representative of Vercel. Single Lighthouse runs vary a lot (home TBT went 540 ms → 90 ms between two runs of nearly identical code), so treat the score changes below as noise except for byte weight, which is deterministic.

| Page | Before (perf / LCP / TBT / weight) | After |
|---|---|---|
| Home | 66 / 4.4 s / 540 ms / 502 KiB | 87–88 / 3.7 s / 0–20 ms / 455 KiB (3 runs after the H1 entrance animation was removed; first run 84) |
| Chapters | 90 / 3.5 s / 10 ms / 457 KiB | 83 / 3.9 s / 80 ms / 410 KiB |
| Chapter | 82 / 4.1 s / 30 ms / 494 KiB | 87 / 3.8 s / 10 ms / 449 KiB |
| Course | 86 / 4.0 s / 10 ms / 486 KiB | 82 / 4.2 s / 30 ms / 440 KiB |

Accessibility 93–96, Best practices 100, SEO 100 on all (blog sample post SEO 69 because it is noindex on purpose). CLS 0–0.001.

Change made: the header/footer logo was a 3511×783 px PNG (61 KB) shown at ~130 px wide; now 520×116 px copies (15 KB). About 45 KiB less on every public page.

Observed, not changed: ~188 KB of fonts on home (Inter plus JetBrains Mono used for small labels); one shared JS chunk (70 KB) takes ~1.2 s scripting under 4× CPU throttling on home; the hero text uses an entrance animation that delays LCP; all public pages render per request (see layout options in the Phase 3 report).

### Phase 4 contrast results (local build, Lighthouse 12.2.1 mobile)

After the `muted-foreground`, `ok`, `ok-strong`, `xp` and `text-gold` changes (primary not yet applied): home 88 / 97 (perf / a11y), chapters 85 / 96, chapter 87 / 96, course 86 / 96. Every remaining `color-contrast` failure is a `primary` pair (white on primary 3.64, red text 3.74). Best-practices shows 96 locally only because `/_vercel/speed-insights/script.js` 404s off Vercel. Heading order checked: one H1 on book-a-call, invite and every payment/status state.
