import { test } from "@playwright/test";
import { verifyStoreImages } from "./store-images-browser.mjs";

test("Store real product images against deterministic mock API", async ({ page }) => {
  test.setTimeout(180_000);
  await verifyStoreImages(page, "http://localhost:3001");
});
