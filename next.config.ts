import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The desk is served at 127.0.0.1. Next blocks dev chunks from that host unless it is listed.
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: true,
  partialPrefetching: true,
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
