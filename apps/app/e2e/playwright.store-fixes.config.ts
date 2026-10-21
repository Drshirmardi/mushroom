import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import base from "./playwright.store-images.config";

export default defineConfig({ ...base, testMatch: ["store-initial-fixes.spec.ts", "store-complete.spec.ts"], timeout: 90_000, outputDir: join(tmpdir(), "mushroom-store-fixes-playwright") });
