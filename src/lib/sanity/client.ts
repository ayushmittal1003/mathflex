import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "./env";

// Published content only. useCdn is fine here: the webhook-driven revalidation waits for
// Content Lake to settle before re-fetching.
export const sanityClient = createClient({ projectId, dataset, apiVersion, useCdn: true, perspective: "published" });
