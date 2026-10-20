# Pull request: feature/seo → main

**Title:** SEO foundations: metadata, indexing rules, structured data, performance and accessibility

## Summary
Frontend-only SEO programme (phases 0–7). Public pages now have unique titles, descriptions, canonicals and Open Graph images; private pages are `noindex`; `robots.txt`, a dynamic `sitemap.xml` and a web manifest exist; chapter and course pages carry valid Course JSON-LD; the home hero and copy are updated; contrast and keyboard accessibility are fixed on the public site. `seo.md` documents the rules, and `CLAUDE.md` now points to it.

## What changed
- **Metadata and indexing:** `src/lib/seo/*` helpers, per-template titles/descriptions, canonicals from `APP_URL` (canonical site address: `https://mathflex.in`, no `www`, no trailing slash), `privateMetadata` on login/account/practice/checkout/leaderboard pages, placeholder blog posts and `/free-practice` kept `noindex`, `/browse` and `/cart` 308-redirect.
- **Crawl files:** `robots.ts` (disallow `/admin`, `/api/`), `sitemap.ts` (published chapters, courses, real blog posts only; real `updatedAt`), `manifest.ts`, OG images via `next/og`.
- **Structured data:** Organization + WebSite, Course on chapter/course pages, ItemList on listings, BreadcrumbList with a visible breadcrumb line. No FAQ/HowTo/rating markup.
- **Home hero and copy:** new title and description, H1 "IIT starts with maths, crack JEE Main & Advanced" (no entrance animation), two-sentence subheading, pointer hidden under 768px; "Part 1 free" wording changed to "free 3–4 minute preview"; chapter label and related-chapters selection (syllabus neighbours); instructor row with "IIT Delhi alumnus · Updated {date}".
- **Performance:** logo images 61 KB → 15 KB, `@vercel/speed-insights` added.
- **Accessibility:** skip link and `id="main"` on all shells, focus trap in the mobile "More" sheet, scoped focus ring, `role="img"`/`role="timer"` fixes, contrast tokens (`primary`, `ok`, new `ok-strong`, `xp`, `muted-foreground`) scoped to `.site-light`, `text-gold` text switched to `text-foreground`.
- **Docs:** `seo.md`, `docs/seo-audit.md`, `docs/seo-landing-plan.md` (plan only), `dipankar-design/ayush-handoff.md`, `design.md` files, `frontend-rules.md` branch line.

## Verification (local production build, re-run after the mobile pass)
- `tsc --noEmit` clean; `eslint src` clean; `next build` passes (the only ESLint errors are in the vendored `dipankar-design/designs/support.js`, which is untouched).
- Googlebot-UA curl of every template (earlier run): expected status, unique title/description, self canonical, robots, OG image and JSON-LD; 404 is a real 404; `/robots.txt`, `/sitemap.xml` (49 URLs), `/manifest.webmanifest` and `/opengraph-image` return 200.
- **Lighthouse mobile (fresh run on the final production build):**

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| Home | 86 | 100 | 96 | 100 | 3.9 s | 0 |
| Chapters | 89 | 100 | 96 | 100 | 3.7 s | 0 |
| A chapter | 86 | 100 | 96 | 100 | 3.9 s | 0 |
| A course | 85 | 100 | 96 | 100 | 4.0 s | 0 |
| Pricing | 88 | 100 | 96 | 100 | 3.6 s | 0 |

  Performance moves by about 2 points between runs (single run each). Best practices is 96 locally only because the Speed Insights script 404s off Vercel.
- **Mobile layout check (production build, 145 page × width runs: 20 public pages and 9 signed-in pages at 360 / 390 / 412 px, plus 768 and 1280):** zero page overflow, zero elements wider than the screen, no text under 12px, and every tap target is at least 44px. Two exceptions remain by design: the chapter search input is measured at 40–42px, but it sits inside a 44px label that is the real tap area. Desktop (1280) and tablet (768) were checked and look unchanged.
- **Behaviour tests (headless Chrome, 390px):** the welcome popup stays hidden on first load, opens after the first scroll or on the second page view (also on client-side navigation), and closes with Escape; the chapters Filters sheet opens and closes (44px close button, Escape); the More menu has a 44px close button and closes with Escape; the pricing selection bar appears after picking a chapter.

## Other UI changes in this PR
Not SEO work, but made on this branch at the owner's request:
- **Leaderboard:** period tabs reordered to All time, This month, This week (default view unchanged). The full-width filter bar and its borders are gone; the bar gets a hairline and blur only when it sticks under the nav. Student rows keep their dividers.
- **Pricing:** the "Free chapter preview" card is removed (four cards remain: single chapter and the three courses). The closing headline is now "Watch a free 3–4 minute preview first." instead of "Start with ₹0. Pay when you're sure."
- **Access length display:** access now shows as "3 months", "1 year" or "2 years" (`validity()` in `src/lib/format.ts`) on chapter, course, courses-compare, pricing and plans pages and in the access FAQ answer. The single-chapter pricing card gets an access line.
- **My Learning:** empty-state heading "Start with a free preview".

- **Mobile pass (phones under 760px; desktop and tablet unchanged).** Rules are in `dipankar-design/design.md` section 6a, findings in `docs/mobile-audit.md`.
  - Hero H1 is 44px on phones (was 38px on home), other headings have fixed phone floors, side gutter is a 16px token (`--gutter`), section padding is 48px, and every text field is 16px (no iOS zoom). Nothing is under 12px and every tap target is at least 44px.
  - Home compare table is stacked cards; the pillars carousel has a soft white edge blur; the chapter picker row and chip rows snap with a visible next item.
  - **Chapters:** a single-column list with a thumbnail on phones (two columns from 640px, same grid as before from tablet up). The sticky filter bar is one row (search plus a Filters button) with the rest in a bottom sheet.
  - **Pricing:** a sticky "Your selection" bar with the total and "Add to cart" appears above the tab bar once a chapter is picked. **Courses:** the course switch fits 312px.
  - **Welcome popup:** it no longer opens over the hero 2.5 seconds after the first load. It now opens after the visitor's first scroll or on their second page view; it has a 44px close button, Escape and a focus trap.
  - **Learn page:** only the 56px header stays pinned (section tabs scroll away) and the video is full width. **Checkout and cart:** the FlexCare button is hidden there. **FlexCare:** a 44px icon on phones.
  - **Leaderboard:** compact rows that fit 360px. **Bottom sheets:** the More menu gained a close button and swipe-down.
  - New shared pieces: `BottomSheet`, the `cta-row` button group (stacked full-width on phones), and min button heights (48px primary, 44px small).
- **Mentor and contact details (from the owner):**
  - Karan Mittal, B.Tech in Civil Engineering, IIT Delhi (graduated June 2023): "IIT Delhi alumnus" in bylines and the hero; "Karan Mittal · B.Tech, Civil Engineering, IIT Delhi (2023)" on the About page and mentor section. NIT Jalandhar is removed from frontend code (`src/lib/legal/about.ts`). `chapterBlurb()` keeps rewriting the old chapter descriptions until Ayush fixes the 35 in admin.
  - The About page has ProfilePage + Person JSON-LD (name, jobTitle "JEE Maths Mentor", `alumniOf`, `hasCredential`, `sameAs`); the chapter and course Course markup links its instructor to the same Person. There is no mentor photo yet, so no `image`.
  - Instagram (clean URL) is in the footer, the contact page and Organization `sameAs`. WhatsApp channel, LinkedIn and YouTube show as plain "Coming soon" text (no links, not in `sameAs`).
  - Support phone +91 78885 58921 is a tappable `tel:` link in the footer and contact page and in Organization `contactPoint`.
  - Canonical site address is `https://mathflex.in` (documented; `APP_URL` is set by Ayush).
- **Leaderboard empty state:** when a period has no real rows it shows "The leaderboard opens with our first students" and six greyed rows marked "Sample" (generic names, a "not real students" line). Real rows replace them automatically, with no sample rows mixed in. The page stays `noindex`.

**Data change Ayush must make before the new access rules apply.** The rule is: single chapter 3 months (each chapter in an order gets its own 3 months), Class 11 Complete 1 year, Class 12 Complete 1 year, Class 11 + 12 combo 2 years. The code already reads `validityDays` per item, so nothing changes for students until the database holds the new values: `Chapter.validityDays = 90` for all chapters, courses 365 / 365 / 730, the schema default (`@default(365)`) changed to 90, and the seed FAQ text updated. Existing entitlements are not changed. Until then the pages will keep showing 1 year for everything. Details are in `dipankar-design/ayush-handoff.md`.

## Needs Ayush / owner (not in this PR)
See "SEO final checklist" in `dipankar-design/ayush-handoff.md`: `APP_URL`, host redirect, `/admin` `X-Robots-Tag`, Search Console and Bing setup, schema fields (slug history, SEO fields, alt text), publish hooks, admin copy fixes, and switching on real blog/free-practice content.

## Risks
- `primary` is slightly deeper on the public site (4.57:1 for white on red); admin and dark mode are unchanged.
- Every public page still renders per request because the layout reads the session cookie (performance option A, revisit with Speed Insights data).
- Please test manually before merge: login (email and Google), Cashfree test checkout, video playback, admin. Not testable locally: real Bunny playback and fullscreen/landscape video, the software keyboard on forms, and a real notch/safe area. Check these on a phone with a Vercel preview.
