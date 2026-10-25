import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external images for thumbnails
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.tiktok.com" },
      { protocol: "https", hostname: "**.tiktokcdn.com" },
      { protocol: "https", hostname: "**.instagram.com" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.snapchat.com" },
      { protocol: "https", hostname: "**.sc-cdn.net" },
      { protocol: "https", hostname: "**.tikwm.com" },
    ],
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
