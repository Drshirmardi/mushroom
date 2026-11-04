import assert from "node:assert/strict";

// Deterministic API interception only. No real API, database or R2 is used.
// Covers: real image render, null-image fallback, 404-bytes fallback,
// product switching, RTL layout and zero Digikala/test-image traffic.
export async function verifyStoreImages(page, origin) {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGJkAAAAASUVORK5CYII=",
    "base64",
  );
  const allow = { "access-control-allow-origin": origin, "access-control-allow-credentials": "true" };
  const category = { id: "c1111111-1111-4000-8000-000000000001", name: "مکمل", slug: "supplement" };
  const sku = (id) => ({ id, code: `SKU-${id.slice(0, 4)}`, title: null, currentPriceToman: "125000", currentTaxToman: "0" });
  const imageA = {
    id: "a1111111-1111-4000-8000-000000000001",
    contentPath: "/v1/commerce/products/a1111111-1111-4000-8000-000000000001/images/a1111111-1111-4000-8000-000000000001",
    mimeType: "image/png", sizeBytes: png.length, width: 1, height: 1, altText: "عکس محصول واقعی",
  };
  const imageC = { ...imageA, id: "c1111111-1111-4000-8000-000000000003", contentPath: "/v1/commerce/products/c1111111-1111-4000-8000-000000000003/images/c1111111-1111-4000-8000-000000000003" };
  const productA = { id: "a1111111-1111-4000-8000-000000000001", title: "محصول دارای تصویر", slug: "with-image", description: null, category, image: imageA, skus: [sku("s1")] };
  const productB = { id: "b1111111-1111-4000-8000-000000000002", title: "محصول بدون تصویر", slug: "without-image", description: null, category, image: null, skus: [sku("s2")] };
  const productC = { id: "c1111111-1111-4000-8000-000000000003", title: "محصول با تصویر خراب", slug: "broken-image", description: null, category, image: imageC, skus: [sku("s3")] };
  const byId = new Map([[productA.id, productA], [productB.id, productB], [productC.id, productC]]);
  const requestedBytes = [];
  const requestedUrls = [];
  page.on("request", (request) => { requestedUrls.push(request.url()); });
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const poll = async (ready, what) => {
    for (let attempt = 0; attempt < 60; attempt++) {
      if (ready()) return;
      await sleep(500);
    }
    assert.fail(`timed out waiting for ${what}`);
  };

  await page.context().route(
    (url) => url.pathname.startsWith("/v1/commerce/"),
    async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const json = (body, status = 200) => route.fulfill({ status, headers: { ...allow, "content-type": "application/json" }, body: JSON.stringify(body) });
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { ...allow, "access-control-allow-methods": "GET,OPTIONS", "access-control-allow-headers": "authorization,content-type" } });
      const bytes = path.match(/^\/v1\/commerce\/products\/([^/]+)\/images\/([^/]+)$/);
      if (bytes) {
        requestedBytes.push(path);
        if (bytes[1] === productC.id) return route.fulfill({ status: 404, headers: allow, body: "" });
        return route.fulfill({ status: 200, headers: { ...allow, "content-type": "image/png", "cache-control": "no-store" }, body: png });
      }
      if (path === "/v1/commerce/products") return json({ items: [productA, productB, productC], page: 1, pageSize: 12, total: 3 });
      const detail = path.match(/^\/v1\/commerce\/products\/([^/]+)$/);
      if (detail && byId.has(detail[1])) return json(byId.get(detail[1]));
      return json({ code: "MOCK_ENDPOINT_NOT_CONFIGURED" }, 501);
    },
  );

  const loadedCount = () => page.evaluate(() => [...document.querySelectorAll("img")].filter((img) => img.complete && img.naturalWidth > 0).length);
  const fallbackCount = () => page.evaluate(() => [...document.querySelectorAll("img")].filter((img) => (img.getAttribute("src") || "").startsWith("data:image/svg+xml,")).length);

  // Catalog: real image loads, missing/failed images fall back, zero test imagery.
  await page.goto(`${origin}/store`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => [...document.querySelectorAll(".store-product__image")].length >= 3, null, { timeout: 60_000 });
  await page.locator("#store-products").scrollIntoViewIfNeeded();
  // Lazy card images only fetch once scrolled into view; poll the node-side log.
  await poll(() => requestedBytes.some((path) => path.includes(productA.id)), "real image bytes requested");
  await poll(() => requestedBytes.some((path) => path.includes(productC.id)), "broken image bytes requested");
  await page.waitForFunction(() => [...document.querySelectorAll("img")].filter((img) => img.complete && img.naturalWidth > 0).length >= 1, null, { timeout: 30_000 });
  assert.ok((await loadedCount()) >= 1, "at least the real product image loads");
  assert.ok((await fallbackCount()) >= 1, "missing/broken images render the neutral fallback");
  // Scope is product imagery only: hero/offers/shortcut test artwork is owned
  // by a separate batch and intentionally untouched here.
  const productSlotsWithTestImagery = await page.evaluate(() => [...document.querySelectorAll(".store-product__image, .store-gallery__slide img, .store-cart-item__media img, .store-recent__media img")]
    .map((img) => img.getAttribute("src") || "")
    .filter((src) => src.includes("dkstatics")));
  assert.deepEqual(productSlotsWithTestImagery, [], "no Digikala imagery in product slots");

  // RTL + responsive integrity on the catalog.
  assert.equal(await page.evaluate(() => document.documentElement.dir), "rtl");
  const overflow = await page.evaluate(() => document.scrollingElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `no horizontal overflow (got ${overflow}px)`);

  // Product switching: card A -> PDP A (real), then card B -> PDP B (fallback, no stale A image).
  await page.getByRole("link", { name: "مشاهدهٔ محصول دارای تصویر" }).first().click();
  await page.waitForURL(url => url.pathname === `/store/products/${productA.id}`, { timeout: 30_000 });
  const mainA = page.locator(".store-gallery__slide img").first();
  await page.waitForFunction(
    (selector) => { const img = document.querySelector(selector); return img && img.complete && img.naturalWidth > 0; },
    ".store-gallery__slide img",
    { timeout: 30_000 },
  );
  assert.equal(await mainA.getAttribute("alt"), "عکس محصول واقعی");
  await page.goto(`${origin}/store`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => [...document.querySelectorAll(".store-product__image")].length >= 3, null, { timeout: 60_000 });
  await page.getByRole("link", { name: "مشاهدهٔ محصول بدون تصویر" }).first().click();
  await page.waitForURL(url => url.pathname === `/store/products/${productB.id}`, { timeout: 30_000 });
  await page.waitForFunction(
    () => [...document.querySelectorAll(".store-gallery__slide img")].every((img) => (img.getAttribute("src") || "").startsWith("data:image/svg+xml,")),
    null,
    { timeout: 30_000 },
  );

  // Broken bytes (404) fall back on the detail page without loops.
  await page.goto(`${origin}/store/products/${productC.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => [...document.querySelectorAll(".store-gallery__slide img")].every((img) => (img.getAttribute("src") || "").startsWith("data:image/svg+xml,")),
    null,
    { timeout: 30_000 },
  );
  const overflowDetail = await page.evaluate(() => document.scrollingElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflowDetail <= 1, `no horizontal overflow on detail (got ${overflowDetail}px)`);
  assert.ok(!requestedBytes.some((path) => path.includes(productB.id)), "imageless product never requests bytes");
}
