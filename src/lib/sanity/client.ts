import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId, sanityConfigured } from "./env";

// Published content only. useCdn is fine here: the webhook-driven revalidation waits for
// Content Lake to settle before re-fetching.
// Only created when NEXT_PUBLIC_SANITY_PROJECT_ID is set: createClient throws on an empty
// project ID, which broke every build (and the sitemap) on deployments without it. Callers go
// through fromSanityOrNull in lib/blog.ts, which checks sanityConfigured first.
export const sanityClient = (sanityConfigured
  ? createClient({ projectId, dataset, apiVersion, useCdn: true, perspective: "published" })
  : null) as ReturnType<typeof createClient>;
