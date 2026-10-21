import { test } from "@playwright/test";
import { verifyProductContentBrowser } from "./product-content-browser.mjs";
import { verifyConflictRegression, verifySessionRegression } from "./product-content-regressions.mjs";

test("regression: conflicts require explicit resolution before saving or approving", async ({ page }) => {
  await verifyConflictRegression(page);
});

test("regression: token refresh preserves drafts and product/account isolation", async ({ page }) => {
  await verifySessionRegression(page);
});

test("Store product content editor against deterministic mock API", async ({ page }) => {
  test.setTimeout(180_000);
  await verifyProductContentBrowser(page, "http://localhost:3002");
});
