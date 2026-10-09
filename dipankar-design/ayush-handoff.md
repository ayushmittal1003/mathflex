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
