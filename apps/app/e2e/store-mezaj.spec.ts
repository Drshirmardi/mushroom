import { expect, test, type Page } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

const id = "ae679019-c5cf-406a-9623-757296e19a01";
const versionId = "ae679019-c5cf-406a-9623-757296e19a02";
const category = { id: "ae679019-c5cf-406a-9623-757296e19a03", name: "مراقبت", slug: "care", isActive: true, productCount: 1 };
const product = { id, title: "محصول انتخاب‌شدهٔ متخصص", slug: "synthetic-product", description: null, image: null, status: "ACTIVE", category, content: { status: "LEGACY_UNREVIEWED", contentRevision: 0, brand: null, manufacturer: null, description: null, shortDescription: null, ingredients: null, usageInstructions: null, warnings: null, contraindications: null, provenance: null, approvedContentRevision: null, contentApprovedAt: null, contentApprovedByUserId: null }, skus: [{ id: "sku-1", code: "SYNTHETIC", title: null, currentPriceToman: "125000", currentTaxToman: "0", isActive: true, onHandQuantity: 10, reservedQuantity: 0 }] };
const codes = ["damavi", "safravi", "balgami", "sodavi"];
async function api(page: Page, dashboard = false) {
  const origin = dashboard ? "http://localhost:3002" : "http://localhost:3001";
  let recommendation = { status: "READY", primary: "damavi", secondary: "safravi", items: [product] };
  let fail = false; let conflict = false;
  const rows = codes.flatMap(primary => codes.map(secondary => ({ primary, secondary, revision: 0, enabled: false, products: [] as { id: string; title: string }[], sources: [] as object[] })));
  const writes: { path: string; body: any }[] = []; const unexpected: string[] = [];
  await page.route("**/v1/**", async route => {
    const r = route.request(); const url = new URL(r.url()); const path = url.pathname;
    const headers = { "access-control-allow-origin": origin, "access-control-allow-credentials": "true", "access-control-allow-headers": "authorization,content-type,idempotency-key", "access-control-allow-methods": "GET,POST,PUT,OPTIONS" };
    const send = (body: unknown, status = 200) => route.fulfill({ status, headers, contentType: "application/json", body: JSON.stringify(body) });
    if (r.method() === "OPTIONS") { await route.fulfill({ status: 204, headers }); return; }
    if (path === "/v1/auth/refresh") { await send({ accessToken: "fixture-token", tokenType: "Bearer", expiresIn: 600, user: { id: dashboard ? "admin" : "patient", phone: "+989100000000", roles: [dashboard ? "ADMIN" : "PATIENT"] } }); return; }
    if (r.method() !== "GET") {
      if (dashboard && r.method() === "PUT" && path.startsWith("/v1/admin/commerce/mezaj/collections/")) {
        const body = r.postDataJSON(); writes.push({ path, body });
        if (conflict) { conflict = false; await send({ code: "COMMERCE_MEZAJ_CONFLICT" }, 409); return; }
        const [primary, secondary] = path.split("/").slice(-2); const row = rows.find(x => x.primary === primary && x.secondary === secondary)!;
        Object.assign(row, { revision: row.revision + 1, enabled: body.enabled, products: body.productIds.map((id: string) => ({ id, title: product.title })), sources: body.sources.map((s: object) => ({ ...s, versionTitle: "آزمون مزاج", versionNumber: 1, bandTitle: "نتیجهٔ ترکیبی آزمون" })) });
        await send(row); return;
      }
      unexpected.push(`${r.method()} ${path}`); await send({}, 403); return;
    }
    if (path.endsWith("/commerce/recommendations")) { await send(fail ? {} : recommendation, fail ? 503 : 200); return; }
    if (path === "/v1/commerce/products") { await send({ items: [{ ...product, id: "generic-product", title: "محصول عمومی فروشگاه" }], total: 1, page: 1, pageSize: 20 }); return; }
    if (path === "/v1/admin/commerce/mezaj/collections") { await send(rows); return; }
    if (path === "/v1/admin/commerce/mezaj/assessment-versions") { await send({ items: [{ id: versionId, title: "آزمون مزاج", versionNumber: 1, locale: "fa-IR", status: "PUBLISHED", resultBands: [{ id: "band-1", title: "نتیجهٔ ترکیبی آزمون" }] }], page: 1, pageSize: 20, total: 1 }); return; }
    if (path === "/v1/admin/commerce/products") { await send({ items: [product], page: 1, pageSize: 20, total: 1 }); return; }
    if (path === "/v1/admin/commerce/categories") { await send([category]); return; }
    if (path.endsWith("/cart") || path.endsWith("/wishlist") || path.endsWith("/notifications") || path === "/v1/content/banners") { await send({ items: [], total: 0 }); return; }
    if (path.endsWith("/commerce/addresses")) { await send([]); return; }
    await send({}, 503);
  });
  return { writes, unexpected, origin, recommend: (value: typeof recommendation) => { recommendation = value; }, fail: (value: boolean) => { fail = value; }, conflict: () => { conflict = true; } };
}

test("personal products precede the general catalog and preserve primary/secondary order", async ({ page }, info) => {
  const mock = await api(page); const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto(`${mock.origin}/store`);
  const section = page.getByRole("region", { name: "محصولات مرتبط با مزاج شما", exact: true });
  await expect(section).toContainText("مزاج اول دموی، مزاج دوم صفراوی");
  await expect(section.getByRole("heading", { name: product.title, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.querySelector(".store-personal")!.getBoundingClientRect().top < document.querySelector("#store-products")!.getBoundingClientRect().top)).toBeTruthy();
  await expect(page.locator("#store-products")).toContainText("محصول عمومی فروشگاه");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  await page.screenshot({ path: join(tmpdir(), `mezaj-store-${info.project.name}.png`) });
  mock.recommend({ status: "READY", primary: "safravi", secondary: "damavi", items: [product] }); await page.reload();
  await expect(section).toContainText("مزاج اول صفراوی، مزاج دوم دموی");
  expect(mock.unexpected).toEqual([]); expect(errors).toEqual([]);
});

test("no result, pending review and recommendation outage never become fabricated product matches", async ({ page }) => {
  const mock = await api(page);
  mock.recommend({ status: "NO_RESULT", primary: "", secondary: "", items: [] }); await page.goto(`${mock.origin}/store`);
  await expect(page.getByRole("link", { name: "شروع ارزیابی", exact: true })).toBeVisible(); await expect(page.locator(".store-personal")).toHaveCount(0);
  mock.recommend({ status: "REVIEW_REQUIRED", primary: "", secondary: "", items: [] }); await page.reload();
  await expect(page.getByText("برای پیشنهاد محصولات مرتبط، نتیجهٔ ارزیابی شما به بررسی متخصص نیاز دارد.", { exact: true })).toBeVisible();
  mock.fail(true); await page.reload();
  await expect(page.getByText("پیشنهادهای مرتبط با شما دریافت نشد.", { exact: true })).toBeVisible(); await expect(page.locator("#store-products")).toContainText("محصول عمومی فروشگاه");
  mock.fail(false); mock.recommend({ status: "READY", primary: "damavi", secondary: "safravi", items: [product] });
  await page.getByRole("complementary", { name: "پیشنهادهای مخصوص شما" }).getByRole("button", { name: "تلاش دوباره", exact: true }).click();
  await expect(page.locator(".store-personal")).toBeVisible(); expect(mock.writes).toEqual([]);
});

test("dashboard edits an exact ordered pair with real source, product membership and conflict recovery", async ({ page }, info) => {
  const mock = await api(page, true); const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto(`${mock.origin}/store`); await page.getByRole("button", { name: "پیشنهاد بر اساس مزاج", exact: true }).click();
  const section = page.getByRole("region", { name: "پیشنهاد محصولات برای ۱۶ ترکیب مزاج", exact: true });
  await expect(section.locator("table tbody button")).toHaveCount(16);
  await section.getByRole("button", { name: "مزاج اول دموی، مزاج دوم صفراوی", exact: true }).click();
  await section.getByRole("combobox", { name: "نسخهٔ آزمون", exact: true }).selectOption(versionId);
  await section.getByRole("combobox", { name: "نتیجه", exact: true }).selectOption("band-1");
  await section.getByRole("button", { name: "افزودن ارتباط نتیجه", exact: true }).click();
  await section.getByRole("button", { name: `افزودن ${product.title}`, exact: true }).click();
  await section.getByRole("checkbox", { name: "نمایش این پیشنهادها در فروشگاه", exact: true }).check();
  await section.getByRole("button", { name: "ذخیرهٔ تنظیمات این ترکیب", exact: true }).click();
  await expect(section.getByText("تنظیمات این ترکیب ذخیره شد.", { exact: true })).toBeVisible();
  expect(mock.writes[0]).toEqual({ path: "/v1/admin/commerce/mezaj/collections/damavi/safravi", body: { expectedRevision: 0, enabled: true, productIds: [id], sources: [{ assessmentVersionId: versionId, resultBandId: "band-1" }] } });
  await expect(section.getByRole("button", { name: "مزاج اول دموی، مزاج دوم صفراوی", exact: true })).toContainText("فعال");
  await expect(section.getByRole("button", { name: "مزاج اول صفراوی، مزاج دوم دموی", exact: true })).toContainText("غیرفعال");
  await section.getByRole("checkbox", { name: "نمایش این پیشنهادها در فروشگاه", exact: true }).uncheck(); mock.conflict();
  await section.getByRole("button", { name: "ذخیرهٔ تنظیمات این ترکیب", exact: true }).click();
  await expect(section.getByRole("alert")).toContainText("اطلاعات تغییر کرده");
  await expect(section.getByRole("button", { name: `حذف محصول ${product.title}`, exact: true })).toBeVisible();
  await section.getByRole("button", { name: "لغو تغییرها و بازخوانی", exact: true }).click();
  await expect(section.getByRole("checkbox", { name: "نمایش این پیشنهادها در فروشگاه", exact: true })).toBeChecked();
  await section.getByRole("button", { name: "مزاج اول سوداوی، مزاج دوم سوداوی", exact: true }).click();
  await expect(section.getByRole("heading", { name: "مزاج اول سوداوی، مزاج دوم سوداوی", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  await page.screenshot({ path: join(tmpdir(), `mezaj-dashboard-${info.project.name}.png`) });
  expect(mock.unexpected).toEqual([]); expect(errors).toEqual([]);
});
