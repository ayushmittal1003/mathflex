import type { Metadata } from "next";
import { DEFAULT_DESCRIPTION, LOCALE, SITE_NAME } from "./config";

// Cut at a word boundary and add an ellipsis, so titles and descriptions never end mid-word.
export function truncate(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:–—-]+$/, "")}…`;
}

export const stripHtml = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

type Input = {
  title: string; // goes through the root title template ("%s | MathFlex")
  description?: string | null;
  path: string; // canonical path, no query string
  type?: "website" | "article";
  noindex?: boolean;
  // true for the home page: skips the "%s | MathFlex" title template.
  absoluteTitle?: boolean;
  // false when the route has its own opengraph-image file (chapter, course).
  defaultImage?: boolean;
};

// Metadata for a public page. The canonical never carries a query string, so filtered or
// sorted listing URLs all point back at the clean one. Setting openGraph here replaces the
// site-wide one, so the default social image is added explicitly unless the route has its own.
export function buildMetadata({ title, description, path, type = "website", noindex, absoluteTitle, defaultImage = true }: Input): Metadata {
  const t = truncate(title, 60);
  const d = truncate(description || DEFAULT_DESCRIPTION, 160);
  return {
    title: absoluteTitle ? { absolute: t } : t,
    description: d,
    alternates: { canonical: path },
    openGraph: { title: t, description: d, url: path, siteName: SITE_NAME, locale: LOCALE, type, ...(defaultImage ? { images: ["/opengraph-image"] } : {}) },
    twitter: { card: "summary_large_image", title: t, description: d },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

// Pages that belong to one signed-in person (or to checkout): keep out of search results.
// "follow" stays on, and these paths are NOT blocked in robots.txt, so Google can read the noindex.
export const privateMetadata = (title: string): Metadata => ({ title, robots: { index: false, follow: true } });

// Chapter blurb for meta descriptions and schema. Admin-written descriptions are used as
// written, with one correction: the seeded text says "IIT Delhi & NIT Jalandhar alumni", but
// the mentor's only confirmed credential is IIT Delhi, so that phrase is rewritten here. Any
// other mention of Jalandhar falls back to the tagline. The admin text itself still has to be
// corrected in admin (see dipankar-design/ayush-handoff.md); only then can this go.
export function chapterBlurb({ description, tagline }: { description: string; tagline: string }) {
  const d = stripHtml(description)
    .replace(/by IIT Delhi\s*(?:&|and)\s*NIT Jalandhar alumni/gi, "by an IIT Delhi alumnus")
    .trim();
  return d && !/jalandhar/i.test(d) ? d : tagline;
}
