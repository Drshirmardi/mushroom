import type { NextConfig } from "next";
import { join } from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: join(__dirname, "../.."),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "snapp.doctor" },
      { protocol: "https", hostname: "www.snapp.doctor" },
    ],
  },
};

export default nextConfig;
