import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/config";

// Only /admin and /api are blocked. Private pages (account, checkout, learn…) are NOT
// disallowed here on purpose: they carry a noindex tag, and Google can only see a noindex
// on a page it is allowed to crawl.
//
// AI crawlers (owner decision, left as defaults for now). To block one, add a rule like
//   { userAgent: "GPTBot", disallow: "/" }
// - OAI-SearchBot  ChatGPT search results. Recommend allow (it only helps being found).
// - GPTBot         OpenAI model training. Business decision.
// - Google-Extended Gemini training/grounding. Does NOT affect Google Search or AI Overviews.
// - ClaudeBot      Anthropic training/search crawler.
// - PerplexityBot  Perplexity search results. Recommend allow.
// - CCBot          Common Crawl, feeds many training sets. Business decision.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
