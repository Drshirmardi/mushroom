import { defineConfig } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";

export default defineConfig({
    testDir: "tests/e2e/phase-12",
    testMatch: "landing-localized.spec.ts",
    workers: 1,
    timeout: 90_000,
    reporter: "list",
    outputDir: join(tmpdir(), "mushroom-landing-browser"),
    use: {
        baseURL: "http://localhost:3000",
        browserName: "chromium",
        launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? (process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/chromium") },
        trace: "off", video: "off", screenshot: "off",
    },
    webServer: {
        command: "node ./node_modules/next/dist/bin/next dev --hostname 0.0.0.0 --port 3000",
        cwd: "apps/web",
        url: "http://localhost:3000/en",
        reuseExistingServer: true,
        timeout: 120_000,
    },
});
