# MathFlex design system (v2, marketing website)

This version adds the visual language of the new student-facing website (home, chapters, courses, pricing, leaderboard, checkout, blog and the rest) on top of v1. The tokens, component classes and rules from v1 still apply. Tokens live in `src/app/globals.css` (Tailwind v4, `@theme inline`) and fonts load in `src/app/layout.tsx`.

Reference designs: the `.dc.html` files in this project. `Landing Page v2.dc.html` is the source of truth for the home page; every other page reuses its parts.

---

## 0. What changed from v1

| Area | v1 | v2 (website) |
|---|---|---|
| Default theme | Dark | **Light** on all website pages. The dashboard and admin can stay dark-default. |
| Page background | `background` (0.985) | `card` white `oklch(0.995 0 0)` full-bleed. Sections flow into each other with no card or panel wrappers. |
| Hero | none | **Framed wash** (section 3.1), used only for heroes |
| Navigation | sidebar | **Dark segmented nav** (section 3.2) |
| Headings | `font-display font-extrabold` | Same, plus a much larger display scale and the **highlight box** (section 3.3) |
| Product UI on marketing pages | none | **Dark-framed screens** that peek out of the hero (section 3.4) |
| New tokens | none | `wash` (hero base). Everything else uses existing tokens. |

### v2.1 updates (October 2026, from the build)
- **No section divider lines.** Sections are separated by spacing only (section 3.7).
- **Phones get an app-style bottom bar**; tablets get the hamburger; desktop keeps the segmented nav (sections 3.2 and 6).
- **Signed-in nav:** My Learning and Practice replace Pricing, plus a streak/XP chip and an account menu (section 3.2).
- **Closing call to action** sits in a soft wash card before the footer on every page (section 3.9).
- **Footer:** no registered address or phone number for now (section 3.8).
- **Tap targets:** a `tap` utility grows small controls to a 44px hit area (section 6).
- **Loading and error states** (section 6).

---

## 1. Colour (unchanged tokens, website usage)

| Token | Value (light) | Website use |
|---|---|---|
| `foreground` | `oklch(0.145 0 0)` | Headings, body, dark nav, dark frames, dark buttons, dark toasts |
| `card` | `oklch(0.995 0 0)` | Page background, highlight box, form fields |
| `secondary-foreground` | `oklch(0.269 0 0)` | Body copy on wash and white |
| `muted` | `oklch(0.968 0.007 247.896)` | Eyebrow pills, chips, empty bars, icon buttons |
| `muted-foreground` | `oklch(0.554 0.046 257.417)` | Meta text, captions, outlined rank numbers |
| `border` | `oklch(0.929 0.013 255.508)` | Hairlines between sections, rows, cards |
| `primary` | `oklch(0.637 0.237 25.331)` | Main CTA (Start free, Buy now, Pay), live dots, caret, active tab underline |
| `brand-2` | `oklch(0.705 0.213 47.604)` | Second gradient stop, highlight tint |
| `ok` | `oklch(0.627 0.194 149.214)` | Free, discounts, "Added", success, checkmarks |
| `gold` | `oklch(0.795 0.184 86.047)` | Top-3 ranks, "highest weightage" eyebrow dot |
| `xp` | `oklch(0.606 0.25 292.717)` | XP numbers on the leaderboard |
| `bad` | = `destructive` | Failed payment, rank drop arrows |

**New token: `wash`.** `--wash: oklch(0.975 0.012 50)`. This is the warm base of the hero frame. Add it to `globals.css` and `@theme` with a dark value of `oklch(0.2 0.02 40)`.

**Tints:** use `color-mix(in oklab, var(--brand-2) 16%, var(--card))` for the soft highlight box on white sections, and `color-mix(in oklab, var(--primary) 6%, var(--card))` for the selected-row tint (your own leaderboard row, chosen option).

**Poster gradients** come from the database (allowed exception). The current eight pairs are:
`#FF2E63→#FF8A3D`, `#6366F1→#EC4899`, `#10B981→#0EA5E9`, `#F59E0B→#DC2626`, `#7C3AED→#FF2E63`, `#0EA5E9→#6366F1`, `#EC4899→#F59E0B`, `#1a0610→#FF2E63`. Always draw them at 155deg.

---

## 2. Typography

Inter for everything, JetBrains Mono for codes, IDs, timestamps and file-name placeholders.

| Role | Size | Weight | Tracking | Line height |
|---|---|---|---|---|
| Hero H1 | `clamp(44px, 7vw, 96px)` | 800 | −0.045em | 1 |
| Section H2 | `clamp(38px, 5.4vw, 72px)` | 800 | −0.045em | 1.02 |
| Split-section H2 (left column) | `clamp(34px, 4.2vw, 54px)` | 800 | −0.045em | 1.04 |
| Block H2 (inside pages) | `clamp(26px, 3vw, 38px)` | 800 | −0.035em | 1.2 |
| Card title | 17–22px | 700–800 | −0.02em | 1.3 |
| Lead paragraph | 17px | 400 | 0 | 1.55, `max-width: 560px` |
| Article body | 18px | 400 | 0 | 1.75, `max-width: 720px` |
| Meta / caption | 12–14px | 600 | 0 | 1.4 |
| Eyebrow pill | 13px | 600 | 0 | n/a |
| Uppercase label | 11–12px | 700–800 | +0.06 to 0.12em | n/a |
| Big outlined number | 120–180px | 900 | −0.06em | 0.78, `-webkit-text-stroke: 2–3px var(--muted-foreground)`, transparent fill |

Use `text-wrap: balance` on headings and `text-wrap: pretty` on paragraphs.

---

## 3. Signature patterns

### 3.1 Framed wash (heroes only)
- Wrapper: `padding: 16px 16px 0` around the hero `<section>`. The section has `border-radius: 12px; overflow: hidden`.
- Background (top to bottom of the stack):
  1. `radial-gradient(70% 55% at 50% 0%, color-mix(in oklab, var(--brand-2) 30%, transparent), transparent 70%)`
  2. `radial-gradient(50% 50% at 100% 100%, color-mix(in oklab, var(--primary) 26%, transparent), transparent 70%)`
  3. `radial-gradient(40% 40% at 0% 80%, color-mix(in oklab, var(--brand-2) 18%, transparent), transparent 70%)`
  4. `var(--wash)`
- Content is centred: eyebrow pill, H1, lead paragraph, then CTAs or a search box.
- **Only heroes get the wash.** Exceptions: the footer's large wordmark and the brand panel on Login. Leaderboard and Blog use a plain white header.

### 3.2 Navigation
- Row: logo left, segmented nav centre, actions right. `padding: 22px 32px`, content `max-width: 1240px`, centred.
- **Segmented nav:** `bg-foreground`, `rounded-lg`, `padding: 4px`, `gap: 2px`. Items are 13px/600 at `rgba(255,255,255,.75)`. The active item is a `bg-card` chip, 6px radius, 700 weight, `foreground` text.
- Items (signed out): Home · Chapters · Courses · Pricing · Leaderboard.
- Items (signed in): Home · Chapters · Courses · My Learning · Practice · Leaderboard. Pricing moves into the menus.
- Actions: cart icon button (42×42, 8px radius, count badge in `primary`), `Log in` (secondary), `Start free` (primary). Both buttons are `white-space: nowrap`.
- On a wash the secondary buttons are `rgba(255,255,255,.7)` with a `rgba(255,255,255,.95)` border. On white they are `bg-card` with a `border-border` border.
- **Signed in:** the auth buttons are replaced by a streak/XP chip (≥ 1280px) and a round avatar. The avatar opens the **account menu**: a soft wash card with name, email, the plan line ("2 active plans · next expiry …") and streak/XP, then site links, My Learning · Profile · Plan validity & renewal · Refer & Earn (when switched on), WhatsApp support, the support email, Admin panel (staff only) and Log out.
- **Tablet, 760–1023px:** the segmented nav and the auth buttons hide, and a 42×42 dark hamburger opens a dark drop-down panel (12px radius, 16px links). Signed out it ends with Log in and Start free side by side; signed in it ends with the account menu.
- **Phone, under 760px: bottom bar, no hamburger.** The top row keeps only the logo, the cart and the avatar (or Log in). A fixed bottom bar, 64px plus the safe-area inset, white at 94% with a blur and a hairline on top, holds five equal tabs: icon (22px) over an 11px/700 label, `muted-foreground` when idle and `primary` with a 3px top marker when active.
  - Signed out: Home · Chapters · Courses · Practice (free practice) · More.
  - Signed in: Home · Chapters · Learning · Practice · More.
  - **More** opens a bottom sheet (rounded top, drag handle, dimmed backdrop) with the account menu (or Log in / Start free), the cart, then two-column tiles for every other page.
  - Pages add bottom padding for the bar, and anything floating (FlexCare, toasts, sticky rank bars) sits above it. Focus pages (log in, checkout, player) have no bar.

### 3.3 Highlight box
- One key word in every H1 and H2 sits in a box: `display: inline-block; padding: 0 12–14px 4–6px`.
- In heroes the box is `bg-card` with `box-shadow: 0 10px 30px -12px rgba(120,40,0,.25)`.
- In white sections the box is the soft `brand-2` tint (section 1) with the same shadow.
- Hero H1s also get a blinking caret after the word: 4px wide, `0.82em` tall, `bg-primary`, `steps(1)` blink at 1s.

### 3.4 Dark-framed product UI
- Any screenshot-like UI on a marketing page (dashboard, chapter player, video, calendar) sits in a frame: `border: 6px solid var(--foreground)`, `rounded-xl`, `bg-foreground`, `box-shadow: 0 40px 80px -30px rgba(80,20,0,.5)`.
- In heroes the frame **peeks out**: a negative bottom margin (`-60px` to `-150px`) lets it overlap into the next white section.
- Video placeholders use diagonal stripes (`repeating-linear-gradient(135deg, …)`), a white 72–96px play button with a translucent halo ring, and a mono file-name label.

### 3.5 Eyebrow pill
`inline-flex; gap: 8px; padding: 6px 12px; rounded-full; bg-muted; 1px border-border; 13px/600`, with a 6px coloured dot in front (`primary`, `brand-2`, `gold` or `ok`). On the wash it is `rgba(255,255,255,.7)` with a white border.

### 3.6 Sticky filter bar
`position: sticky; top: 0`, `card` at 90% with `backdrop-filter: blur(16px)`, and hairlines top and bottom. Contents wrap onto a second line rather than scrolling. It holds a search field, a dark segmented control (class or time period), outline chips or a select for sort, toggles, and a muted result count pushed to the right.

### 3.7 Section rhythm
- Sections: `padding: 88–96px 0`. **No divider lines between sections**: spacing alone separates them. No cards around sections.
- Content widths: 1240px for listings, 1120–1180px for detail pages, 820–1000px for text, legal pages and forms.
- Section headers: eyebrow, then H2 with highlight box, then lead, all centred. Split sections put the H2 on the left and content on the right, with `flex-wrap` and `gap: 40px 64px`.
- List blocks: a 2px `foreground` rule under the block heading, then 1px `border-border` between rows.

### 3.8 Footer
White, full-bleed, no top border.
- **Columns:** brand (logo, one-line description, social icons) · Learn (chapters, courses, pricing, leaderboard, book a 1:1 call) · Company (About us, Contact us, FAQs) · Resources (Blog, Free practice) · Support (email, WhatsApp, hours). The registered address and phone are left out until they're final; the support number lives on the Contact page.
- **Bottom row:** © 2026 Mathflex, then Terms & conditions · Privacy policy · Refund policy. The policies appear only here.
- **Wordmark:** a giant "mathflex", `clamp(90px, 21vw, 300px)`, weight 900, −0.06em, `white-space: nowrap`. It is filled with a vertical gradient from `muted` to the `brand-2` tint and bleeds off the bottom edge.

### 3.9 Closing call to action
The last section before the footer is a centred H2 (with highlight box), a short lead and one or two buttons, wrapped in a `rounded-2xl` card on the wash (`bg-wash`), max 1240px wide, with a soft warm shadow. This is the one allowed exception to "no wash on body sections".

---

## 4. Components

| Component | Spec |
|---|---|
| **Chapter card (listing)** | `card`, 12px radius. A 16:9 poster gradient with a large faded maths symbol (`rgba(255,255,255,.2)`) and a white "Part 1 free" chip. Body: meta (Class · topic), title clamped to 2 lines, parts and JEE %, then the price, struck-through MRP and "50% off" in `ok`. A round "+" add-to-cart button (34px) sits top-right of the poster and turns `ok` with a check when added. Hover: lift by 4px and add a warm shadow. |
| **Top-5 poster** | A 2:3 poster, 170px wide, with a big outlined rank number to its left overlapping by −26px. The row scrolls sideways only (`overflow-y: hidden`, `overscroll-behavior-x: contain`). |
| **Course card** | `card` with a 28px pad. Name, sub-line, 48px price, struck MRP, `ok` "% OFF" badge, per-chapter maths, checklist, then Buy and "See all chapters" buttons. The best-value card is dark (`foreground` background) with a red "Best value" tab and is lifted 14px. |
| **Chapter tile (inside lists)** | A 48px poster square with the symbol, title clamped to 2 lines, and a meta line. 76px minimum height, 12px radius, 1px border. |
| **Stats strip** | A white bar overlapping the hero by −64px, with columns split by 1px borders and a 20px/800 number over a 13px muted label. |
| **FAQ row** | A full-width button at 16–17px/700 with a 26–28px round "+" that turns `primary` and rotates 45° when open. The answer expands with a `grid-template-rows: 0fr → 1fr` transition. |
| **Toast** | Fixed at bottom centre, `foreground` background, 12px radius, white 14px/600 text, with an optional primary action ("View cart · n"). It auto-hides after 2.6s. |
| **Leaderboard row** | 64px tall: rank (top 3 in `gold`), an ▲/▼ movement indicator (`ok`/`bad`), 38px avatar, name and city, class, streak, and XP in `xp`. Rows reorder by animating `top` over 0.7s. Your own row has the primary tint, and a sticky dark "you" bar sits at the bottom. |
| **Blog card** | A 16:10 cover, 12px radius, with a category chip, and the date and read time on the thumbnail. Then an 18px/800 title and a 2-line excerpt. Three per row on desktop. The listing leads with the latest post as a white banner, then groups older posts by category. |
| **Buttons** | Primary: `bg-primary`, white, 8px radius, 700 weight, `padding: 12–14px 18–24px`, `box-shadow: 0 10px 24px -10px primary/80%`. Dark: `bg-foreground`, white. Secondary: `bg-secondary` (0.97) with a 1px border and `secondary-foreground` text. |

---

## 5. Motion

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` for everything.
- Entrance: `mfrise`, a 10–14px rise with a fade over 0.45–0.5s, staggered by 30–80ms.
- Hover: cards lift 3–6px, list rows indent by `padding-left`, and icon buttons scale to 1.06–1.08.
- Live elements: a pulsing red "live" dot, the blinking caret, the leaderboard reorder and XP "+n" flashes.
- No scroll-jacking. Sticky elements are limited to the filter bars, the purchase box, the article contents list and the leaderboard "you" bar.

---

## 6. Responsive

| Width | Behaviour |
|---|---|
| ≥ 1024px | Full segmented nav and the auth buttons (or avatar) |
| 760–1023px | Hamburger menu, no bottom bar |
| < 1000px | Sticky side columns (contents list, purchase box) drop into the page flow |
| < 760px | **Phone bottom bar** (section 3.2), no hamburger. Single-column cards, two-column footer grid, smaller podium and posters, hero frames show the video only. Wide product mock-ups that would need sideways scrolling are hidden (their feature list stays), and scroll-driven sticky demos become a plain stack. |

- Read the width with `ResizeObserver`, and also re-check it after load at 300 and 1000ms. Never trust the first `innerWidth`.
- Text never sits in fixed-height boxes. Use `minmax(0, 1fr)` grid tracks and `flex-wrap` with `gap`.
- Tap targets are at least 44px on mobile. For chips and icon buttons that look smaller, add the `tap` utility (with `relative` unless the element is already positioned): it grows the hit area to 44px without changing the look.
- No page may scroll sideways at 390, 768 or 1024px; only tables, chip rows and code blocks scroll inside their own container.

### States
- **Loading:** skeletons in the page's own shape (`components/site/web/Skeletons.tsx`). Only on signed-in pages, the chapters listing and the player. Never on public detail pages, because a `loading.tsx` makes missing pages and redirects return 200 instead of 404/307.
- **Errors:** every site layout has an `error.tsx` showing "Something went wrong" with Try again (`retry`) and Go home, plus the error reference. No internals are shown.
- **Empty states:** a dashed `muted` box with one line of copy and one action. Never leave a blank area.

---

## 7. Page map (reference designs)

| Route | File |
|---|---|
| `/` | Landing Page v2.dc.html |
| `/chapters` | Chapters.dc.html |
| `/chapter/[slug]` | Chapter Detail.dc.html |
| `/courses` | Courses.dc.html |
| `/pricing` | Pricing.dc.html |
| `/leaderboard` | Leaderboard.dc.html |
| `/book-a-call` | Book a Call.dc.html |
| `/checkout` | Checkout.dc.html |
| `/payment/[status]` | Payment Status.dc.html |
| `/thank-you` | Thank You.dc.html |
| `/invoice/[id]` | Invoice.dc.html |
| `/learn/[chapter]` | Chapter Player.dc.html |
| `/login`, `/signup` | Login.dc.html |
| `/about` | About.dc.html |
| `/contact` | Contact.dc.html |
| `/faq` | FAQ.dc.html |
| `/blog`, `/blog/[slug]` | Blog.dc.html, Blog Article.dc.html |
| `/terms`, `/privacy`, `/refunds` | Terms.dc.html, Privacy Policy.dc.html, Refund Policy.dc.html |

`Hero Explorations.dc.html` and `Landing Page.dc.html` are earlier explorations. Don't build from them.

---

## 8. Rules (in addition to v1)

**Do**
- Give every website page the same nav, footer and section rhythm.
- Use the framed wash for heroes only.
- Put one highlighted word in each H1 and H2.
- Show product UI inside dark frames.
- Keep the copy direct: bold headlines and friendly body text. Use ₹ prices with the Indian number format (`toLocaleString("en-IN")`).

**Don't**
- Don't wrap sections in cards or panels. Only real components (product cards, forms, the purchase box) are boxed.
- Don't use the wash on body sections, and don't use gradient backgrounds anywhere else.
- Don't use photos of Karan; use his intro video.
- Don't use emoji or icon-heavy feature grids.

**Placeholders still to replace:** Karan's intro and story videos (and his photo for the Book a call card), per-chapter preview videos (uploaded in admin), college counts, student reviews, the registered address, CIN and GSTIN, the YouTube link, blog content and covers (Sanity), the free-practice question bank, and real per-part durations.
