import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PostHog goes through this site (/ingest), so ad blockers drop fewer events.
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/array/:path*", destination: "https://us-assets.i.posthog.com/array/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
  // Needed for the PostHog rewrites above.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
