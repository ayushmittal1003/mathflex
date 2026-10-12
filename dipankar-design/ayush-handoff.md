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
- Confirm `APP_URL` is set to the canonical public origin in Vercel Production and Preview. The root layout uses it for `metadataBase` and falls back to `http://localhost:3000` when it is missing, which would put wrong URLs into canonicals, Open Graph tags and the sitemap.
- Confirm the canonical host (`mathflex.in` vs `www.mathflex.in`) and that the other one redirects with a 301/308 in Vercel.
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
- Registered address, CIN and GSTIN are placeholders; YouTube link is `#`.

## Hooks
- On publish/unpublish of chapters, courses and posts: `revalidatePath`/`revalidateTag` for the affected pages and the sitemap, and an optional IndexNow ping.

## SEO Phase 1 additions
- **Leaderboard privacy:** `/leaderboard` is public and lists students' full names with XP. It is now `noindex`, but should the page show first name + last initial only (e.g. "Aarav S.")? Display is unchanged; this needs a decision and, if yes, a change where the rows are built.
- **Chapter descriptions:** the seeded `Chapter.description` text (admin-managed) says "taught … by IIT Delhi & NIT Jalandhar alumni". It is used as the meta description for chapter pages. The owner has to confirm the correct credential wording and update it in admin.
- **Sitemap/robots caching:** `sitemap.ts` is `force-dynamic` (always fresh, one small DB read per request). When publish hooks (`revalidatePath`/`revalidateTag`) exist it can switch to `revalidate = 3600`.
- **Switch-on list when real content goes live:** blog posts (`placeholder: true` flag in `lib/blog.ts` controls noindex and sitemap automatically), `/free-practice` (hard-coded `noindex: true` in its `page.tsx`).

## Teacher credential wording (admin text)
The owner confirmed the correct claim is **"IIT Delhi alumnus"**. "NIT Jalandhar" is on hold until confirmed. Please update in admin: the `description` of all 35 chapters currently says "…by IIT Delhi & NIT Jalandhar alumni". The SEO meta description rewrites that phrase on the fly (`chapterBlurb()` in `src/lib/seo/metadata.ts`); that workaround can be removed once the data is fixed. Also still mentioning NIT Jalandhar in code (visible copy, not changed): `src/lib/legal/about.ts`, and the root-layout description was already replaced.

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
- [ ] Set `APP_URL` in production to the canonical origin (https, chosen host). Canonicals, sitemap, robots and OG all read it.
- [ ] Canonical host redirect (apex ↔ www) on Vercel.
- [ ] `X-Robots-Tag: noindex` for `/admin` (headers in `next.config.ts` or Vercel); security headers.
- [ ] Enable Vercel Speed Insights for the project and check the plan fits.
- [ ] Replace placeholder company address, CIN, GSTIN in the legal/footer data, and the YouTube `#` link.

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
- [ ] Fix the 35 chapter descriptions ("IIT Delhi & NIT Jalandhar alumni" → "IIT Delhi alumnus"), the marquee text, and `src/lib/legal/about.ts`.
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
- Existing entitlements keep their current expiry; only new purchases and renewals use the new values. Decide whether anything needs back-filling.
- Seed copy to update: the FAQ answer in `prisma/seed.ts` (~line 250) says "365 days by default".
- The frontend now shows the length as "3 months / 1 year / 2 years" (`validity()` in `src/lib/format.ts`); it follows whatever is in the database.
