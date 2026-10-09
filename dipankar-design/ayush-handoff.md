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
