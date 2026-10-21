import { expect, test, type Page } from "@playwright/test";

const origin = "http://localhost:3001";
const product = (id: string, title = `کالای ${id}`) => ({ id, title, slug: id, image: null, category: { id: "category", name: "سلامت", slug: "health" }, skus: [{ id: `sku-${id}`, code: id, currentPriceToman: "125000", currentTaxToman: "0" }] });
const addresses = [
  { id: "home", label: "خانه", recipientName: "گیرنده آزمایشی", phone: "09120000000", province: "تهران", city: "تهران", line1: "نشانی اول", isDefault: true },
  { id: "work", label: "محل کار", recipientName: "گیرنده آزمایشی", phone: "09120000000", province: "فارس", city: "شیراز", line1: "نشانی دوم", isDefault: false },
];

async function mockApi(page: Page) {
  let releaseOld = () => {};
  const oldGate = new Promise<void>(resolve => { releaseOld = resolve; });
  const writes: string[] = [];
  const requests: string[] = [];
  await page.route("**/v1/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    requests.push(url.toString());
    const headers = { "access-control-allow-origin": origin, "access-control-allow-credentials": "true" };
    if (request.method() === "OPTIONS") { await route.fulfill({ status: 204, headers: { ...headers, "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS", "access-control-allow-headers": "authorization, content-type, idempotency-key" } }); return; }
    if (request.method() !== "GET" && path !== "/v1/auth/refresh") {
      writes.push(`${request.method()} ${path}`);
      await route.fulfill({ status: 403, headers, contentType: "application/json", body: "{}" }); return;
    }
    let body: unknown;
    if (path === "/v1/auth/refresh") body = { accessToken: "store-fixture-token", tokenType: "Bearer", expiresIn: 600, user: { id: "store-fixture-patient", roles: ["PATIENT"] } };
    else if (path === "/v1/commerce/products") {
      const query = url.searchParams.get("query");
      if (query === "قدیمی") await oldGate;
      if (query === "خطا") { await route.fulfill({ status: 503, headers, contentType: "application/json", body: "{}" }); return; }
      const pageNumber = Number(url.searchParams.get("page") ?? "1");
      const items = query ? [product(query, `نتیجهٔ ${query}`)] : Array.from({ length: Math.min(20, Math.max(0, 45 - (pageNumber - 1) * 20)) }, (_, i) => product(String((pageNumber - 1) * 20 + i)));
      body = { items, total: query ? 1 : 45, page: pageNumber, pageSize: 20 };
    } else if (path.endsWith("/commerce/addresses")) body = addresses;
    else if (path.endsWith("/shipping-options")) body = [{ method: "PICKUP", amountToman: "0" }, { method: "COURIER", amountToman: "25000" }];
    else if (path.endsWith("/cart")) body = { items: [{ id: "item", quantity: 1, sku: product("0").skus[0], product: product("0") }] };
    else if (path.endsWith("/wallet")) body = { patientId: "store-fixture-patient", currency: "IRR", balanceRial: "19000000", version: 1, frozen: false, asOf: "2026-10-20T10:00:00Z" };
    else if (path.endsWith("/wallet/transactions")) body = { items: [], total: 0, page: 1, pageSize: 20 };
    else if (path.endsWith("/wishlist") || path.endsWith("/notifications")) body = { items: [], total: 0, page: 1, pageSize: 20 };
    else if (path === "/v1/patients/me") body = { firstName: "کاربر", lastName: "آزمایشی", phone: "09120000000", accountStatus: "ACTIVE" };
    else { await route.fulfill({ status: 503, headers, contentType: "application/json", body: "{}" }); return; }
    await route.fulfill({ status: 200, headers, contentType: "application/json", body: JSON.stringify(body) });
  });
  return { releaseOld, writes, requests };
}

test("real catalog is accessible across pages and stale search cannot replace current results", async ({ page }) => {
  const mock = await mockApi(page);
  try {
    await page.goto(`${origin}/store`);
    await expect(page.locator(".store-product")).toHaveCount(8);
    await expect(page.locator(".store-offer,.store-offers__timer,.store-promo")).toHaveCount(0);
    await page.getByRole("button", { name: "مشاهده همهٔ محصولات فروشگاه", exact: true }).click();
    await expect(page.locator(".store-product")).toHaveCount(20);
    await expect(page.locator(".store-pagination")).toContainText("۴۵ محصول");
    const next = page.getByRole("navigation", { name: "صفحه‌بندی" }).getByRole("button", { name: "بعدی", exact: true });
    await next.click();
    await expect(page.getByRole("heading", { name: "کالای 20", exact: true })).toBeVisible();
    await expect(page.locator("#store-products")).toBeFocused();
    await next.click();
    await expect(page.locator(".store-product")).toHaveCount(5);
    await expect(next).toBeDisabled();
    const oldRequest = page.waitForRequest(r => new URL(r.url()).searchParams.get("query") === "قدیمی");
    await page.locator("#store-search").fill("قدیمی");
    await oldRequest;
    await page.locator("#store-search").fill("جدید");
    await expect(page.getByRole("heading", { name: "نتیجهٔ جدید", exact: true })).toBeVisible();
    const oldResponse = page.waitForResponse(r => new URL(r.url()).searchParams.get("query") === "قدیمی");
    mock.releaseOld();
    await (await oldResponse).finished();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.getByRole("heading", { name: "نتیجهٔ جدید", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "نتیجهٔ قدیمی", exact: true })).toHaveCount(0);
    expect(mock.requests.some(value => new URL(value).searchParams.get("page") === "3")).toBeTruthy();
    await page.locator("#store-search").fill("خطا");
    await expect(page.locator(".store-state--error")).toBeVisible();
    await expect(page.locator(".store-offer")).toHaveCount(0);
    expect(mock.writes).toEqual([]);
  } finally { mock.releaseOld(); }
});

test("address modal contains focus and the validated selection reaches checkout", async ({ page }) => {
  const mock = await mockApi(page);
  await page.goto(`${origin}/store`);
  const trigger = page.locator(".store-delivery");
  await expect(trigger).toContainText("نشانی اول");
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "انتخاب آدرس" });
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate(e => e.contains(document.activeElement))).toBeTruthy();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest("dialog"))).toBeTruthy();
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button").filter({ hasText: "محل کار" }).click();
  await expect(trigger).toContainText("نشانی دوم");
  await page.goto(`${origin}/store/checkout`);
  await page.getByRole("radio", { name: /ارسال با پیک/ }).check();
  await expect(page.locator('input[name="address"]:checked').locator("..")).toContainText("نشانی دوم");
  await page.locator('input[name="address"]').first().check();
  await page.goto(`${origin}/store`);
  await expect(trigger).toContainText("نشانی اول");
  await page.evaluate(() => localStorage.setItem("store-delivery-address:store-fixture-patient", "deleted-or-foreign"));
  await page.goto(`${origin}/store/checkout`);
  await page.getByRole("radio", { name: /ارسال با پیک/ }).check();
  await expect(page.locator('input[name="address"]:checked').locator("..")).toContainText("نشانی اول");
  expect(mock.writes).toEqual([]);
});

test("shared modal keeps notifications, top-up and unsaved address confirmation usable", async ({ page }) => {
  const mock = await mockApi(page);
  await page.goto(origin);
  const notifications = page.getByRole("button", { name: "اعلان‌ها", exact: true });
  await notifications.click();
  await expect(page.locator("dialog:modal")).toHaveCount(1);
  await expect(page.getByRole("dialog", { name: "اعلان‌ها" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).toHaveCount(0);
  await expect(notifications).toBeFocused();
  await page.goto(`${origin}/profile/wallet`);
  await page.getByRole("button", { name: "افزایش موجودی", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "افزایش موجودی" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.goto(`${origin}/profile/addresses`);
  await page.getByRole("button", { name: /افزودن آدرس|آدرس جدید/ }).first().click();
  await expect(page.locator("dialog:modal")).toHaveCount(1);
  await page.locator("#profile-address-phone").fill("09120000000");
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog:modal")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: /اطلاعات ناقص/ })).toBeVisible();
  expect(mock.writes).toEqual([]);
});
