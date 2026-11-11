// Public Sanity identifiers (safe in the browser). The read token and webhook secret are
// server-only and are read where they are used.
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-10-24";

// The blog falls back to its sample posts while Sanity is not configured.
export const sanityConfigured = Boolean(projectId);
