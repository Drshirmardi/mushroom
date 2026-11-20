import type { NextConfig } from "next";
import { join } from "node:path";

import { allowedDevOriginsFromEnvironment } from "../../config/next-dev-origins";

const allowedDevOrigins = allowedDevOriginsFromEnvironment();

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: join(__dirname, "../.."),
  async headers() {
    return [
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
      { source: '/offline.html', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    ];
  },
  ...(allowedDevOrigins ? { allowedDevOrigins } : {}),
  experimental: {
    agentUpgrade: "security",
    optimizePackageImports: [
      "@base-ui/react",
      "@radix-ui/react-dropdown-menu",
      "lucide-react",
      "motion",
      "recharts",
    ],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "snapp.doctor" },
      { protocol: "https", hostname: "www.snapp.doctor" },
    ],
  },
};

export default nextConfig;
