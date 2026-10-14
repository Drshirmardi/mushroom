import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: ".",
  testMatch: "store-images.spec.ts",
  workers: 1,
  timeout: 180_000,
  outputDir: join(tmpdir(), "mushroom-store-images-playwright"),
  webServer: {
    command: "npx next dev --hostname localhost --port 3001",
    cwd: "apps/app",
    port: 3001,
    reuseExistingServer: true,
    timeout: 300_000,
  },
  projects: [
    { name: "desktop", use: { channel: "chrome", viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { channel: "chrome", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  use: { trace: "off", video: "off", screenshot: "off" },
});
