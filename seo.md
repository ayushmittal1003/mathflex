# SEO rules for MathFlex

Every new or changed public page must follow this file. It describes what the code on `feature/seo` already does. Code lives in `src/lib/seo/` (`config.ts`, `metadata.ts`, `schema.ts`, `queries.ts`, `og.tsx`), `src/components/seo/JsonLd.tsx`, `src/app/{robots,sitemap,manifest}.ts` and `src/components/site/web/Breadcrumbs.tsx`. Deeper background and measurements: `docs/seo-audit.md`. Future landing pages: `docs/seo-landing-plan.md`.

## 1. Indexing rules

| Route | Index? | In sitemap | JSON-LD | Notes |
|---|---|---|---|---|
| `/` | yes | yes | Organization + WebSite | Title is absolute (no template) |
| `/chapters`, `/courses` | yes | yes | ItemList | |
| `/chapter/[slug]` | yes, only when published | yes (`lastModified` = `updatedAt`) | Course + BreadcrumbList | Unpublished: 404 for the public |
| `/courses/[slug]` | yes, only when published | yes | Course (+ breadcrumb) | |
| `/pricing`, `/about`, `/contact`, `/faq`, `/book-a-call`, `/privacy`, `/terms`, `/refund-policy` | yes | yes | none | |
| `/blog`, `/blog/[slug]` | **only real posts** | real posts only | BreadcrumbList on real posts | Posts with `placeholder: true` in `src/lib/blog.ts` are `noindex` and out of the sitemap automatically |
| `/free-practice` | **no, for now** | no | none | Hard-coded `noindex: true` in its `page.tsx` |
| `/leaderboard`, `/login`, `/signup`, `/my-learning`, `/profile`, `/plans`, `/practice*`, `/learn/*`, `/checkout`, `/cart`, `/payment/*`, `/invite/*` | no (`noindex, follow`) | no | none | Use `privateMetadata()`. **Never block these in robots.txt**: a blocked page can't show its noindex |
| `/admin` | no | no | none | `robots.txt` disallows it. The `X-Robots-Tag` header still has to be added in config (Ayush list) |
| `/api/*` | no | no | none | Disallowed in `robots.txt` |
| `/browse`, `/cart` | redirect (308) to the canonical page | no | none | |
| Unknown URL | real 404, `noindex` | no | none | |

Never use robots.txt blocking and `noindex` on the same URL.

## 2. Metadata conventions

Use `buildMetadata()` from `src/lib/seo/metadata.ts`. Do not hand-write `<title>` or canonical tags.

- **Title:** unique, ≤ 60 characters, written for people. The `| MathFlex` suffix comes from the layout template. The home page uses `title.absolute` and has no suffix.
  - Chapter: `{Chapter}: Class {n} JEE Maths Video Lessons`
  - Course: `{Course} – JEE Maths Course`
  - Static pages: plain descriptive name, for example `About MathFlex – JEE Maths Mentorship`
- **Description:** unique, ≤ 160 characters, honest, ends in a complete sentence (the helper trims at word boundaries). Chapter descriptions are built from the admin description by `chapterBlurb()`, which falls back to the tagline when it cannot use the text.
- **Canonical:** absolute, self-referencing, from `APP_URL` (`SITE_URL` in `config.ts`). Never include tracking parameters (`utm_*`, `ref`), filters or invite codes. Internal links must point to canonical URLs.
- **Open Graph / Twitter:** set by the helper. The site default image is `src/app/opengraph-image.tsx`. Chapter and course pages have their own `opengraph-image.tsx`, and pass `defaultImage: false` so the default is not added twice. A child page's `openGraph` replaces the parent's, so always go through the helper.
- **Do not add:** `<meta name="keywords">`, `changeFrequency`/`priority` in the sitemap, `lastModified = now`.
- **Credential wording:** only "IIT Delhi alumnus" is confirmed. Do not add other credentials until the owner confirms them.

## 3. JSON-LD per template

Rendered by `<JsonLd />` (server component, escapes `<`). Only on indexable pages, and only for content visible on the page.

| Template | Types |
|---|---|
| Home | Organization (name, logo, contact, `sameAs`) + WebSite (no SearchAction) |
| `/chapters`, `/courses` | ItemList |
| Chapter, course | Course (provider, Offer in INR, `hasCourseInstance` online, `inLanguage` en-IN, `teaches` from real topics) + BreadcrumbList |
| Real blog post | BreadcrumbList (add Article only with a real author and dates) |

Not used, on purpose: FAQPage / HowTo / Course-info rich-result markup (retired or restricted by Google), self-serving `AggregateRating` or reviews, markup on `noindex` pages, any claim not shown on the page. Validate new markup with the Rich Results Test and the Schema.org validator.

## 4. Sitemap logic (`src/app/sitemap.ts`)

- `force-dynamic`: one small DB read per request, always fresh.
- Static paths + published chapters + published courses + non-placeholder blog posts (`/blog` itself only when at least one real post exists).
- `lastModified` is the real `updatedAt` of the item. If a model has no `updatedAt`, omit the field.
- Same publish filters as the public pages. Unpublished, draft and placeholder items never appear.
- Add new static public pages to the static list. Add new dynamic page types as a new query, with the same filter as the page itself.
- Split with `generateSitemaps()` only if URLs approach 45,000.

## 5. New page checklist

- [ ] Server-rendered primary content and links
- [ ] Unique title (≤ 60 chars) and description (≤ 160) via `buildMetadata`
- [ ] Self canonical, correct robots (`privateMetadata` for private pages)
- [ ] One H1, logical headings, breadcrumb UI + `BreadcrumbList`
- [ ] Correct JSON-LD for its type, validated
- [ ] Included in (or deliberately excluded from) `sitemap.ts`
- [ ] At least 3 internal links in, links out to the hub and related pages
- [ ] Images with alt text (decorative: `alt=""`), no layout shift; use `next/image` where it fits
- [ ] Lighthouse mobile: performance ≥ 90 if achievable, SEO 100, accessibility 100 (axe clean)
- [ ] Facts dated and sourced, mentor byline, "last updated"
- [ ] OG image renders
- [ ] Skip link and `id="main"` come from the layout; keep one `<main>`
- [ ] Colours from tokens only (see `dipankar-design/design.md`); text meets 4.5:1

## 6. Admin-created content checklist

For whoever publishes chapters, courses and blog posts in admin:

- [ ] Unique, descriptive title and a description of 1–2 plain sentences (no keyword lists)
- [ ] Credential wording is exactly "IIT Delhi alumnus"; no unconfirmed claims, results or ratings
- [ ] Prices, validity and what's included are accurate
- [ ] Publish only when the page is complete: unpublished items stay out of the site and the sitemap
- [ ] Cover images have meaningful alt text (when the field exists)
- [ ] Changing a slug breaks old links: do not rename a live slug without a redirect (slug history is on the Ayush list)
- [ ] Banner and marquee text uses the current wording ("free 3–4 minute preview")
- [ ] **Blog and free practice:** real posts and the real free-practice set must be switched on when they go live (see section 8)

## 7. Deprecated and avoided tactics

Do not add or reintroduce: meta keywords; FAQPage, HowTo or Course-info rich-result chasing; self-serving `AggregateRating`; sitemap `changefreq`/`priority`; `lastModified = new Date()`; robots-blocking plus `noindex` on the same URL; thin or programmatic mass pages; keyword stuffing and hidden text; `llms.txt` as a ranking lever (optional, ignored by Google Search); fabricated reviews, stats or credentials.

## 8. Reminder: placeholders must be switched on when real content goes live

- **Blog:** all current posts in `src/lib/blog.ts` are sample content flagged `placeholder: true`, so they are `noindex` and not in the sitemap. When the real posts come from Sanity, remove the flag post by post (or replace the data source). The listing, sitemap and breadcrumb schema switch on automatically once a real post exists.
- **/free-practice:** hard-coded `noindex: true` in `src/app/(site)/(public)/free-practice/page.tsx`. When the real question set is live, remove it and add the page to `sitemap.ts`.
- Check both in the next SEO review after launch.

## 9. Monitoring cadence

- **Weekly:** Google Search Console: Page indexing (coverage), queries, and any new "Excluded" reasons; Bing Webmaster Tools errors.
- **Monthly:** Core Web Vitals (Search Console and Vercel Speed Insights), a Lighthouse mobile run on home, chapters, a chapter and a course, and a check that the sitemap URL count matches the published catalogue.
- **When it happens:** update exam-related pages as soon as NTA posts a notice; re-verify dated facts at least quarterly; rerun the new-page checklist after any template change.
- **After each deploy that touches layouts or metadata:** open view-source on one page of each template and confirm title, canonical, robots and JSON-LD.
