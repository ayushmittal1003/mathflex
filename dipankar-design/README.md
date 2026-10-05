# Handoff: Mathflex student website (MVP)

## Overview
This is the full student-facing website for Mathflex, a chapter-wise JEE maths video platform for Class 11 and 12 taught by Karan Mittal (IIT Delhi). It covers the full journey: home → browse chapters → chapter detail with a free preview → courses and pricing → cart and checkout (sign in before paying) → Razorpay payment status → thank you and invoice → the unlocked chapter player. It also includes the leaderboard, 1:1 call booking, login and signup, about, contact, FAQ, blog and the legal pages.

## Scope guardrails (read first)
- **Restyle and extend only the student website.** Do not change the admin panel's look or behaviour. `globals.css` and `app/layout.tsx` are shared with `/admin`. If a token change is needed, add a new token rather than changing an existing value, and check an admin page afterwards.
- **Keep existing logic.** Auth, cart, payments, DB queries, API routes and permissions (`isStaff`, etc.) stay as they are. Wire the new UI onto them; don't rewrite them.
- **Work page by page.** Build one route, check it at 1440px, 1024px, 760px and 390px, and commit. Then move to the next. Use the order in `MVP tracker.md`.
- **Don't invent design.** If something isn't in these files or in `design.md`, ask rather than improvise.
- **Placeholders stay placeholders.** Videos, college counts, reviews, addresses, CIN and blog copy are marked as placeholders. Load them from data or config; don't hard-code made-up numbers as final.

## About the design files
The files in `designs/` are **design references built in HTML**. They are prototypes that show the intended look, copy and behaviour; they are not production code to copy. Recreate them in the existing Next.js app (`mathflex/`, Tailwind v4, tokens in `src/app/globals.css`) using its components (`card`, `btn`, `btn-primary`, `btn-ghost`, `input`) and patterns.

To view a design, serve the `designs/` folder (e.g. `npx serve designs`) and open any `.dc.html` file in a browser. `support.js` is a small runtime that makes them render. The markup is in each file's `<x-dc>` block and the sample data and behaviour are in its `<script data-dc-script>` class.

## Fidelity
**High fidelity.** The colours, type, spacing, radii, shadows, copy and interactions are final. Recreate them pixel-accurately using design tokens, not hard-coded values. Every inline `oklch(...)` in the HTML maps to a token listed in `design.md` §1.

## Design system
`design.md` (v2) is the single source of truth. It covers the tokens, the type scale, the signature patterns (framed wash hero, dark segmented nav, highlight box, dark-framed product UI, eyebrow pill, sticky filter bar, footer), components, motion, responsive rules and the route map. Read it fully before you start.

Key decisions:
- **Light theme by default** on the website, with a white `oklch(0.995 0 0)` page background. Sections are full-bleed and flow into each other, separated by 1px hairlines, with no card wrappers.
- **Only heroes** get the framed warm gradient (the "wash").
- Inter for all text. Headings are 800 weight with −0.045em tracking. JetBrains Mono is for codes and IDs.
- 8px radius for buttons and inputs, 12px for cards and frames.
- One easing everywhere: `cubic-bezier(0.22, 1, 0.36, 1)`.

## Screens
| Route | Design file | Purpose / notes |
|---|---|---|
| `/` | Landing Page v2.dc.html | Home. Hero with a dashboard peek, college carousel, problem → solution, "every chapter includes", free previews, instructor (video only), comparison, pricing, reviews, FAQ and footer. |
| `/chapters` | Chapters.dc.html | Hero with search, a "Most marks for your time" top-5 row that scrolls sideways only, a sticky filter bar (search, class, sort, Part 1 free), topic tabs and a grid of chapter cards. |
| `/chapter/[slug]` | Chapter Detail.dc.html | Player on the left and info on the right in the hero, an overlapping stats strip, sticky section tabs, What you'll learn, Parts, What's included, Most-asked in JEE, instructor, FAQ, a sticky purchase box and related chapters. |
| `/courses` | Courses.dc.html | Class 11, combo and Class 12 cards (the combo is dark and raised), every chapter listed by topic, a "how many chapters" slider calculator, a comparison table, instructor, FAQs and a CTA. |
| `/pricing` | Pricing.dc.html | Pricing overview and the "every paid chapter includes" blocks. |
| `/leaderboard` | Leaderboard.dc.html | White header, top-3 podium, sticky filters (period, class, search), live-reordering rows, and a sticky "you" bar. |
| `/book-a-call` | Book a Call.dc.html | The 1:1 call with Karan: what happens on the call, a slot picker (embed Cal.com or Calendly here), then checkout. |
| `/checkout` | Checkout.dc.html | Guest cart, sign in before paying (Google, phone + OTP, email + password), coupon, upsells (chapters and the 1:1 call), summary. |
| `/payment/[status]` | Payment Status.dc.html | Razorpay success, pending and failed states. |
| `/thank-you` | Thank You.dc.html | What was purchased, shortcuts to log in or start Chapter 1, invoice link. |
| `/invoice/[id]` | Invoice.dc.html | Printable invoice. |
| `/learn/[chapter]` | Chapter Player.dc.html | Unlocked chapter for the MVP: parts, video, DPPs (problems and solutions), notes and tricks. |
| `/login`, `/signup` | Login.dc.html | Brand illustration panel on the left, form on the right. |
| `/about` | About.dc.html | Story video, what we solve, what you see after login, why chapter-wise, why the videos work, instructor, CTA. |
| `/contact` | Contact.dc.html | Contact form (name, phone, email, class, message) and support details. |
| `/faq` | FAQ.dc.html | Categorised FAQs and a link to Contact. |
| `/blog` | Blog.dc.html | The latest article featured, then articles by month (newest first), category filter, search and "Load older". |
| `/blog/[slug]` | Blog Article.dc.html | Reading progress bar, a sticky contents list, article body blocks (tip, timeline, ranked bars, inline chapter card), author box, related posts. |
| `/terms`, `/privacy`, `/refunds` | Terms / Privacy Policy / Refund Policy .dc.html | Shared legal layout. |

Each screen's exact layout, copy and states are in its file. The shared parts (nav, mobile menu, footer, hero wash, buttons, cards, toasts, FAQ rows) are specified in `design.md` §3–4. Build them **once** as shared components, then use them on every page.

## Interactions and behaviour
- **Nav:** the full segmented nav shows from 1024px. Below that, a dark hamburger drop-down. The active page is highlighted. A cart badge shows the item count.
- **Add to cart:** works for guests (local cart). A toast says "Added X to cart" with a "View cart · n" button and auto-hides after 2.6s. Ask the user to sign in only at payment.
- **Filters and search:** filter instantly on the client, and show empty states with a reset action.
- **FAQ and accordions:** one open at a time, expanding via `grid-template-rows: 0fr → 1fr` over 0.35s.
- **Sticky elements:** filter bars, chapter section tabs, the purchase box, the blog contents list and the leaderboard "you" bar.
- **Leaderboard:** in the design, rows reorder by animating `top` over 0.7s, and the XP changes are simulated. In production, use real data (polling or realtime).
- **Motion:** entrances rise 10–14px and fade over 0.45s. Cards lift 3–6px on hover.
- **Responsive:** see `design.md` §6. Tap targets are at least 44px on mobile.

## State and data
Sample data (chapters, prices, JEE weightage, topics, leaderboard, blog posts) is inline in each design's script. Replace it with the app's existing DB and API data. The chapter fields the UI needs are title, class, topic, symbol, JEE weightage %, parts (name and length), free-Part-1 flag, price, MRP and poster gradient.

## Assets
- `brand/mathflex-mark.svg`: the app icon.
- `brand/mathflex-logo-black.png`: the full logo for light backgrounds.
- `brand/mathflex-logo-white.png`: the full logo for dark backgrounds.
- No photos. Karan appears only through his intro video (placeholder). Chapter posters are gradients with maths symbols.

## Files
- `design.md`: the design system (v2).
- `MVP tracker.md`: page status and build order.
- `designs/*.dc.html`: one file per screen.
- `designs/support.js`, `designs/image-slot.js`: helpers so the designs render in a browser.
- `brand/`: logo files.

## Suggested first prompt for Claude Code
> Read `design/README.md` and `design/design.md`. Then build the shared site shell (nav with mobile menu, footer, hero wash, and the buttons and cards on tokens) without touching `/admin` styles. Show me the home page route first, matching `designs/Landing Page v2.dc.html`.
