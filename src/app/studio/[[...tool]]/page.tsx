import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";
import { sanityConfigured } from "@/lib/sanity/env";

// Embedded Sanity Studio. It lives outside the (site) group, so it has no public nav or footer.
// `metadata` from next-sanity sets robots: noindex; robots.ts also disallows /studio.
export const dynamic = "force-static";
export { metadata, viewport } from "next-sanity/studio";

export default function StudioPage() {
  // Without a project ID the Studio throws on load; say what's missing instead of a server error.
  if (!sanityConfigured) {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560, margin: "15vh auto", padding: 24, lineHeight: 1.6 }}>
        <h1 style={{ fontSize: 24 }}>The blog studio isn&apos;t connected yet</h1>
        <p>Add <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code> (and <code>NEXT_PUBLIC_SANITY_DATASET</code>) in Vercel → Settings → Environment Variables, then redeploy. Until then the blog shows its sample posts.</p>
      </main>
    );
  }
  return <NextStudio config={config} />;
}
