import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "snapp.doctor" },
      { protocol: "https", hostname: "www.snapp.doctor" },
    ],
  },
};

export default nextConfig;
