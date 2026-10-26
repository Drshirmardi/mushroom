import { test } from "@playwright/test";
import { verifyProductImageBrowser } from "./product-image-browser.mjs";

test("Store media dashboard integration against deterministic mock API", async ({ page }) => {
  test.setTimeout(120_000);
  await verifyProductImageBrowser(page);
});
