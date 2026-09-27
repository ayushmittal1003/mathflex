# MathFlex

Netflix-style JEE & Board maths platform: buy single chapters, unlock parts as you
learn, earn XP, and get help from the FlexCare chatbot. Everything a student sees
(prices, chapters, videos, notes, banners, coupons, feature switches) is controlled
from the **/admin** panel. Nothing needs a code change or a redeploy.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma 7 ·
Paytm JS Checkout · Bunny Stream (video) · Claude (FlexCare chatbot).

---

## Run it locally

```bash
npm install
npm run db:start      # local Postgres on :51214 (no Docker needed)
npm run db:migrate    # create tables
npm run db:seed       # all 35 chapters, 3 courses, sample questions, coupons, banners
npm run dev           # http://localhost:3000
```

| Login | Email | Password |
|---|---|---|
| Admin | `admin@mathflex.in` | `admin12345` |
| Demo student | `student@mathflex.in` | `student12345` |

**Change both passwords before going live.** The seed also creates 12 demo students
(`*@demo.mathflex.in`) so the leaderboard isn't empty. Block or delete them in
Admin → Students when real students arrive.

Payments run in **test mode** until Paytm keys are added. The checkout shows a fake
"Simulate payment" screen, so you can try the whole purchase flow.

---

## What's where

```
src/app/(site)/          Student app: home, browse, chapter, learn, cart, my-learning, leaderboard, profile
src/app/admin/           Admin panel (ERP) + admin server actions (actions.ts)
src/app/api/chat         FlexCare chatbot (streams answers from Claude)
src/app/api/payments     Paytm callback (verifies checksum + re-confirms with Paytm)
src/app/api/files        Serves PDFs/mind maps, only to students who own the chapter
src/lib/                 Business logic: pricing, orders, gamification, video, paytm, flexcare, settings
prisma/schema.prisma     Data model
public/brand/            Logo files (SVG)
```

### The admin panel (`/admin`)

| Screen | What you control |
|---|---|
| **Chapters & content** | Price, MRP, validity, JEE weightage, most-asked topics, poster, intro video · **Parts** (upload video, duration, free preview, XP) · **DPPs & PYQs** (one by one or bulk-paste from Google Sheets) · **Notes & mind maps** (PDF/image upload) |
| **Courses** | Class 11 / Class 12 / combo bundles, i.e. any set of chapters at one price |
| **Coupons** | % or flat, max discount, minimum order, usage limits, start/end time |
| **Banners & popups** | Home hero, running ticker, first-visit popup, offer cards, with scheduling |
| **Orders** | All payments; mark offline payments paid, refund (removes access), re-check Paytm |
| **Students** | Search, see progress, grant free access, extend validity, block, make admin |
| **Mentorship calls** | ₹300 calls bought at checkout: schedule, add meet link, notes |
| **FlexCare chatbot** | FAQ/policies it answers from, which notes it has read, what students ask |
| **Settings & features** | On/off switches for every feature, mentorship price, GST, XP rules, contacts, payment mode |

### How the learning loop works

1. Student buys a chapter, sees the 30-sec intro video once, then Part 1.
2. The player counts time **actually watched** (skipping ahead doesn't count). At 90% (configurable per part) the Part's practice set unlocks.
3. Practice = DPPs + PYQs for that part's topics only. Instant feedback, solutions, bookmarks, XP for first correct answers.
4. Video + practice done: the next part unlocks, with confetti, a sound and badges. Last part: a "Chapter Completed" badge plus a recommended next chapter.

XP feeds daily streaks, levels, badges, the leaderboard (weekly / monthly / all-time) and
the daily / weekly / monthly charts in My Learning.

---

## Video hosting: recommendation

**Use Bunny Stream.** Don't use YouTube for paid lectures.

- **YouTube "private"** videos can't be embedded at all. Only **unlisted** works, and anyone with the link can watch and share it. Watch time can't be tracked reliably (which the part-unlock system needs), YouTube branding pulls students off-site, and charging for access to YouTube-hosted videos may conflict with YouTube's terms.
- **Bunny Stream** is pay-as-you-go (cents per GB). It gives signed links that expire, adaptive streaming for 4G phones, and uploads straight from the admin panel. Setup takes about 10 minutes; the steps are in Admin → Video hosting.
- **VdoCipher** is the upgrade path if piracy becomes a real problem (DRM + watermark with the student's phone number). It's more expensive.
- **Raw AWS** (S3 + CloudFront + MediaConvert) only makes sense with a DevOps person.

Each part stores its own provider, so you can start with anything and switch video by video.

---

## Going live checklist

1. **Database:** create a managed Postgres (Neon, Supabase, RDS…). Set `DATABASE_URL`, then run `npm run db:deploy && npm run db:seed`.
2. **Secrets:** set a long random `AUTH_SECRET` and `APP_URL=https://mathflex.in`.
3. **Paytm:** set `PAYTM_MID`, `PAYTM_MERCHANT_KEY`, `PAYTM_WEBSITE`, `PAYTM_ENV=production`. Test on staging first, then choose **Live Paytm** in Admin → Settings. If Paytm gives you a different gateway domain, set `PAYTM_HOST`.
4. **Bunny Stream:** `BUNNY_LIBRARY_ID`, `BUNNY_API_KEY`, `BUNNY_TOKEN_KEY` (turn on token auth + allowed domain in Bunny).
5. **FlexCare:** `ANTHROPIC_API_KEY`. Without it the bot runs in FAQ-only mode, and uploaded PDFs aren't read automatically.
6. **File storage:** PDFs and posters are saved to `./storage` on the server. That's fine on a VPS (Railway, Render, EC2). On Vercel/serverless the disk isn't persistent, so swap `src/lib/storage.ts` for S3 / Cloudflare R2 / Bunny Storage (two functions).
7. Change the seeded admin password, and edit the seeded FAQ answers so they match your real policies.

The test-mode payment screen is automatically disabled in production (`NODE_ENV=production`)
unless you set `ALLOW_MOCK_PAYMENTS=1`.

---

## Useful commands

```bash
npm run db:studio   # browse the database in a GUI
npm run typecheck
npm run lint
npm run build
```
