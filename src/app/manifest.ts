import type { MetadataRoute } from "next";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo/config";

// Colours are the design.md tokens (primary red, light background).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} – JEE Maths`,
    short_name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#ef4444",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
