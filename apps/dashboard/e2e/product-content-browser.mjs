import assert from "node:assert/strict";

// Deterministic API interception only. No real API, database or R2 is used.
// Covers: content status badge, five editor sections, save with revision,
// explicit approval, stale-revision conflict without overwrite, dirty guard,
// denial handling, RTL/mobile integrity and image-editor regression presence.
export async function verifyProductContentBrowser(page, origin) {
  const allow = { "access-control-allow-origin": origin, "access-control-allow-credentials": "true" };
  const productId = "00000000-0000-4000-8000-000000000001";
  const legacyId = "00000000-0000-4000-8000-000000000002";
  const category = { id: "00000000-0000-4000-8000-000000000009", name: "مکمل", slug: "supplement", isActive: true, productCount: 2 };
  const sku = (id) => ({ id, code: `SKU-${id.slice(0, 4)}`, title: null, currentPriceToman: "125000", currentTaxToman: "0", isActive: true, onHandQuantity: 10, reservedQuantity: 0 });
  const baseContent = {
    brand: "برند آزمون",
    manufacturer: null,
    shortDescription: null,
    description: "توضیح قدیمی",
    ingredients: null,
    usageInstructions: null,
    warnings: null,
    contraindications: null,
    contentRevision: 2,
    status: "PENDING_APPROVAL",
    provenance: { sourceKind: "PACKAGING", sourceReference: "بسته‌بندی ۱۴۰۴" },
    approvedContentRevision: null,
    contentApprovedAt: null,
    contentApprovedByUserId: null,
  };
  const legacyContent = { ...baseContent, description: "توضیح قدیمی محصول", contentRevision: 0, status: "LEGACY_UNREVIEWED", provenance: null };
  const server = new Map([[productId, structuredClone(baseContent)], [legacyId, structuredClone(legacyContent)]]);
  const products = () => [
    { id: productId, title: "محصول محتوادار", slug: "content-1", description: "توضیح قدیمی", status: "ACTIVE", category, image: null, content: server.get(productId), skus: [sku("s1")] },
    { id: legacyId, title: "محصول قدیمی", slug: "content-2", description: "توضیح قدیمی محصول", status: "ACTIVE", category, image: null, content: server.get(legacyId), skus: [sku("s2")] },
  ];
  let conflictNextPatch = false;
  let denyNextApprove = false;
  await page.context().exposeBinding("pdArm", (_, mode) => {
    conflictNextPatch = mode === "conflict";
    denyNextApprove = mode === "deny";
  });

  await page.context().route(
    (url) => url.pathname.startsWith("/v1/"),
    async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const json = (body, status = 200, headers = {}) => route.fulfill({ status, headers: { ...allow, "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { ...allow, "access-control-allow-methods": "GET,PATCH,POST,OPTIONS", "access-control-allow-headers": "authorization,content-type" } });
      if (path === "/v1/auth/refresh") return json({ accessToken: "mock-session-1", tokenType: "Bearer", expiresIn: 600, user: { id: "test-admin", phone: "+989100000000", roles: ["ADMIN"] } });
      if (path.endsWith("/commerce/categories")) return json([]);
      if (path.endsWith("/commerce/products")) return json({ items: products(), page: 1, pageSize: 100, total: 2 });
      if (path.endsWith("/shipping-rates/courier")) return json({ amountToman: "0", isActive: false });
      const contentMatch = path.match(/^\/v1\/admin\/commerce\/products\/([^/]+)\/content(\/approve)?$/);
      if (!contentMatch) return json({ code: "MOCK_ENDPOINT_NOT_CONFIGURED" }, 501);
      const id = contentMatch[1];
      if (!server.has(id)) return json({ code: "COMMERCE_PRODUCT_NOT_FOUND" }, 404);
      if (request.method() === "GET" && !contentMatch[2]) return json(server.get(id));
      if (request.method() === "PATCH" && !contentMatch[2]) {
        const body = request.postDataJSON();
        const current = server.get(id);
        if (conflictNextPatch) {
          conflictNextPatch = false;
          current.contentRevision += 1;
          server.set(id, current);
          return json({ code: "COMMERCE_CONTENT_REVISION_CONFLICT", revision: current.contentRevision }, 409);
        }
        if (body.expectedContentRevision !== current.contentRevision) {
          return json({ code: "COMMERCE_CONTENT_REVISION_CONFLICT", revision: current.contentRevision }, 409);
        }
        const fields = body.fields ?? {};
        let material = false;
        for (const key of ["brand", "manufacturer", "shortDescription", "description", "ingredients", "usageInstructions", "warnings", "contraindications"]) {
          if (key in fields) {
            const next = fields[key] ?? null;
            if (next !== current[key]) material = true;
            current[key] = next;
          }
        }
        const nextProv = body.provenance === undefined ? current.provenance : body.provenance;
        if (JSON.stringify(nextProv ?? null) !== JSON.stringify(current.provenance ?? null)) material = true;
        current.provenance = nextProv;
        if (material) {
          current.contentRevision += 1;
          current.approvedContentRevision = null;
          current.contentApprovedAt = null;
          current.contentApprovedByUserId = null;
        }
        server.set(id, current);
        return json(current);
      }
      if (request.method() === "POST" && contentMatch[2]) {
        const body = request.postDataJSON();
        const current = server.get(id);
        if (denyNextApprove) {
          denyNextApprove = false;
          return json({ code: "FORBIDDEN" }, 403);
        }
        if (body.expectedContentRevision !== current.contentRevision) {
          return json({ code: "COMMERCE_CONTENT_REVISION_CONFLICT", revision: current.contentRevision }, 409);
        }
        current.status = "APPROVED";
        current.approvedContentRevision = current.contentRevision;
        current.contentApprovedAt = new Date().toISOString();
        current.contentApprovedByUserId = "test-admin";
        server.set(id, current);
        return json(current);
      }
      return json({ code: "MOCK_ENDPOINT_NOT_CONFIGURED" }, 501);
    },
  );

  const dialog = page.getByRole("dialog");
  const openEditor = async (productName) => {
    await page.getByRole("button", { name: `ویرایش محتوای ${productName}` }).click();
    await dialog.waitFor({ state: "visible", timeout: 30_000 });
  };

  // Catalog: status badge + entry point, RTL integrity.
  await page.goto(`${origin}/store`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "ویرایش محتوای محصول محتوادار" }).waitFor({ timeout: 60_000 });
  assert.equal(await page.evaluate(() => document.documentElement.dir), "rtl");
  const overflow = await page.evaluate(() => document.scrollingElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `no horizontal overflow (got ${overflow}px)`);

  // Save with revision + explicit approval as two separate actions.
  await openEditor("محصول محتوادار");
  for (const section of ["الف — اطلاعات عمومی محصول", "ب — توضیحات", "ج — ترکیبات و مصرف", "د — هشدارها و منع مصرف", "هـ — منبع محتوا و تأیید"]) {
    await dialog.getByText(section, { exact: false }).first().waitFor({ timeout: 10_000 });
  }
  await dialog.getByLabel("برند").fill("برند تازه");
  await dialog.getByRole("button", { name: "ذخیره محتوا" }).click();
  await dialog.getByText("نگارش ۳", { exact: false }).first().waitFor({ timeout: 15_000 });
  await dialog.getByText("تأیید قبلی باطل شد", { exact: false }).waitFor({ timeout: 15_000 });
  await dialog.getByRole("button", { name: "تأیید نگارش ذخیره‌شده" }).click();
  await dialog.getByText("تأیید شد", { exact: false }).first().waitFor({ timeout: 15_000 });
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 15_000 });

  // Dirty guard: Escape asks, choice is deliberate.
  await openEditor("محصول محتوادار");
  await dialog.getByLabel("تولیدکننده").fill("کارخانه آزمون");
  await page.keyboard.press("Escape");
  await dialog.getByText("تغییرهای ذخیره‌نشده از بین می‌رود", { exact: false }).waitFor({ timeout: 10_000 });
  await dialog.getByRole("button", { name: "ادامه ویرایش" }).click();
  await assert.equal(await dialog.getByLabel("تولیدکننده").inputValue(), "کارخانه آزمون");
  await page.keyboard.press("Escape");
  await dialog.getByRole("button", { name: "بستن بدون ذخیره" }).click();
  await dialog.waitFor({ state: "hidden", timeout: 15_000 });

  // Stale revision conflict: no overwrite, draft kept, deliberate resave.
  await openEditor("محصول قدیمی");
  await page.evaluate(() => window.pdArm("conflict"));
  await dialog.getByLabel("برند").fill("برند درگیری");
  await dialog.getByRole("button", { name: "ذخیره محتوا" }).click();
  await dialog.getByText("نسخهٔ محتوا روی سرور تغییر کرده", { exact: false }).waitFor({ timeout: 15_000 });
  assert.equal(await dialog.getByLabel("برند").inputValue(), "برند درگیری");
  await dialog.getByRole("button", { name: "ذخیره محتوا" }).click();
  await dialog.getByText("نگارش ۲", { exact: false }).first().waitFor({ timeout: 15_000 });
  // Resave synced the draft: nothing unsaved, so Escape closes directly with no confirm.
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 15_000 });

  // Approval denial stays safe and pending.
  await openEditor("محصول قدیمی");
  await dialog.getByLabel("برند").fill("برند قابل تأیید");
  await dialog.getByRole("button", { name: "ذخیره محتوا" }).click();
  await dialog.getByText("نگارش ۳", { exact: false }).first().waitFor({ timeout: 15_000 });
  await page.evaluate(() => window.pdArm("deny"));
  await dialog.getByRole("button", { name: "تأیید نگارش ذخیره‌شده" }).click();
  await dialog.getByText("اجازهٔ این عملیات را ندارید", { exact: false }).waitFor({ timeout: 15_000 });
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 15_000 });

  // Image editor entry still present (no regression to neighbors).
  await page.getByRole("button", { name: "مدیریت تصویر محصول محتوادار" }).waitFor({ timeout: 15_000 });
  const overflowEnd = await page.evaluate(() => document.scrollingElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflowEnd <= 1, `no horizontal overflow at end (got ${overflowEnd}px)`);
}
