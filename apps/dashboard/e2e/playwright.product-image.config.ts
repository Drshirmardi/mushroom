import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: ".", testMatch: "product-image.spec.ts", workers: 1, timeout: 120_000,
  outputDir: join(tmpdir(), "mushroom-store-media-playwright"),
  use: { channel: "chrome", trace: "off", video: "off", screenshot: "off" },
});
