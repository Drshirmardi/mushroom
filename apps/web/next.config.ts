import type { NextConfig } from "next";
import { join } from "node:path";

import { allowedDevOriginsFromEnvironment } from "../../config/next-dev-origins";

const allowedDevOrigins = allowedDevOriginsFromEnvironment();

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: join(__dirname, "../.."),
  reactStrictMode: true,
  ...(allowedDevOrigins ? { allowedDevOrigins } : {}),
};

export default nextConfig;
