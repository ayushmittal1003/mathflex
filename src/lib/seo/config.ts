// Central SEO settings. The public origin comes from APP_URL, the same variable the root
// layout, Cashfree return route and Google sign-in already use (no new env var).

const fromEnv = process.env.APP_URL?.trim().replace(/\/$/, "");

// In production a missing APP_URL would put localhost into every canonical, Open Graph tag
// and sitemap entry, so say so loudly in the build/server log.
if (!fromEnv && process.env.NODE_ENV === "production") {
  console.warn("[seo] APP_URL is not set: canonical URLs and the sitemap will point at http://localhost:3000.");
}

export const SITE_URL = fromEnv || "http://localhost:3000";
export const SITE_NAME = "MathFlex";
export const LOCALE = "en_IN";

// Only claims that are true of the whole site. Do not add credentials here until the owner
// has confirmed the exact wording (see dipankar-design/ayush-handoff.md).
export const DEFAULT_TITLE = "IIT Starts With Maths, Crack JEE Main & Advanced";
export const DEFAULT_DESCRIPTION =
  "Learn every JEE maths chapter with video lessons, practice questions and notes. Buy only the chapters you need and build the maths score your IIT dream needs.";

// Social profiles that are really linked in the footer (src/lib/site-content.ts `socials`). Add a
// profile here only when it is live and linked; no "coming soon" or placeholder links.
export const SOCIAL_PROFILES = ["https://www.instagram.com/mathflex.in/"];

export const absoluteUrl = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
