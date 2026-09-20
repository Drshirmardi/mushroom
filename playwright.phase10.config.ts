import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "tests/e2e/phase-10",
  fullyParallel: false,
  timeout: 120_000,
  reporter: "list",
  outputDir: join(tmpdir(), "mushroom-phase-10-playwright"),
  use: { channel: "chrome", baseURL: "http://localhost:3001", trace: "off", video: "off", screenshot: "off" },
});
