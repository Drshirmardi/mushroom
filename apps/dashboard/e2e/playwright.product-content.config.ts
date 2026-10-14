import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: ".",
  testMatch: "product-content.spec.ts",
  workers: 1,
  timeout: 180_000,
  outputDir: join(tmpdir(), "mushroom-product-content-playwright"),
  projects: [
    { name: "desktop", use: { channel: "chrome", viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { channel: "chrome", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  use: { trace: "off", video: "off", screenshot: "only-on-failure", actionTimeout: 30_000, navigationTimeout: 60_000 },
});
