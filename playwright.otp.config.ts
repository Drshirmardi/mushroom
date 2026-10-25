import { defineConfig } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";

export default defineConfig({
  testDir: "tests/e2e/phase-12",
  testMatch: "otp-auth.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: "list",
  outputDir: join(tmpdir(), "mushroom-otp-playwright"),
  use: {
    baseURL: "http://127.0.0.1:3200",
    browserName: "chromium",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? (process.platform === "win32"
      ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/chromium") },
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  webServer: {
    command: "node ./node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3200",
    cwd: "apps/web",
    url: "http://127.0.0.1:3200/login",
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
