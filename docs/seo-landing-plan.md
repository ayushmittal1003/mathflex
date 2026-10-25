# SEO landing pages: proposal (Phase 6)

Status: **plan accepted, nothing built.** Pages will be built later on `feature/seo-landing-pages`, not on `feature/seo`. Written 2026-10-12 on `feature/seo`. Every page below needs your approval, and most need content that only the mentor can write or sign off.

## 1. What already exists (checked before proposing anything)

| Intent | Existing page | Verdict |
|---|---|---|
| Browse chapters, filter by class | `/chapters` (filter via `?class=11`, one canonical URL) | Covers navigation. It is a filter, not a landing page: no unique copy, and `?class=` URLs canonicalise to `/chapters`. |
| Buy a Class 11 / 12 / both course | `/courses`, `/courses/class-11-complete`, `/courses/class-12-complete`, `/courses/class-11-and-12` | Covers commercial intent for Class 11 and 12. |
| One chapter's lessons | `/chapter/[slug]` (35 chapters, JSON-LD Course, FAQ block, related chapters) | Covers "chapter + JEE" queries at the chapter level. |
| Mentor | `/about`, instructor block on each chapter | Covers the E-E-A-T basics. |
| Blog | `/blog` (sample posts, all `placeholder`, noindex, not in sitemap) | **Not usable yet.** Posts are sample content. Real posts come from Sanity (see `src/lib/blog.ts`). |
| Free practice | `/free-practice` (noindex) | Placeholder content. |
| PYQs, formulas, syllabus, exam dates, Class 10, droppers, parents | **None** | Genuine gaps. |

Rule applied: where an existing page covers an intent, extend it instead of adding a competing URL. Result: the Class 11 and Class 12 pillars (section 3.3, 3.4) are proposed as **new hub pages that point at existing course and chapter pages**, not as copies of them.

## 2. Priority and recommendation

| Priority | Page | Why | Blocks |
|---|---|---|---|
| 1 | `/class-11-maths-for-jee` and `/class-12-maths-for-jee` | Real products exist, 35 chapter pages already to link to, no backend work. Two pages, not programmatic. | Mentor-written intro and study approach per class |
| 2 | `/jee-main-maths` | Main pillar that ties both classes, syllabus and courses together | Verified exam facts (section 4) |
| 3 | `/jee-main-maths-syllabus` | Informational, links down to every chapter | Official syllabus link, PYQ-weightage method and data |
| 4 | `/jee-maths-formulas` (hub only first) | Useful, linkable asset | KaTeX dependency (needs approval), mentor-reviewed content |
| 5 | `/jee-main-maths-pyq` (hub), then per-chapter | High-volume but heavy: needs real questions, solutions and metadata | Content model (Ayush), copyright check, mentor time |
| 6 | `/jee-advanced-maths`, `/for-parents` | Smaller, lower urgency | Mentor copy |
| Hold | `/jee-foundation-maths-class-10`, `/jee-maths-for-droppers`, `/jee-main-2027` | See section 5. No matching product today, or a dated page that has to be maintained. | Decision on whether to sell a Class 10 or dropper product |

**Do not build any of these without real content.** A page with placeholder text would damage the site's trust signals and, for programmatic ones, the whole site's indexing.

## 3. Page specifications

Shared fields for every page, so they are not repeated:
- **Rendering:** server component, content and links in the initial HTML. `buildMetadata` for title, description, canonical and OG. Static OG image through the existing `ogCard`.
- **Breadcrumb:** Home › page name (UI plus `BreadcrumbList`). Nested pages add their parent.
- **Byline:** "Taught by an IIT Delhi alumnus · Updated {date}" (the confirmed credential only).
- **Sitemap:** added to the static list in `src/app/sitemap.ts`. `lastModified` comes from the data it renders, or is omitted.
- **Footer:** a "Learn" link for pillars; hubs link down to chapters.
- **Content rule:** unique text written or reviewed by the mentor. AI drafts must be fact-checked. Keyword variants go in natural copy only. No keyword stuffing, no year in evergreen URLs.

### 3.1 `/jee-main-maths` (pillar)

- **Cluster:** JEE Main maths online course; IIT JEE maths video lectures; JEE Main maths preparation.
- **Intent:** commercial plus informational.
- **Title / H1:** "JEE Main Maths: Chapters, Syllabus and Video Course" / "JEE Main maths, chapter by chapter".
- **Outline (H2s):** How the maths paper is structured (cited from the NTA bulletin, with a "last verified" date) · How MathFlex covers it (Class 11 and Class 12 chapters, links) · How a chapter is taught (parts, DPPs, PYQs, notes) · Which course fits you (the three real courses with live prices) · Start with a free preview · Questions students ask.
- **Data:** chapters and courses from the DB (existing `getCatalog` and course queries); exam facts as static copy with source links.
- **Links in:** home hero and nav, footer, both class pillars, syllabus, blog. **Out:** class pillars, syllabus, `/courses`, five or six chapter pages, `/pricing`.
- **Schema:** `BreadcrumbList`, `ItemList` of courses (same helper as `/courses`). No FAQ or HowTo markup.
- **E-E-A-T:** mentor byline, official NTA source links with date, MathFlex method statement.
- **Cadence:** re-verify when NTA publishes a bulletin, otherwise quarterly.
- **Backend:** none.

### 3.2 `/jee-advanced-maths`

- **Cluster:** JEE Advanced maths; JEE Advanced maths course; important topics.
- **Intent:** pillar, informational.
- **H1:** "JEE Advanced maths: what changes after JEE Main".
- **Outline:** What Advanced tests differently (cite the official JEE Advanced information brochure, dated) · Chapters where Advanced goes deeper (links, mentor-chosen) · Multi-concept problem habits · Using MathFlex chapters and PYQs for Advanced · Where to start.
- **Data:** mentor-written static copy. Chapter links from DB.
- **Honesty check:** MathFlex sells chapter videos. If there is no Advanced-specific material, this page must say what the chapters cover and not imply a separate Advanced course.
- **Schema:** `BreadcrumbList` only.
- **Cadence:** once a year after the brochure.
- **Backend:** none.

### 3.3 `/class-11-maths-for-jee`

- **Cluster:** class 11 maths for JEE; class 11 maths chapters important for JEE Main; class 11 maths course for JEE online.
- **Intent:** pillar, weak competition.
- **H1:** "Class 11 maths for JEE".
- **Outline:** What Class 11 maths covers for JEE · All Class 11 chapters (grouped, linked, with parts and duration) · Suggested order and pace (mentor) · Boards and JEE together · The Class 11 course and prices · Free previews.
- **Data:** chapters grouped from DB (`classLevel = 11`); courses `class-11-complete` and `class-11-and-12`.
- **Links in:** `/jee-main-maths`, `/chapters`, `/courses`, footer, nav. **Out:** every Class 11 chapter, the two courses, `/pricing`.
- **Schema:** `BreadcrumbList`, `ItemList` of the chapters (existing helper). No Course markup, since it is a hub.
- **Backend:** none today. Better ordering later needs a prerequisite relation (Ayush).
- **Note:** `/chapters?class=11` must stay canonical to `/chapters`, so there is no duplicate-content issue.

### 3.4 `/class-12-maths-for-jee`

Same structure as 3.3 with Class 12 chapters, courses `class-12-complete` and `class-11-and-12`, and a section on balancing boards with JEE. Cluster: class 12 maths for JEE; class 12 maths course JEE Main.

### 3.5 `/jee-main-maths-syllabus`

- **Cluster:** JEE Main maths syllabus; chapter-wise weightage.
- **Intent:** informational.
- **H1:** "JEE Main maths syllabus and chapter weightage".
- **Outline:** Official syllabus (link to the NTA source, "last verified {date}") · Chapters by class with MathFlex chapter links · **MathFlex's own PYQ analysis**: weightage per chapter, with the method stated (which papers, which years, how counted) · How to use the weightage · Notes and caveats.
- **Facts to get right:** Maths in JEE Main Paper 1 is 25 questions and 100 of 300 marks. Never write "35% of the paper". NTA does not publish weightage, so every percentage is labelled "MathFlex analysis" with the method.
- **Data:** `Chapter.jeeWeightage` already exists in the DB and is shown on chapter pages (e.g. "x% of JEE Main"). **Open question for the owner:** how was that number produced? The page must not publish it unless a method can be stated. If the method does not exist yet, this page waits.
- **Schema:** `BreadcrumbList`, `ItemList` of chapters.
- **Cadence:** re-verify annually and whenever NTA changes the syllabus.
- **Backend:** none, once the weightage method is confirmed.

### 3.6 `/jee-main-maths-pyq` and `/jee-main-maths-pyq/[chapter]`

- **Cluster:** JEE Main maths PYQ chapter wise; "[chapter] JEE PYQ".
- **Intent:** informational, high volume.
- **H1 (hub):** "JEE Main maths previous-year questions, chapter-wise". **(chapter):** "[Chapter]: JEE Main PYQs with solutions".
- **Outline (chapter):** What this chapter asks (mentor summary) · Questions with year and shift, worked solution in HTML · Common mistakes · Related chapter lesson (link to `/chapter/[slug]`) · Next and previous chapter.
- **Data:** the DB already stores questions (`Question`, type PYQ/DPP, published flag) used by the practice player. Open items: do they carry year, session and shift? Are the solutions written out and are we allowed to publish them openly (they are paid content today)?
- **Risks:** publishing paid practice content for free can hurt sales. Copying NTA questions needs a rights check. Thin pages with a few questions would be doorway pages.
- **Rule:** a chapter page is only created when it has a substantial set of real questions with solutions. No auto-generated pages for all 35 chapters.
- **Schema:** `BreadcrumbList`. `Quiz` / `Question` markup only if validated against current Google documentation and genuinely useful. Default is none.
- **Maths rendering:** needs KaTeX or similar, a new dependency (needs your approval). Today maths is plain text.
- **Backend:** yes. Question metadata (year, session, shift, difficulty, solution), a public-visibility flag per question.

### 3.7 `/jee-maths-formulas` and `/jee-maths-formulas/[chapter]`

- **Cluster:** JEE maths formula sheet; "[chapter] formulas for JEE".
- **Intent:** informational.
- **Outline (chapter):** Core formulas in accessible HTML · When to use each (one line, mentor) · Typical traps · Link to the chapter and to PYQs.
- **Data:** mentor-written content stored as MDX in the repo, or a Sanity document type. Needs a decision (Ayush). KaTeX needed, or the sheets will be images, which is bad for SEO and accessibility.
- **Rule:** hub plus only the chapters with finished, reviewed sheets. Optional PDF download is secondary.
- **Schema:** `BreadcrumbList`.
- **Backend:** content model if not MDX.

### 3.8 `/jee-foundation-maths-class-10`

- **Cluster:** JEE foundation maths class 10; how to start JEE preparation from class 10.
- **Intent:** informational, Class 10 students and parents.
- **Problem:** MathFlex has **no Class 10 product** (chapters are Class 11 and 12 only). A landing page that captures this intent but sells nothing relevant is a poor experience.
- **Recommendation:** hold. If built, make it an honest roadmap ("which Class 10 topics matter, and when to start Class 11 with MathFlex"), link to the free previews, and do not claim a Class 10 course.

### 3.9 `/jee-maths-for-droppers`

- **Cluster:** JEE maths for droppers; JEE dropper maths course online.
- **Intent:** commercial.
- **Problem:** no dropper product or plan exists. Same honesty issue as 3.8.
- **Recommendation:** hold until there is a real offer (for example a one-year plan built from the combo course). If built: a mentor-written revision plan, links to the combo course and pricing, and no invented results.

### 3.10 `/jee-main-2027` (exam information)

- **Cluster:** JEE Main exam date; JEE Main 2027.
- **Intent:** informational, freshness.
- **Problem:** high maintenance and high competition (NTA, large publishers). Only worth building if someone commits to updating it within days of each NTA notice.
- **Recommendation:** hold. If built: dates only from NTA notices, each with a source link and a visible change log, URL kept stable and the year only in the title and H1.

### 3.11 `/for-parents`

- **Cluster:** JEE maths course for class 11/12 (parent angle); is online JEE maths worth it.
- **Intent:** commercial for parents.
- **Outline:** What a student gets (parts, practice, notes, validity) · Pricing clarity (live prices, refund policy link) · How progress is tracked · Support and contact · About the mentor.
- **Data:** DB prices, settings, existing policy pages, existing FAQ.
- **Schema:** `BreadcrumbList`.
- **Rule:** no outcome claims or testimonials unless real and documented.
- **Backend:** none.

## 4. Facts and sources (apply to every exam-related page)

- Cite the NTA information bulletin and the JEE Advanced brochure directly, with a **"Last verified: {date}"** line and a named owner who re-checks.
- Present weightage only as "MathFlex's own PYQ analysis" with the method written out.
- Use the confirmed credential only: "IIT Delhi alumnus".
- No rank or selection claims, no fabricated reviews, no student counts beyond what the settings data states.
- Every page shows its `updatedAt` in the byline and in the sitemap `lastModified`.

## 5. Things I am deliberately not proposing

- Programmatic pages per topic, per city or per year, or pages generated from the chapter list without unique content.
- FAQ, HowTo or Course Info rich-result markup, `AggregateRating` for ourselves, `llms.txt` as a ranking tactic, or keyword meta tags.
- A blog content plan: the blog is still sample content. Once Sanity is connected, a separate plan should cover which posts to write (chapter guides, study plans), and the `placeholder` flags should be removed post by post.

## 6. Backend and admin needs (for `dipankar-design/ayush-handoff.md`)

| Need | Pages that depend on it |
|---|---|
| A content store for formula sheets, syllabus and hub copy (MDX in repo, or a Sanity document type), with an owner and `updatedAt` | 3.5, 3.7, 3.1 to 3.4 copy |
| PYQ metadata: year, session, shift, difficulty, written solution, and a "publicly visible" flag per question | 3.6 |
| Method behind `Chapter.jeeWeightage` (who computed it, from which papers) | 3.5 and the chapter pages that already show it |
| Chapter prerequisite and next relation | 3.3, 3.4 ordering, related chapters |
| Author model (name, bio, credentials, photo) | byline links on all pages |
| Product decision: any Class 10 or dropper offering | 3.8, 3.9 |
| Revalidate hook on publish, so new hub and chapter pages enter the sitemap quickly | all |

## 7. Frontend work and dependencies (once approved)

- A small shared `PillarPage` layout (hero, chapter grid reusing `ChapterCard`, CTA band), so each pillar is mostly content. No new design tokens.
- `src/app/sitemap.ts` gets the new static paths. Footer and nav get links for approved pillars.
- A KaTeX dependency (needs your approval) for formulas and PYQs.
- Each new page follows the New page checklist in the upcoming `seo.md`.

## 8. Risks

- **Thin or duplicated content:** the largest risk. Mitigation: no page ships without mentor-written or mentor-reviewed text, and no per-chapter pages without real content.
- **Cannibalisation:** one primary cluster per URL. The Class 11 and Class 12 pillars must not repeat the course page copy. They link to it.
- **Staleness:** exam-info pages get stale quickly. Dated facts, an owner, and a re-check cadence are required, otherwise do not publish.
- **Free vs paid:** PYQ and formula pages must not give away what the paid chapters sell. Decide the boundary first.
- **Claims:** anything that implies a Class 10 or dropper product, or ranking and result claims, is out unless it is real.

## 9. Pending decisions

Status 2026-10-12: plan accepted. **No landing pages are built on `feature/seo`.** They will be built on a separate branch, `feature/seo-landing-pages`, once the mentor supplies content. The decisions below are still open.

1. Approve building the Class 11 and Class 12 pillars first (priority 1), once the mentor supplies the intro and approach text?
2. Who writes and who verifies exam facts (NTA source checks) for `/jee-main-maths` and the syllabus page?
3. How was `Chapter.jeeWeightage` produced, and can the method be published?
4. Are PYQs and solutions allowed to be public, or only a sample per chapter?
5. Do you want a Class 10 or dropper offer? If not, the two pages stay on hold.
6. OK to add KaTeX when the formula or PYQ pages are approved?
