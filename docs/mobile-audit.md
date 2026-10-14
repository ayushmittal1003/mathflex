# Mobile audit (Phase A, no code changed)

Branch `feature/seo`. Production build (`next start`), headless Chrome with mobile emulation and touch, 30 page templates × 360 / 375 / 390 / 412 / 430 / 768 px, once as a guest and once as the seeded student (cart with one chapter). Sampling data is local seed data, so some pages are empty (leaderboard has no XP rows, so its row layout is judged from code).

**Screenshots** are full-page and too large for git (about 87 MB), so they live next to the repo:
`/Users/dipankardatta/Documents/MF/mobile-audit-shots/before/`
- `guest/<page>-<360|390|412>.png` and `student/<page>-<360|390|412>.png`
- `viewport/*.png` are phone-sized above-the-fold crops (2× pixel density) for home, chapters, chapter, leaderboard, login, courses
- `guest-metrics.json` / `student-metrics.json` hold every measurement below, per page and width

Not testable here: real Bunny playback, fullscreen and landscape video (no playable stream locally), a software keyboard, a real notch. These are flagged "unverified" and need a device check in Phase D.

## 1. Headline findings

1. **No page-level horizontal overflow at any width.** `scrollWidth == clientWidth` on all 30 templates × 6 widths. The user-visible "sideways scroll" comes from intentional inner scrollers, mainly the home **compare table** (760px grid inside a 312px box) and several chip/tab rows with no scroll affordance.
2. **`overflow-x-clip` on the layout wrapper** (`(public)/layout.tsx`) can hide a future overflow bug instead of exposing it. Two decorative blocks are already being clipped (see S-rows below).
3. **Hero headings are large but not confident.** Home H1 is `clamp(38px, 6.2vw, 80px)`, so it sits at the 38px floor on every phone width (360–430) and only grows past 613px. Line height is 1.0 (38/38), which is tight for 4-line wraps.
4. **Small text:** the 5 bottom tab bar labels are 11px, and they are the only text under 12px on most pages. Pages with more: home (21: includes "Part 1 of 3" captions), chapters (48), about (14), free practice (10), chapter (12), book-a-call (42). Many more elements sit between 12 and 14px (home 76, chapters 215, course 116): meta text, chips and the footer.
5. **Touch targets:** the header cart and profile icons are 42×42 (under 44), footer links are 20px tall, the breadcrumb links are 20px tall, the top marquee links are 20px tall, the logo link is 27px tall. Chips use the `.tap` utility (44px hit area), but adjacent chips at `gap-2` have overlapping hit areas.
6. **iOS zoom risk:** these inputs are under 16px: coupon (14px), blog search (14px), chapters select (13px) and search (15px), home select (14px), leaderboard search (15px), profile fields (15px). Login and signup are already 16px with correct `type`, `autocomplete` and `inputmode`.
7. **Inconsistent spacing:** section vertical padding is 64 / 86 / 88 / 96px depending on the page; card padding is 16 / 20 / 24 / 26 / 32px; button heights are 36 / 42 / 47 / 49 / 52 / 53px.
8. **Welcome popup** ("Your first chapter, 20% off") opens as a full-screen modal 2.5s after load on the first visit to any page and covers the hero (see `viewport` crops before suppression). It is a sheet already, but it competes with the hero and the bottom bar.
9. **Sticky stack is heavy:** on `/chapters` the sticky filter block is 198px tall under a 67px header (265px, about a third of an 800px screen) while scrolling.

## 2. Findings table

Severity: **H** breaks use or is clearly visible to most students, **M** noticeable or inconsistent, **L** polish. `G` = guest set, `S` = student set. Widths are where the issue was measured (360 unless noted; none behaved differently from 360 to 430 except where stated).

| Page | Issue | Width | Screenshot | Severity | Proposed fix |
|---|---|---|---|---|---|
| All | No page overflow, but the wrapper uses `overflow-x-clip`, which hides future bugs | all | n/a | L | Keep `overflow-x-clip` as a safety net; add a Phase D check that measures element rects, not just `scrollWidth` |
| All | Bottom tab bar labels are 11px (`SiteNav.tsx:267`) | 360–430 | `viewport/home.png` | M | 12px minimum, keep 65px bar, add `pb-[env(safe-area-inset-bottom)]` (already present on the page wrapper) |
| All | Header cart and profile icon buttons are 42×42 | all | `viewport/home.png` | M | `size-11` (44px) |
| All | Header logo link is 27px tall | all | `viewport/home.png` | L | Pad the link to 44px hit area with `.tap` |
| All | Top marquee links are 20px tall; the strip is clipped content by design (9,799px track) | all | `viewport/home.png` | L | Raise to 44px hit area via padding on the link, keep strip height; keep it a CSS-only scroller |
| All | Footer links are 20px tall in a list with small gaps (about 20 links) | all | `guest/home-360.png` | M | `py-3` per link (44px row) in a single-column list; 2-column grid for the shorter groups |
| All | Breadcrumb links ("Home", "Chapters") are 20px tall and 13px text | all | `viewport/chapter.png` | M | Larger tap area (`py-2.5 -my-2.5`) and 14px text; keep markup and JSON-LD as is |
| All | FlexCare chat button (52×48, `fixed right-4`) sits 80px above the bottom bar and overlaps body text on the right edge (see "alumnu" in the home hero) | 360–430 | `viewport/home.png` | M | Keep it, but give long-text pages bottom padding and shrink to a 44px icon-only button on phones; the page content right padding is not changed |
| All | Welcome popup covers the hero 2.5s after first load, on every first-visited page | all | n/a (see doc above) | M | Delay until after the first scroll or the second page view, or show as a small dismissible bar. Needs your call (marketing) |
| Home | H1 is 38px at 360–430, 1.0 line height; the highlighted word box ("maths,") has uneven padding and an orphan line | 360–430 | `viewport/home.png` | H | Hero H1 `clamp(2.5rem, 9.5vw, 5rem)` (about 40px at 360, 44px at 412), line-height 1.1, `text-balance` kept; tidy highlight padding |
| Home | Compare table is a 760px grid inside a 312px box: users must scroll sideways and see only about 40% | 360–430 | `guest/home-360.png` (compare section) | H | Stacked cards on phones, one per plan, label/value rows; keep the `<div role=table>` semantics for desktop |
| Home | A horizontal strip (`div.mt-3.flex`) is 5,318px wide inside a 312px box with no snap and no peek; a second strip is 622px in 300px | 360–430 | `guest/home-360.png` | M | Add scroll-snap and a visible partial next chip; keep the single scroller |
| Home | "Your IIT seat" card fan is 647px wide inside 328px; the right label ("−right-2 whitespace-nowrap", 318–407px) is cut off | 360–430 | `guest/home-360.png` | L | Scale or hide the decorative extras visually (not `display:none` on text content), keep the labelled card in view |
| Home | Hero chip text wraps to 2 lines ("For Class 11 & 12 · JEE Main, Advanced & Boards") | 360 | `viewport/home.png` | L | Shorten on phones through CSS truncation or a shorter wrapping rule; do not change the copy for desktop |
| Chapters | Sticky filter block is 198px tall under the 67px header on scroll | 360–430 | `guest/chapters-360.png` | H | Collapse to one 56px row (search plus a "Filters" bottom sheet) when stuck |
| Chapters | H1 is 44px and wraps to 4 lines ("Find the chapter that's costing you marks") | 360 | `viewport/chapters.png` | M | Page-H1 scale (32px phones) shortens wrap to 2–3 lines |
| Chapters | Class tabs (All / Class 11 / Class 12): `.tap` hit areas overlap | 360–430 | `guest/chapters-360.png` | M | 44px tall segmented control with `gap-2` |
| Chapters | Search select is 13px, search input 15px (under 16px) | 360–430 | `guest/chapters-360.png` | H | 16px on both |
| Chapters | Chapter cards are narrow (about 130px wide with a 2:3 cover) at 360, so titles wrap to several lines | 360 | `guest/chapters-360.png` | M | Single-column list row on 360, two columns from 412 (question 2 below) |
| Chapter | Sticky tab bar (About / Parts / ...) is 55px under a 67px header, then the 65px bottom bar: about 187px of chrome on an 800px screen | 360–430 | `guest/chapter-360.png` | M | Drop the header from sticky on this page, or make the tab bar the only sticky element |
| Chapter | Video preview is a stripe card (no playback locally), aspect ratio looks correct | 360–430 | `viewport/chapter.png` | L | None; verify with real Bunny stream in Phase D |
| Chapter | Meta badges and chips use 11–13px text | 360 | `guest/chapter-360.png` | M | 13px minimum, 12px for the smallest badge only |
| Courses | Course switch (Combo / Class 11 / Class 12) is an `overflow-x-auto` segmented control; the second option is cut off with no peek hint | 360–430 | `viewport/courses.png` | M | Equal-width 3-way control with shorter labels ("Combo", "Class 11", "Class 12") that fit 312px |
| Courses | Chapter-count slider (`input range`, 24px tall) is under 44px | 360–430 | `guest/courses-360.png` | M | 44px touch row; keep native input |
| Courses | Card padding 16px vs 32px on the course cards | 360 | `guest/courses-360.png` | M | One card padding (16px phones, 24px from `tablet`) |
| Course detail | Same slider and section spacing issues; H1 42px / H2 28px | 360 | `guest/course-360.png` | M | Mobile type scale |
| Pricing | Four tier cards stack correctly; chapter picker rows are 64px, price column fine | 360–430 | `guest/pricing-360.png` | L | None needed; keep |
| Pricing | The dark "Your selection" summary sits at the end of a long chapter list and is not sticky, so the total is off-screen while choosing | 360–430 | `guest/pricing-360.png` | M | Sticky summary bar above the bottom nav when at least one chapter is picked |
| Pricing | Section padding 64/88/96px across sections | 360 | `guest/pricing-360.png` | M | One section padding value |
| Plans (login-gated) | Redirects guests to `/login`; as student: 14 text elements at 12–14px and several small links (exact list in `student-metrics.json`) | 360 | `student/plans-360.png` | M | 44px row links, 14px text |
| Leaderboard | Local data has no XP, so rows could not be rendered. Code: podium row `w-[min(760px,100%)]` with `size-16` avatars and `gap-3`; sticky filter block is 117px tall; "your rank" bar sticky at `bottom-[calc(80px+safe-area)]` | 360 | `viewport/leaderboard.png` | M | Verify with seeded XP (Phase D); compact rows (rank, avatar, name, XP; secondary stats under the name) |
| Leaderboard | Search input is 15px and filter pill buttons overlap `.tap` areas | 360 | `viewport/leaderboard.png` | M | 16px input, 44px pills |
| Blog | Search input is 14px; category chips (761px row) have no snap or peek | 360–430 | `guest/blog-360.png` | M | 16px input; snap plus peek on the chip row |
| Blog post | H1 36px, body 19px; code or formula blocks not present in sample posts | 360 | `guest/blog-post-360.png` | L | Add a `max-w-full overflow-x-auto` rule for `pre` and KaTeX blocks now so real posts cannot widen the page |
| About | Timeline strip is 1,604px wide and snaps (good) but shows no peek | 360 | `guest/about-360.png` | L | Add edge peek (padding-right 16% plus `scroll-padding`) |
| Contact | Cards use 20px and 24px padding | 360 | `guest/contact-360.png` | L | Match shared card padding |
| FAQ | Category chips (1,096px row) no snap; search is 17px (OK) | 360–430 | `guest/faq-360.png` | M | Snap plus peek |
| Book a call | 42 text elements under 12px at 360 (time-slot grid, 10–11px mono labels) and 30 more between 12 and 14px | 360 | `guest/book-a-call-360.png` | H | 13px minimum slot labels; 44px slots on a 3-column grid |
| Legal (privacy / terms / refund) | Page switch links ("Terms", "Privacy", "Refunds") are 36px tall; the privacy page is 16,167px long with no way to jump; H1 40 / H2 22 are fine | 360 | `guest/privacy-360.png` | L | 44px switch links; a contents sheet only if you ask for it |
| Free practice | 30 crowded target pairs: option number buttons (`size-9`, 36px) and difficulty chips adjacent at under 8px | 360–430 | `guest/free-practice-360.png` | H | 44px option buttons with 8px gap |
| Login / Signup | Inputs 16px with correct types, autocomplete and numeric phone; layout OK | 360–430 | `viewport/login.png` | L | None; "Back to home" link (20px) and logo (27px) get the 44px hit area. "Continue with Google (coming soon)" row is dashed and 44px: fine |
| Login / Signup | Radio chips for class level use `sr-only` inputs (1×1) | 360 | `guest/signup-360.png` | L | Fine (the label is the target); verify label is at least 44px tall |
| My learning (S) | Continue card links are 23–42px tall (`Practice` 90×42, `All chapters →` 100×20) | 360 | `student/my-learning-360.png` | M | 44px buttons; text links get padding |
| Profile (S) | Name, phone and class inputs are 15px (iOS zoom) | 360 | `student/profile-360.png` | H | 16px |
| Practice list (S) | 14-row table (213px wide) with no overflow; headings fine | 360 | `student/practice-360.png` | L | Verify the row layout when real data exists |
| Practice chapter (S) | 88 of 98 targets are under 44px and 19 pairs are crowded (question number buttons `size-9`, difficulty tabs) | 360 | `student/practice-chapter-360.png` | H | 44px number buttons, horizontal scroller with snap, 8px gaps |
| Learn / player (S) | Header 121px tall sticky (logo, user, nav tabs) leaves a 185px video on 360×800; H1 24px; tabs 34px tall (`My Learning`, `Browse chapters`, `Leaderboard`) | 360 | `student/learn-360.png` | H | Compact sticky header (56px) that collapses on scroll; 44px tabs; video full-bleed at 16:9 and sticky while scrolling the parts list. Landscape and fullscreen are **unverified** |
| Cart (S) | Coupon input 14px with 42px height; Apply 68×42; Remove 47×16; "+ Add" 64×34 | 360 | `student/checkout-360.png` | H | 16px input, 44px Apply and Add, 44px Remove with padding |
| Checkout (S, `/cart` redirects here) | Fixed bottom pay bar (75px tall) plus page `pb-112px` is correct; FlexCare button sits at `bottom-16` and can overlap the bar's right side | 360 | `student/checkout-360.png` | M | Hide the chat button on `/checkout` and `/cart` |
| Payment status (S) | Fine; links "My Learning →" and "Refund policy" 20–31px tall | 360 | `student/payment-status-360.png` | L | 44px link hit areas |
| 404 | Footer-style link list, 20px rows | 360 | `guest/404-360.png` | L | Same fix as footer |
| All | Perf (local, uncached): heaviest is home at 428KB transferred for the first load, 43 requests; CLS 0.00 on every page; 20 running animations on pricing, 12 on courses/about | 360 | n/a | L | Out of scope for layout work; recheck with Lighthouse in Phase D |

Notes on measurement: a target counts as small when its effective size (visual size, or 44px when it has the `.tap` utility) is under 44 on either side. Marquee clones and `sr-only` elements are excluded from the counts.

## 3. Proposal: Phase B (mobile design rules), adjusted to what I found

These are the rules I will add to `design.md` under "Mobile" after your approval. Nothing is edited yet.

**Type scale (clamp, tokens in `globals.css`)**

| Role | Phone (360) | Scales to | Line height |
|---|---|---|---|
| Hero H1 (home, chapters, courses, pricing hero) | 40px | current desktop size (80px) via `clamp(2.5rem, 9.5vw, 5rem)` | 1.1, `text-balance` |
| Page H1 (non-hero) | 32px | 56px via `clamp(2rem, 7vw, 3.5rem)` | 1.1 |
| H2 | 26px | 40px | 1.2 |
| H3 | 20px | 24px | 1.3 |
| Body | 16px (never smaller) | 17px | 1.55 |
| Small / meta | 14px | 14px | 1.4 |
| Micro (badges only) | 12px | 12px | n/a |

Today's floors: H1 is 38 (home), 44, 42, 36, 30; H2 is 20–40; meta text goes down to 10–11px. The new scale replaces ten separate one-off sizes.

**Spacing:** side gutter 16px (a token), section padding 48px vertical on phones and 64–96px from `tablet`, one card padding (16px phones, 24px from `tablet`), gap scale 8 / 12 / 16 / 24.

**Buttons and targets:** 48px minimum height for primary buttons, 44px for secondary; full-width primary on phones in forms, cards and CTA bands; radius 8px (matches today); weight 700. Every interactive element at least 44×44 with at least 8px between neighbours (including the `.tap` overlay).

**Tables and wide content (decision per table)**

| Table | Choice on phones | Why |
|---|---|---|
| Home compare table | Stacked cards, one per plan, label/value rows | 5 columns do not fit 312px; pinned first column would show 1–2 values at a time and hide the comparison |
| Pricing | Already cards; add a sticky selection bar | Nothing to convert |
| Leaderboard | Compact row: rank, avatar, name (secondary stats under it), XP; podium scaled down to fit | Fits 360 with no sideways scroll |
| Stat rows | 2-column grid | Wrap, do not scroll |
| Practice list | Stay as rows | Fits already |

**Horizontal scrolling** only for chip rows and the about timeline, always with `scroll-snap`, visible partial next item and `scroll-padding`; never at page level. Formula and code blocks scroll inside their own box (`max-w-full overflow-x-auto`).

**Bottom bar:** keep 65px bar; every page wrapper pads for it plus `env(safe-area-inset-bottom)` (already true on public pages; to verify on learn and checkout); FlexCare button hidden on checkout and shrunk elsewhere.

**Modals and menus:** bottom sheets with a visible 44px close button, Escape and swipe-down to close, focus trap (the app already has `useFocusTrap`); applies to the welcome popup, filters (new) and the More menu.

**Forms:** every input and select 16px and 48px tall; `type`, `inputmode`, `autocomplete` set as in login; sticky submit above the keyboard on long forms; coupon and search fields included.

## 4. Questions for you

1. **Welcome popup:** keep as is, delay it (my suggestion: after the first scroll or the second page view), or turn it into a small bar? It affects marketing, so I will not change it without your answer.
2. **Chapters grid on 360:** keep two columns (130px cards) or a single-column list? I lean to one column with a thumbnail row; it is closer to how Indian students scan lists on small phones.
3. **Sticky pricing summary** and the collapsing learn header are new behaviours rather than restyles. OK to include?

I have not edited any source file. Waiting for approval of Phase B (with your answers to the three questions) before starting Phase C.
