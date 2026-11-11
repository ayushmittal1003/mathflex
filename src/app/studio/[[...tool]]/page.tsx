import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";

// Embedded Sanity Studio. It lives outside the (site) group, so it has no public nav or footer.
// `metadata` from next-sanity sets robots: noindex; robots.ts also disallows /studio.
export const dynamic = "force-static";
export { metadata, viewport } from "next-sanity/studio";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
