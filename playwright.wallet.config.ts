import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "apps/app/e2e",
  testMatch: "wallet.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: "list",
  outputDir: join(tmpdir(), "mushroom-wallet-playwright"),
  use: {
    channel: "chrome",
    baseURL: "http://localhost:3001",
    trace: "off",
    video: "off",
    screenshot: "off",
  },
});
