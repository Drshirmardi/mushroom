import { test } from "@playwright/test";
import { verifyProductContentBrowser } from "./product-content-browser.mjs";

test("Store product content editor against deterministic mock API", async ({ page }) => {
  test.setTimeout(180_000);
  await verifyProductContentBrowser(page, "http://localhost:3002");
});
