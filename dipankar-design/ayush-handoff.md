# Report for Ayush

Items found during the frontend redesign that touch backend, auth, admin or config. They were **not** pre-approved; please review.

## 1. Google sign-in (commit `99ea741`)

New server-side files, not yet reviewed by the backend owner:

- `src/app/api/auth/google/route.ts` (starts the OAuth flow, sets a one-time state cookie)
- `src/app/api/auth/google/callback/route.ts` (checks state, reads the verified Google email, logs in the matching user or creates one with `db.user.create`, then `createSession`)
- `src/lib/google.ts` (code-for-token exchange and userinfo call)

Please check:

- The callback repeats the email sign-up rules (`isBlocked`, `settings.features.signupOpen`) in a second place.
- New users get a random unused password hash.

**Environment variables** (names only; set on Vercel, see `.env.example`):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `APP_URL` (already used; the redirect URI is built from it)

**Redirect URI** to register in Google Cloud Console (OAuth client, Web): `<APP_URL>/api/auth/google/callback`

Until the env vars exist, the button shows as coming soon and the routes redirect to `/login?error=google_unavailable`.

## 2. Chapter preview video (`previewSrc`)

The home page "Try it before you buy it" section reads a per-chapter `previewSrc` (3-4 minute free preview). No admin field or data exists yet, so it shows "Preview coming soon". Needed from the backend/admin:

- A per-chapter preview video field in admin (Bunny Stream video).
- Expose it to the catalog data the home page uses.

The hook is marked in `src/app/(site)/(public)/page.tsx`.

## 3. Invoices

`/plans` says "ask support" for invoices because there is no invoice backend.

---

# SEO — Report for Ayush

From the Phase 0 audit (`docs/seo-audit.md`, branch `feature/seo`). Nothing here has been implemented.

## Environment / config
- Set `APP_URL` to **`https://mathflex.in`** (the confirmed canonical address: no `www`, no trailing slash) in Vercel Production and Preview. The root layout uses it for `metadataBase` and falls back to `http://localhost:3000` when it is missing, which would put wrong URLs into canonicals, Open Graph tags and the sitemap.
- The canonical host is `mathflex.in`. Make `www.mathflex.in` redirect to it with a 301/308 in Vercel.
- Decide whether `/admin` should get an `X-Robots-Tag: noindex` header (`next.config`) or a `noindex` in the admin layout. For now the plan is only `Disallow: /admin` in `robots.txt`.
- Google Search Console and Bing Webmaster verification tokens (owner to supply; none are invented).

## Schema / admin fields missing
- `Course`: no `updatedAt` (the sitemap cannot give real `lastModified`), no `publishedAt`.
- `Chapter`, `Course`, blog posts: `seoTitle`, `metaDescription`, `ogImage`, editable slug with slug history for 301s, `noindex` toggle.
- Image alt text fields (chapter/course cover, banners, blog cover) and the admin form inputs. `Chapter.coverImage` exists but the public site does not use it yet.
- `Part` (video): no `uploadDate` or thumbnail URL; the pending `previewSrc` / `previewVideoProvider` + `previewVideoRef` fields on `Chapter` (see section 2 above).
- Chapter relations (prerequisite / next) for related-chapter links.
- Author/mentor model (name, slug, bio, credentials, photo, sameAs).

## Content sources
- Blog (`src/lib/blog.ts`) is 9 placeholder posts; the plan was Sanity. Real posts, real dates and an `updatedAt` are needed before blog URLs can be indexed. Until then they will be `noindex` and left out of the sitemap.
- Free practice (`src/lib/free-practice.ts`) is a placeholder starter set; same treatment.
- Registered address, CIN and GSTIN are placeholders.

## Hooks
- On publish/unpublish of chapters, courses and posts: `revalidatePath`/`revalidateTag` for the affected pages and the sitemap, and an optional IndexNow ping.

## SEO Phase 1 additions
- **Leaderboard privacy:** `/leaderboard` is public and lists students' full names with XP. It is now `noindex`, but should the page show first name + last initial only (e.g. "Aarav S.")? Display is unchanged; this needs a decision and, if yes, a change where the rows are built.
- **Chapter descriptions:** the seeded `Chapter.description` text (admin-managed) says "taught … by IIT Delhi & NIT Jalandhar alumni". It is used as the meta description for chapter pages. The owner has to confirm the correct credential wording and update it in admin.
- **Sitemap/robots caching:** `sitemap.ts` is `force-dynamic` (always fresh, one small DB read per request). When publish hooks (`revalidatePath`/`revalidateTag`) exist it can switch to `revalidate = 3600`.
- **Switch-on list when real content goes live:** blog posts (`placeholder: true` flag in `lib/blog.ts` controls noindex and sitemap automatically), `/free-practice` (hard-coded `noindex: true` in its `page.tsx`).

## Teacher credential wording (admin text)
The owner confirmed the mentor: **Karan Mittal, B.Tech in Civil Engineering, IIT Delhi (graduated June 2023)**; short form **"IIT Delhi alumnus"**. NIT Jalandhar is **not** a claim we make. The frontend code no longer mentions it (`src/lib/legal/about.ts` is fixed). **Still to do in admin:** the `description` of all 35 chapters currently says "…by IIT Delhi & NIT Jalandhar alumni". The SEO meta description rewrites that phrase on the fly (`chapterBlurb()` in `src/lib/seo/metadata.ts`); that workaround stays until you fix the 35 descriptions, then it can be removed. The seed text in `prisma/seed.ts` needs the same fix.

## Dark-mode `primary` contrast (admin and learner player)
White text on the brand red (`--primary` `oklch(0.637 0.237 25.331)`) is 3.66:1, below the 4.5:1 AA minimum for normal-size text. The public website (always light) is being fixed separately, scoped to `.site-light`. Dark mode and `/admin` still use the base value in `:root` / `.dark`, so primary buttons in admin and the learner player have the same issue. Deliberately not changed: it alters admin's look. If you want it fixed, lower `--primary` lightness to about 0.58 in `:root` and `.dark` (and the `--ring` / `--accent` / `--sidebar-primary` copies).

## Speed Insights and copy that lives in admin/seed
- **Vercel Speed Insights:** `@vercel/speed-insights` is added and `<SpeedInsights />` is in the root layout (it only sends data when deployed on Vercel). Please enable Speed Insights for the project in the Vercel dashboard and check that it fits our plan (data-point limits). Until it is enabled, nothing is collected.
- **Marquee text:** the live marquee banner "🎬 Limits & Derivatives: Part 1 is free to watch" is admin data (seeded by `prisma/seed.ts`, not touched). Please change it in admin, and the seed, to match the new wording, e.g. "Free 3–4 minute preview: Limits & Derivatives".

## SEO Phase 6 (landing-page plan, nothing built)
See `docs/seo-landing-plan.md`, section 6, for the backend/admin needs: content store (MDX or Sanity) for formula/syllabus/hub copy, PYQ metadata (year, session, shift, solution, public flag), the method behind `Chapter.jeeWeightage`, chapter prerequisite relation, author model, and a product decision on Class 10 / dropper offers.

## SEO final checklist (owner / Ayush, after the branch is merged and deployed)
Nothing here was done in code. Details of each item are in the sections above.

**Config / infra**
- [ ] Set `APP_URL=https://mathflex.in` in Vercel Production and Preview. Canonicals, sitemap, robots and OG all read it.
- [ ] Redirect `www.mathflex.in` → `https://mathflex.in` on Vercel.
- [ ] `X-Robots-Tag: noindex` for `/admin` (headers in `next.config.ts` or Vercel); security headers.
- [ ] Enable Vercel Speed Insights for the project and check the plan fits.
- [ ] Replace placeholder company address, CIN, GSTIN in the legal/footer data.

**Search consoles (owner)**
- [ ] Google Search Console: Domain property (DNS verification), submit `/sitemap.xml`, URL Inspection on home, `/chapters`, one chapter, one course; confirm the "Search generative AI features" setting; then watch Page indexing, Core Web Vitals and the generative AI performance report.
- [ ] Bing Webmaster Tools: import from GSC, submit the sitemap, monitor AI Performance.
- [ ] IndexNow: key file plus a publish ping from admin (backend hook).

**Schema / admin data**
- [ ] `Course`, `Chapter`, blog: unique editable `slug` with slug history (301s), `seoTitle`, `metaDescription`, `ogImage`, `noindex` toggle, `publishedAt`, `updatedAt` on Course.
- [ ] Alt-text fields for covers, banners, thumbnails and blog images.
- [ ] Video fields: duration, upload date, free-preview flag, chapter timestamps, public thumbnail, the `previewSrc` admin field.
- [ ] Author/mentor model; chapter prerequisite/next relations.
- [ ] Revalidate hooks on publish (pages plus sitemap).
- [ ] Fix the 35 chapter descriptions ("IIT Delhi & NIT Jalandhar alumni" → "IIT Delhi alumnus", also in `prisma/seed.ts`) and the marquee text. Then remove the `chapterBlurb()` rewrite.
- [ ] Mentor photo: add the file to `public/` and set `instructor.photo` in `src/lib/site-content.ts`; it then appears in the Person JSON-LD `image` automatically.
- [ ] Decide on leaderboard names (first name + last initial).
- [ ] Optional: fix dark-mode `primary` contrast for admin and the learner player.

**Content (owner)**
- [ ] Switch on real blog posts and `/free-practice` when real content exists (`seo.md` section 8).
- [ ] Landing pages: see `docs/seo-landing-plan.md`, "Pending decisions" (separate branch later).

## Access length (validity) change: data, no code change needed
New rule from the owner: single chapter = 3 months (each chapter bought separately gets its own 3 months, even in one order); Class 11 Complete = 1 year; Class 12 Complete = 1 year; Class 11 + 12 combo = 2 years.
`fulfilOrder` (`src/lib/orders.ts`) already reads `validityDays` from each `Chapter` / `Course`, so this is a data change:
- Set `Chapter.validityDays = 90` on all 35 chapters (admin, or one update). Also change the schema default (`prisma/schema.prisma`, currently `@default(365)`) so new chapters get 90.
- Set `Course.validityDays`: Class 11 Complete 365, Class 12 Complete 365, Class 11 + 12 combo 730.
- Existing entitlements keep their current expiry; only new purchases and renewals use the new values. **No back-filling is needed**: the owner confirmed every current order is a dummy test transaction.
- **Before launch, in this order:**
  1. Check the production database for test orders and entitlements (`Order`, `Entitlement`, and any test users or coupons made while testing) and remove them if any exist.
  2. Then apply the validity change above: chapters 90, Class 11 and Class 12 courses 365, combo 730, schema default 90.
- Seed copy to update: the FAQ answer in `prisma/seed.ts` (~line 250) says "365 days by default".
- The frontend now shows the length as "3 months / 1 year / 2 years" (`validity()` in `src/lib/format.ts`); it follows whatever is in the database.

### Database and seed text that still needs changing (homepage-fixes branch)
These live in the database or `prisma/seed.ts`, so the frontend can't fix them:
- Marquee banner (`seed.ts:236`): "Limits & Derivatives: Part 1 is free to watch" → "Free 3–4 minute preview".
- HERO banner (`seed.ts:234`): "Stop buying ₹30,000 courses. Buy one chapter." and "from ₹149" (hardcoded; use the live minimum chapter price). Also the "IIT Delhi & NIT Jalandhar alumni" wording (see above).
- Seed FAQ (`seed.ts:252`): "Why is Part 2 locked? … finish Part 1's video …" is fine as a rule, but the access-length FAQ (~line 250) says "365 days by default": use "Single chapters: 3 months. Class 11 or Class 12 Complete: 1 year. Class 11 + 12 combo: 2 years."
- Course subtitles (`seed.ts:222–223`): "All 20 Class 11 chapters." / "All 15 Class 12 chapters." are hardcoded counts; edit them in admin when chapters are added, or drop the count from the subtitle.
- `Chapter.validityDays` / `Course.validityDays` values: see "Access length" above (chapters 90, Class 11 and 12 = 365, combo = 730, schema default 90). The chapter cards now show "3 months access" etc. straight from these.
- Code note: `src/lib/catalog.ts` now also returns `validityDays` per chapter (read-only addition).

## Upcoming
- **Sanity Studio (after the `feature/seo` PR is merged, on its own branch):** connect Sanity for (1) blog posts, with author, date, cover and categories, replacing `getPosts()` / `getPost()` in `src/lib/blog.ts` and keeping the `BlogPost` shape; (2) an author profile for the mentor (name, bio, credential "IIT Delhi alumnus", photo); (3) later, static SEO page content for the landing pages (`docs/seo-landing-plan.md`). Chapters, courses, prices and users stay in the current database.
  - Needed from the owner: Sanity project ID, dataset name (`production`), an optional read token for draft previews, and a webhook secret.
  - Env vars: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_READ_TOKEN` (optional), `SANITY_REVALIDATE_SECRET`.
  - Ayush: an `/api/revalidate` route plus a Sanity webhook so publishing refreshes the blog pages and sitemap; add the site domains under CORS origins in sanity.io/manage.
  - Frontend (me): schemas for `post`, `author`, `category`, a `/studio` route, the Sanity client and queries. Remove `placeholder` flags post by post as real posts go live (see `seo.md` section 8).
- **Social profiles (next branch):** Instagram (`https://www.instagram.com/mathflex.in/`) is live in the footer, contact page and Organization `sameAs`. The WhatsApp channel, LinkedIn and YouTube are not ready; the footer and contact page show them as plain "Coming soon" text (no links, nothing in `sameAs`). When each goes live, add it to `socials` in `src/lib/site-content.ts` and to `SOCIAL_PROFILES` in `src/lib/seo/config.ts`.
