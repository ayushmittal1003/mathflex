# Pull request: feature/seo → main

**Title:** SEO foundations: metadata, indexing rules, structured data, performance and accessibility

## Summary
Frontend-only SEO programme (phases 0–7). Public pages now have unique titles, descriptions, canonicals and Open Graph images; private pages are `noindex`; `robots.txt`, a dynamic `sitemap.xml` and a web manifest exist; chapter and course pages carry valid Course JSON-LD; the home hero and copy are updated; contrast and keyboard accessibility are fixed on the public site. `seo.md` documents the rules, and `CLAUDE.md` now points to it.

## What changed
- **Metadata and indexing:** `src/lib/seo/*` helpers, per-template titles/descriptions, canonicals from `APP_URL`, `privateMetadata` on login/account/practice/checkout/leaderboard pages, placeholder blog posts and `/free-practice` kept `noindex`, `/browse` and `/cart` 308-redirect.
- **Crawl files:** `robots.ts` (disallow `/admin`, `/api/`), `sitemap.ts` (published chapters, courses, real blog posts only; real `updatedAt`), `manifest.ts`, OG images via `next/og`.
- **Structured data:** Organization + WebSite, Course on chapter/course pages, ItemList on listings, BreadcrumbList with a visible breadcrumb line. No FAQ/HowTo/rating markup.
- **Home hero and copy:** new title and description, H1 "IIT starts with maths, crack JEE Main & Advanced" (no entrance animation), two-sentence subheading, pointer hidden under 768px; "Part 1 free" wording changed to "free 3–4 minute preview"; chapter label and related-chapters selection (syllabus neighbours); instructor row with "IIT Delhi alumnus · Updated {date}".
- **Performance:** logo images 61 KB → 15 KB, `@vercel/speed-insights` added.
- **Accessibility:** skip link and `id="main"` on all shells, focus trap in the mobile "More" sheet, scoped focus ring, `role="img"`/`role="timer"` fixes, contrast tokens (`primary`, `ok`, new `ok-strong`, `xp`, `muted-foreground`) scoped to `.site-light`, `text-gold` text switched to `text-foreground`.
- **Docs:** `seo.md`, `docs/seo-audit.md`, `docs/seo-landing-plan.md` (plan only), `dipankar-design/ayush-handoff.md`, `design.md` files, `frontend-rules.md` branch line.

## Verification (local production build)
- `tsc --noEmit` clean; `next build` passes; `eslint src` clean (the only ESLint errors are in the vendored `dipankar-design/designs/support.js`, which is untouched).
- Googlebot-UA curl of every template: expected status, unique title/description, self canonical, robots, OG image and JSON-LD; 404 is a real 404; `/robots.txt`, `/sitemap.xml` (49 URLs, all within 2 clicks of home), `/manifest.webmanifest` and `/opengraph-image` return 200.
- Lighthouse mobile: home 86, chapters 86, chapter 87, course 87 performance; accessibility 100 on all four; SEO 100. (Best practices 96 locally only because the Speed Insights script 404s off Vercel.)

## Needs Ayush / owner (not in this PR)
See "SEO final checklist" in `dipankar-design/ayush-handoff.md`: `APP_URL`, host redirect, `/admin` `X-Robots-Tag`, Search Console and Bing setup, schema fields (slug history, SEO fields, alt text), publish hooks, admin copy fixes, and switching on real blog/free-practice content.

## Risks
- `primary` is slightly deeper on the public site (4.57:1 for white on red); admin and dark mode are unchanged.
- Every public page still renders per request because the layout reads the session cookie (performance option A, revisit with Speed Insights data).
- Please test manually before merge: login (email and Google), Cashfree test checkout, video playback, admin.
