import assert from "node:assert/strict";

// Deterministic API interception only. No real API or database is used.
// Covers: approved content sections, legacy description, pending emptiness,
// absence of fabricated claims, image fallback intact, RTL/mobile integrity.
export async function verifyProductContentBrowser(page, origin) {
  const category = { id: "c1111111-1111-4000-8000-000000000001", name: "مکمل", slug: "supplement" };
  const sku = (id) => ({ id, code: `SKU-${id.slice(0, 4)}`, title: null, currentPriceToman: "125000", currentTaxToman: "0" });
  const approved = {
    brand: "برند واقعی",
    manufacturer: "تولیدکننده واقعی",
    shortDescription: "معرفی کوتاه واقعی",
    description: "متن کامل محصول",
    ingredients: "ماده واقعی",
    usageInstructions: "دستور واقعی",
    warnings: "هشدار واقعی",
    contraindications: "منع واقعی",
    contentRevision: 3,
  };
  const productApproved = { id: "a1111111-1111-4000-8000-000000000001", title: "محصول کامل", slug: "approved", description: null, brand: null, shortDescription: null, category, image: null, content: approved, skus: [sku("s1")] };
  const productLegacy = { id: "b1111111-1111-4000-8000-000000000002", title: "محصول قدیمی", slug: "legacy", description: "توضیح قدیمی", brand: null, shortDescription: null, category, image: null, content: null, skus: [sku("s2")] };
  const productPending = { id: "c1111111-1111-4000-8000-000000000003", title: "محصول در انتظار", slug: "pending", description: null, brand: null, shortDescription: null, category, image: null, content: null, skus: [sku("s3")] };
  const byId = new Map([[productApproved.id, productApproved], [productLegacy.id, productLegacy], [productPending.id, productPending]]);
  const allow = { "access-control-allow-origin": origin, "access-control-allow-credentials": "true" };

  await page.context().route(
    (url) => url.pathname.startsWith("/v1/commerce/"),
    async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const json = (body, status = 200) => route.fulfill({ status, headers: { ...allow, "content-type": "application/json" }, body: JSON.stringify(body) });
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { ...allow, "access-control-allow-methods": "GET,OPTIONS", "access-control-allow-headers": "authorization,content-type" } });
      if (path === "/v1/commerce/products") return json({ items: [productApproved, productLegacy, productPending], page: 1, pageSize: 12, total: 3 });
      const detail = path.match(/^\/v1\/commerce\/products\/([^/]+)$/);
      if (detail && byId.has(detail[1])) return json(byId.get(detail[1]));
      if (path.includes("/images/")) return route.fulfill({ status: 404, headers: allow, body: "" });
      return json({ code: "MOCK_ENDPOINT_NOT_CONFIGURED" }, 501);
    },
  );

  const noFakeClaims = async () => {
    const html = await page.content();
    for (const fake of ["store-rating-row", "store-seller", "store-mini-chip", "دیدگاه", "فروشنده", "تأییدشده", "رضایت از کالا"]) {
      assert.ok(!html.includes(fake), `no fabricated claim in PDP (found ${fake})`);
    }
  };
  const overflowOk = async (where) => {
    const overflow = await page.evaluate(() => document.scrollingElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `no horizontal overflow ${where} (got ${overflow}px)`);
  };

  // Approved: every section renders from the API, image fallback intact.
  await page.goto(`${origin}/store/products/${productApproved.id}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "محصول کامل" }).waitFor({ timeout: 60_000 });
  for (const text of ["معرفی کوتاه واقعی", "برند واقعی", "تولیدکننده واقعی", "متن کامل محصول", "ماده واقعی", "دستور واقعی", "هشدار واقعی", "منع واقعی"]) {
    await page.getByText(text, { exact: false }).first().waitFor({ timeout: 15_000 });
  }
  for (const heading of ["دربارهٔ محصول", "ترکیبات", "دستور مصرف", "هشدارها", "موارد منع مصرف"]) {
    await page.getByRole("heading", { name: heading }).waitFor({ timeout: 15_000 });
  }
  await noFakeClaims();
  await overflowOk("approved PDP");

  // Legacy: old description only, nothing else, no approval claims.
  await page.goto(`${origin}/store/products/${productLegacy.id}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "محصول قدیمی" }).waitFor({ timeout: 60_000 });
  await page.getByText("توضیح قدیمی", { exact: false }).waitFor({ timeout: 15_000 });
  await noFakeClaims();
  await overflowOk("legacy PDP");

  // Pending: no content sections at all, purchase flow intact.
  await page.goto(`${origin}/store/products/${productPending.id}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "محصول در انتظار" }).waitFor({ timeout: 60_000 });
  await page.waitForFunction(
    () => [...document.querySelectorAll(".store-gallery__slide img")].every((img) => (img.getAttribute("src") || "").startsWith("data:image/svg+xml,")),
    null,
    { timeout: 30_000 },
  );
  const sections = await page.locator(".store-description").count();
  assert.equal(sections, 0, "pending product renders zero content sections");
  await page.getByRole("group", { name: /خرید محصول در انتظار/ }).waitFor({ timeout: 15_000 });
  await noFakeClaims();
  assert.equal(await page.evaluate(() => document.documentElement.dir), "rtl");
  await overflowOk("pending PDP");
}
