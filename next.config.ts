import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // These URLs carry access tokens, which must not leak to other sites or caches.
  // "no-referrer" would send Origin: null, which Server Actions reject as cross-site.
  async headers() {
    return ["/join/:token*", "/guest/:token*"].map((source) => ({
      source,
      headers: [
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "Cache-Control", value: "no-store" },
        { key: "X-Robots-Tag", value: "noindex" },
      ],
    }));
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
