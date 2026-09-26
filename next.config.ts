import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      { pathname: "/**", search: "" },
      { pathname: "/medals/ai/items-main/**", search: "?v=2" },
    ],
  },
  async headers() {
    return ["/sw.js", "/sw-build.js"].map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      ],
    }));
  },
};

export default nextConfig;
