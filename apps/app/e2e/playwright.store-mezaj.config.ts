import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import base from "./playwright.store-images.config";
export default defineConfig({ ...base, use: { ...base.use, actionTimeout: 15_000 }, testMatch: "store-mezaj.spec.ts", timeout: 90_000, outputDir: join(tmpdir(), "mushroom-store-mezaj-playwright"), webServer: [
  { command: "npx next dev --hostname localhost --port 3001", cwd: "apps/app", port: 3001, reuseExistingServer: true, timeout: 300_000 },
  { command: "npx next dev --hostname localhost --port 3002", cwd: "apps/dashboard", port: 3002, reuseExistingServer: true, timeout: 300_000 },
] });
