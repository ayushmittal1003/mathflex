import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Admins upload PDF notes / mind maps / posters through server actions.
    serverActions: { bodySizeLimit: "32mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
