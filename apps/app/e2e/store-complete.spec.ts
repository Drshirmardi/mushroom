import { expect, test, type Page } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

const origin = "http://localhost:3001";
const productId = "bd904d31-442e-45c1-af10-636c967cc381";
const categoryId = "968fc43a-77c6-47ac-b88e-0f9ca86f2146";
const product = { id: productId, title: "شامپو مراقبت مو", slug: "hair-care", image: null, category: { id: categoryId, name: "مراقبت مو", slug: "hair" }, description: "مشخصات واقعی محصول از سرویس فروشگاه دریافت می‌شود.", skus: [
  { id: "small", title: "۱۲۵ میلی‌لیتر", code: "HAIR-125", currentPriceToman: "125000", currentTaxToman: "5000" },
  { id: "large", title: "۲۵۰ میلی‌لیتر", code: "HAIR-250", currentPriceToman: "250000", currentTaxToman: "10000" },
] };
const home = { id: "home", label: "خانه", recipientName: "گیرنده آزمایشی", phone: "09120000000", province: "تهران", city: "تهران", line1: "نشانی اول", isDefault: true };

async function fixture(page: Page, options: { failedAccount?: boolean; paid?: boolean; unavailable?: boolean; banners?: boolean } = {}) {
  let quantity = 0;
  let skuId = "large";
  let saved = false;
  let paid = options.paid ?? false;
  let failedAccount = options.failedAccount ?? false;
  const addresses = [home];
  const commands: { path: string; body: any; key: string | undefined }[] = [];
  const unexpected: string[] = [];
  const cart = () => ({ items: quantity ? [{ id: "cart-line", quantity, product, sku: product.skus.find(s => s.id === skuId) }] : [] });
  const order = () => ({ id: "order-1", orderNumber: "1024", status: paid ? "PAID" : "PENDING_PAYMENT", paymentStatus: paid ? "VERIFIED" : "PENDING", paymentMethod: paid ? "WALLET" : null, shippingMethod: "COURIER", shippingAddress: addresses[addresses.length - 1], subtotalAmountToman: "500000", taxAmountToman: "20000", discountAmountToman: "25000", shippingAmountToman: "25000", totalAmountToman: "520000", lines: [{ productTitle: product.title, skuCode: "HAIR-250", quantity: 2, unitPriceToman: "250000", unitTaxToman: "10000", lineTotalToman: "520000" }], refundStatuses: [], createdAt: "2026-10-20T10:00:00Z" });
  const intent = () => ({ id: "intent-1", purpose: "ORDER", status: paid ? "PAID" : "PENDING", method: paid ? "WALLET" : null, amountRial: "5200000", currency: "IRR", orderId: "order-1", appointmentId: null, expiresAt: null, paidAt: paid ? "2026-10-20T10:00:00Z" : null, createdAt: "2026-10-20T10:00:00Z", methods: [{ code: "WALLET", available: !options.unavailable, balanceRial: options.unavailable ? "100000" : "19000000" }, { code: "GATEWAY", available: false }] });
  await page.route("**/v1/**", async route => {
    const request = route.request(); const path = new URL(request.url()).pathname; const method = request.method();
    const headers = { "access-control-allow-origin": origin, "access-control-allow-credentials": "true", "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS", "access-control-allow-headers": "authorization, content-type, idempotency-key" };
    const send = (body: unknown, status = 200) => route.fulfill({ status, headers, contentType: "application/json", body: JSON.stringify(body) });
    if (method === "OPTIONS") { await route.fulfill({ status: 204, headers }); return; }
    if (path === "/v1/auth/refresh") { await send({ accessToken: "fixture-token", tokenType: "Bearer", expiresIn: 600, user: { id: "fixture-patient", roles: ["PATIENT"] } }); return; }
    if (path === "/v1/patients/me/entry") { await send({ required: false, phase: "COMPLETE" }); return; }
    if (method !== "GET") {
      const body = request.postDataJSON();
      if (path.endsWith("/commerce/discount-preview")) { await send(body.discountCode === "INVALID" ? {code:"COMMERCE_DISCOUNT_NOT_FOUND"} : {code:body.discountCode,subtotalAmountToman:"500000",taxAmountToman:"20000",discountAmountToman:"25000"},body.discountCode === "INVALID" ? 422 : 200); return; }
      commands.push({ path, body, key: request.headers()["idempotency-key"] });
      if (path.endsWith("/cart") && method === "PUT") { quantity = body.quantity; skuId = body.skuId; await send(cart()); return; }
      if (path.endsWith("/wishlist") && method === "PUT") { saved = body.saved; await send({ items: saved ? [{ id: "wish-1", product, sku: product.skus[1] }] : [] }); return; }
      if (path.endsWith("/commerce/addresses") && method === "POST") { const address = { ...body, id: "new-address", isDefault: false }; addresses.push(address); await send(address); return; }
      if (path === "/v1/patients/me/orders" && method === "POST") {
        if (body.discountCode === "INVALID") { await send({ code: "COMMERCE_DISCOUNT_NOT_FOUND" }, 422); return; }
        quantity = 0; await send(order()); return;
      }
      if (path.endsWith("/billing/order-intents")) { await send(intent()); return; }
      if (path.endsWith("/intent-1/wallet-payment")) { paid = true; await send(intent()); return; }
      unexpected.push(`${method} ${path}`); await send({}, 403); return;
    }
    if (path === "/v1/commerce/products") { const url = new URL(request.url()); await send({ items: [product], total: 1, page: Number(url.searchParams.get("page") ?? 1), pageSize: 20 }); }
    else if (path === `/v1/commerce/products/${productId}`) await send(product);
    else if (path.endsWith("/commerce/addresses")) await send(addresses);
    else if (path.endsWith("/shipping-options")) await send([{ method: "PICKUP", amountToman: "0" }, { method: "COURIER", amountToman: "25000" }]);
    else if (path.endsWith("/cart")) await send(failedAccount ? {} : cart(), failedAccount ? 503 : 200);
    else if (path.endsWith("/wishlist")) await send({ items: saved ? [{ id: "wish-1", product, sku: product.skus[1] }] : [] });
    else if (path === "/v1/patients/me/orders") await send([order()]);
    else if (path === "/v1/patients/me/orders/order-1") await send(order());
    else if (path.endsWith("/order-1/receipt")) await send(paid ? { orderId:"order-1", orderNumber:"1024", totalAmountToman:"520000", status:"VERIFIED", order: order(), verifiedAt: "2026-10-20T10:00:00Z", method: "WALLET" } : {}, paid ? 200 : 409);
    else if (path.endsWith("/billing/intents/intent-1")) await send(intent());
    else if (path === "/v1/patients/me") await send({ firstName: "کاربر", lastName: "آزمایشی", phone: "09120000000", accountStatus: "ACTIVE" });
    else if (path === "/v1/content/banners") await send({ items: options.banners ? [1, 2].map(id => ({ id: String(id), title: `بنر ${id}`, contentPath: `/v1/content/banners/${id}/image`, destinationUrl: "/store?view=all" })) : [] });
    else if (/\/content\/banners\/\d\/image$/.test(path)) await route.fulfill({ status: 200, headers, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><rect width="1200" height="600" fill="#f0f6fa"/></svg>' });
    else if (path.endsWith("/notifications")) await send({ items: [], total: 0 });
    else await send({}, 503);
  });
  return { commands, unexpected, recover: () => { failedAccount = false; } };
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
}

test("selected SKU, favorites, cart, Persian address, totals and wallet receipt form one usable purchase", async ({ page }, testInfo) => {
  const mock = await fixture(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${origin}/store?view=all&q=شامپو`);
  await expect(page.locator("#store-search")).toHaveValue("شامپو");
  await page.locator(".store-product").first().getByRole("link").first().click();
  await expect(page.locator("#product-variant")).toHaveValue("small");
  await page.locator("#product-variant").selectOption("large");
  await expect(page).toHaveURL(/sku=large/);
  await expect(page.locator(".store-unit-price")).toContainText("۲۵۰٬۰۰۰");
  await expect(page.locator(".store-facts")).toContainText("HAIR-250");
  await expect(page.getByRole("navigation", { name: "ناوبری اصلی" })).toHaveCount(0);
  await page.getByRole("button", { name: "افزودن به علاقه‌مندی‌ها", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "حذف از علاقه‌مندی‌ها", exact: true }).first()).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "افزودن به سبد", exact: true }).click();
  await page.getByRole("button", { name: `افزایش تعداد ${product.title}`, exact: true }).click();
  await expect(page.locator(".store-purchase-bar__price")).toContainText("۵۰۰٬۰۰۰");
  await noOverflow(page);
  await page.screenshot({ path: join(tmpdir(), `store-product-${testInfo.project.name}.png`), fullPage: true });
  await page.goto(`${origin}/store/wishlist`);
  await expect(page.locator(".store-product")).toHaveCount(1);
  await expect(page.locator(".store-product a").first()).toHaveAttribute("href", /sku=large/);
  await page.goto(`${origin}/store/cart`);
  await expect(page.locator(".store-cart-item")).toContainText("۲۵۰ میلی‌لیتر");
  await expect(page.locator('[aria-label="خلاصهٔ سبد"]')).toContainText("۵۲۰٬۰۰۰");
  await noOverflow(page);
  await page.goto(`${origin}/store/checkout`);
  await page.getByRole("radio", { name: /ارسال با پیک/ }).check();
  await page.getByRole("button", { name: "افزودن آدرس", exact: true }).click();
  const form = page.getByRole("dialog", { name: "آدرس جدید" });
  await expect(form).toBeVisible();
  for (const [key, value] of Object.entries({ label: "دفتر", recipientName: "کاربر آزمایشی", phone: "۰۹۱۲۳۴۵۶۷۸۹", province: "تهران", city: "تهران", line1: "خیابان آزمایشی، پلاک ۲", postalCode: "۱۲۳۴۵۶۷۸۹۰" })) await form.locator(`#profile-address-${key}`).fill(value);
  await form.getByRole("button", { name: "ذخیره آدرس", exact: true }).click();
  await expect(form).toHaveCount(0);
  await expect(page.locator('input[name="address"]:checked').locator("..")).toContainText("دفتر");
  expect(mock.commands.find(command => command.path.endsWith("/commerce/addresses"))?.body).toMatchObject({ phone: "09123456789", postalCode: "1234567890" });
  await page.locator("#checkout-discount").fill("INVALID");
  await page.getByRole("button", { name: "اعمال کد", exact: true }).click();
  await expect(page.locator("#checkout-discount-feedback")).toContainText("کد تخفیف معتبر نیست");
  await page.locator("#checkout-discount").fill("SAVE25");
  await page.getByRole("button", { name: "اعمال کد", exact: true }).click();
  await expect(page.locator("#checkout-discount-feedback")).toContainText("۲۵٬۰۰۰ تومان");
  await noOverflow(page);
  await page.screenshot({ path: join(tmpdir(), `store-checkout-${testInfo.project.name}.png`), fullPage: true });
  await page.getByRole("button", { name: "ثبت سفارش و ادامهٔ پرداخت", exact: true }).click();
  await expect(page).toHaveURL(/store\/payment\?orderId=order-1/);
  const pay = page.getByRole("button", { name: /پرداخت از کیف پول/ });
  await expect(pay).toBeEnabled();
  await expect(page.getByRole("button", { name: /پرداخت بانکی/ })).toBeDisabled();
  await expect(page.getByRole("region", { name: "مبلغ قابل پرداخت" })).toContainText("۵۲۰٬۰۰۰");
  await page.screenshot({ path: join(tmpdir(), `store-payment-${testInfo.project.name}.png`), fullPage: true });
  await pay.click();
  await page.getByRole("dialog", { name:"تأیید پرداخت از کیف پول" }).getByRole("button",{name:"تأیید پرداخت",exact:true}).click();
  await expect(page).toHaveURL(/store\/order-success\?orderId=order-1/);
  await expect(page.getByRole("dialog")).toContainText("۵۲۰٬۰۰۰");
  await page.getByRole("dialog").getByRole("button", { name: "پیگیری سفارش", exact: true }).click();
  await expect(page.getByText("HAIR-250", { exact: false })).toBeVisible();
  await noOverflow(page);
  await page.goto(`${origin}/store/orders`);
  await expect(page.getByRole("link", { name: /سفارش ۱۰۲۴/ })).toBeVisible();
  const checkout = mock.commands.filter(command => command.path === "/v1/patients/me/orders").at(-1);
  expect(checkout?.body).toEqual({ shippingMethod: "COURIER", addressId: "new-address", discountCode: "SAVE25" });
  expect(checkout?.key).toBeTruthy();
  const intentKeys = mock.commands.filter(command => command.path.endsWith("/order-intents")).map(command => command.key);
  expect(new Set(intentKeys).size).toBe(1);
  expect(mock.commands.filter(command => command.path.endsWith("/wallet-payment"))).toHaveLength(1);
  expect(mock.unexpected).toEqual([]);
  expect(errors).toEqual([]);
});

test("server payment state wins over success URL, and unavailable methods remain unavailable", async ({ page }) => {
  const mock = await fixture(page, { unavailable: true });
  await page.goto(`${origin}/store/order-success?orderId=order-1&status=success`);
  await expect(page.getByText("در انتظار پرداخت", { exact: true })).toBeVisible();
  await expect(page.getByText("رسید پرداخت", { exact: true })).toHaveCount(0);
  await page.goto(`${origin}/store/payment?intentId=intent-1`);
  await expect(page.getByRole("region", { name: "جزئیات مبلغ سفارش" })).toContainText(product.title);
  await expect(page.getByRole("button", { name: /پرداخت از کیف پول/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /پرداخت بانکی/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /افزایش موجودی کیف پول/ })).toBeVisible();
  await noOverflow(page);
  expect(mock.unexpected).toEqual([]);
});

test("published banners are compact, precede products and stay manual on resize", async ({ page }) => {
  await fixture(page, { banners: true });
  await page.goto(`${origin}/store`);
  const hero = page.getByRole("region", { name: "بنرهای فروشگاه" });
  const next = hero.getByRole("button", { name: "بنر بعدی", exact: true });
  await expect(next).toBeVisible();
  await next.focus();
  const selected = () => hero.locator('[aria-current="true"]').getAttribute("aria-label");
  const first = await selected();
  await page.waitForTimeout(4500);
  expect(await selected()).toBe(first);
  await next.click();
  await expect.poll(selected).not.toBe(first);
  const second = await selected();
  await page.waitForTimeout(4500);
  expect(await selected()).toBe(second);
  for (const size of [{width:1440,height:900,max:280},{width:375,height:812,max:160},{width:320,height:568,max:160},{width:667,height:375,max:120}]) {
    await page.setViewportSize(size);
    await expect.poll(async () => (await hero.locator('img').first().boundingBox())!.height).toBeLessThanOrEqual(size.max);
    await expect.poll(async () => Math.abs((await hero.locator('.store-hero__slide').first().boundingBox())!.width - (await hero.locator('.store-banner-track').boundingBox())!.width)).toBeLessThan(2);
    expect(await hero.evaluate(e=>e.getBoundingClientRect().top < document.querySelector('#store-products')!.getBoundingClientRect().top)).toBeTruthy();
    await noOverflow(page);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await hero.getByRole('button',{name:'بنر قبلی',exact:true}).click();
  await expect.poll(selected).toBe(first);
  await expect(hero.getByRole("button", { name: /نمایش خودکار بنرها/ })).toHaveCount(0);
  await noOverflow(page);
});

test("catalog keeps URL filters through product navigation, exposes account failure and fits narrow viewports", async ({ page }, testInfo) => {
  const mock = await fixture(page, { failedAccount: true });
  await page.goto(`${origin}/store?view=all&q=شامپو`);
  await expect(page.locator("#store-search")).toHaveValue("شامپو");
  await expect(page.getByText(/سبد و علاقه‌مندی‌ها دریافت نشدند/).first()).toBeVisible();
  mock.recover();
  await page.getByRole("button", { name: /دریافت دوباره/ }).first().click();
  await page.locator(".store-product a").first().click();
  await expect(page.locator("#product-variant")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#store-search")).toHaveValue("شامپو");
  await page.getByRole("link", { name: "مراقبت مو", exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`category=${categoryId}`));
  await expect(page.getByText("نمایش یک دستهٔ محصول", { exact: true })).toBeVisible();
  for (const width of [320, 390, 844, 1280]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
    await noOverflow(page);
  }
  await page.screenshot({ path: join(tmpdir(), `store-catalog-${testInfo.project.name}.png`), fullPage: true });
  expect(mock.unexpected).toEqual([]);
});


test("product loading reserves gallery and purchase footer on a small phone", async ({ page }) => {
  await fixture(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release=resolve; });
  await page.route(`**/v1/commerce/products/${productId}`, async route => { await pending; await route.fallback(); });
  await page.setViewportSize({width:320,height:568});
  try {
    await page.goto(`${origin}/store/products/${productId}`);
    await expect(page.locator('[data-product-loading]')).toBeVisible();
    const gallery=await page.locator('.store-gallery').boundingBox();
    const footer=await page.locator('.patient-shell-footer').boundingBox();
    release();
    await expect(page.locator('.store-detail__title')).toBeVisible();
    expect((await page.locator('.store-gallery').boundingBox())!.y).toBeCloseTo(gallery!.y,0);
    expect((await page.locator('.patient-shell-footer').boundingBox())!.height).toBeCloseTo(footer!.height,0);
    await page.setViewportSize({width:667,height:375});
    await expect.poll(async ()=>(await page.locator('.store-gallery').boundingBox())!.height).toBeLessThanOrEqual(106);
    await noOverflow(page);
  } finally { release(); }
});
