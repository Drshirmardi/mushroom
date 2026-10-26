import assert from "node:assert/strict";

// Deterministic API interception only. No real API, bucket, credentials or database is used.
export async function verifyProductImageBrowser(page, { keyboardPicker = true } = {}) {
  const context = page.context();
  await context.unroute("**/v1/**");
  const origin = "http://127.0.0.1:3102";
  const productId = "00000000-0000-4000-8000-000000000002";
  const secondId = "00000000-0000-4000-8000-000000000003";
  const category = { id: "00000000-0000-4000-8000-000000000001", name: "مکمل", slug: "supplement", isActive: true, productCount: 2 };
  const products = [productId, secondId].map((id, index) => ({ id, title: index ? "محصول دوم" : "محصول آزمون تصویر", slug: `media-test-${index}`, description: null, status: "DRAFT", category, skus: [] }));
  const webp = Buffer.from("UklGRjQAAABXRUJQVlA4ICgAAABwAQCdASoCAAIAAUAmJaACdAF1AAD+7QctcXNkRR/8pX/xu/3ZcwgA", "base64");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGJkAAAAASUVORK5CYII=", "base64");
  const selected = { name: "product-photo.png", mimeType: "image/png", buffer: png };
  const allow = { "access-control-allow-origin": origin, "access-control-allow-credentials": "true", "access-control-expose-headers": "ETag" };
  const current = new Map([[productId, null], [secondId, null]]);
  const operations = new Map();
  const mutations = [];
  let refreshes = 0; let writes = 0; let deletes = 0; let previews = 0; let sequence = 0;
  let mode = "success";
  let releaseUpload;
  let pendingUpload;
  const nextImage = id => ({ id: `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`, contentPath: `/v1/admin/commerce/products/${id}/image/content`, mimeType: "image/webp", sizeBytes: webp.length, width: 2, height: 2, altText: "عکس محصول" });
  const etag = id => current.get(id) ? `"${current.get(id).id}"` : '"none"';
  await page.addInitScript(() => {
    window.__mediaUrls = { created: [], revoked: [] };
    const create = URL.createObjectURL.bind(URL); const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = create(blob); window.__mediaUrls.created.push(url); return url; };
    URL.revokeObjectURL = url => { window.__mediaUrls.revoked.push(url); revoke(url); };
  });
  await context.route("**/v1/**", async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    const json = (body, status = 200, headers = {}) => route.fulfill({ status, headers: { ...allow, "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { ...allow, "access-control-allow-methods": "GET,PUT,DELETE,OPTIONS", "access-control-allow-headers": "authorization,if-match,idempotency-key,content-type" } });
    if (path === "/v1/auth/refresh") return json({ accessToken: `mock-session-${++refreshes}`, tokenType: "Bearer", expiresIn: 600, user: { id: "test-admin", phone: "+989100000000", roles: ["ADMIN"] } });
    if (path.endsWith("/commerce/categories")) return json([category]);
    if (path.endsWith("/commerce/products")) return json({ items: products.map(product => ({ ...product, image: current.get(product.id) })), page: 1, pageSize: 100, total: 2 });
    if (path.endsWith("/shipping-rates/courier")) return json({ amountToman: "20000", isActive: true });
    const match = path.match(/\/commerce\/products\/([^/]+)\/image(\/content)?$/);
    if (!match) return json({ code: "MOCK_ENDPOINT_NOT_CONFIGURED" }, 501);
    const id = match[1]; const headers = request.headers();
    assert.match(headers.authorization ?? "", /^Bearer mock-session-\d+$/);
    if (match[2]) { previews++; return route.fulfill({ status: 200, headers: { ...allow, "content-type": "image/webp", "cache-control": "no-store" }, body: webp }); }
    if (request.method() === "GET") return json(current.get(id), 200, { etag: etag(id) });
    const key = headers["idempotency-key"];
    assert.ok(key); assert.ok(headers["if-match"]?.startsWith('"'));
    mutations.push({ method: request.method(), productId: id, key, etag: headers["if-match"] });
    if (request.method() === "DELETE") {
      deletes++; current.set(id, null);
      return route.fulfill({ status: 204, headers: { ...allow, etag: '"none"' } });
    }
    assert.equal(request.method(), "PUT");
    assert.match(headers["content-type"], /^multipart\/form-data; boundary=/);
    const body = request.postDataBuffer().toString("utf8");
    const fields = [...body.matchAll(/Content-Disposition: form-data; name="([^"]+)"/g)].map(value => value[1]).sort();
    assert.deepEqual(fields, ["altText", "file"]);
    assert.match(body, /filename="product-photo\.png"/);
    assert.ok(body.includes("عکس محصول"));
    if (mode === "conflict") { mode = "success"; current.set(id, nextImage(id)); return json({ code: "COMMERCE_IMAGE_REVISION_CONFLICT" }, 412); }
    if (operations.has(key)) return json(operations.get(key));
    assert.equal(headers["if-match"], etag(id));
    if (mode === "hold") {
      pendingUpload = true;
      await new Promise(resolve => { releaseUpload = resolve; });
    }
    const image = nextImage(id); current.set(id, image); operations.set(key, image); writes++;
    if (mode === "lost") { mode = "success"; return route.abort("connectionreset"); }
    return json(image);
  });
  const open = async (title = "محصول آزمون تصویر") => {
    await page.getByRole("button", { name: `مدیریت تصویر ${title}`, exact: true }).click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "دریافت وضعیت تازه", exact: true }).waitFor({ state: "visible" });
    await page.waitForFunction(() => !document.querySelector('dialog [role="status"]')?.textContent?.includes("در حال دریافت"));
  };
  const choose = async () => {
    await page.locator('dialog input[type="file"]').setInputFiles(selected);
    await page.getByText("پیش‌نمایش محلی؛ هنوز ذخیره نشده", { exact: true }).waitFor();
    await page.getByLabel("متن جایگزین (اختیاری)", { exact: true }).fill("عکس محصول");
  };
  const saved = async () => {
    await page.getByText("تصویر از سرور تأیید و ذخیره شد.", { exact: true }).waitFor();
    assert.equal(await page.locator('dialog img[alt="عکس محصول"]').count(), 1);
    await page.waitForFunction(() => document.querySelector('dialog img[alt="عکس محصول"]')?.naturalWidth > 0);
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  // Install Date mocking before the session manager captures its clock function.
  await page.clock.setFixedTime(new Date());
  await page.goto(`${origin}/store`);
  await open(); await page.getByText("این محصول تصویر ذخیره‌شده ندارد.", { exact: true }).waitFor();
  assert.equal(await page.getByRole("dialog").getAttribute("dir"), "rtl");
  // Native picker is provided by Uppy's headless dropzone and is keyboard operable.
  const zone = page.getByRole("button", { name: "انتخاب تصویر یا کشیدن و رها کردن فایل", exact: true });
  await zone.focus();
  if (keyboardPicker) { const chooser = page.waitForEvent("filechooser"); await zone.press("Enter"); await (await chooser).setFiles(selected); }
  else await page.locator('dialog input[type="file"]').setInputFiles(selected);
  await page.waitForFunction(() => document.querySelector('dialog img[alt="پیش‌نمایش تصویر انتخاب‌شده"]')?.naturalWidth > 0);
  await page.getByLabel("متن جایگزین (اختیاری)", { exact: true }).fill("عکس محصول");
  mode = "hold";
  await page.getByRole("button", { name: "آپلود تصویر", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('dialog [role="progressbar"]') !== null);
  const waitUntil = Date.now() + 10_000;
  while (!pendingUpload) { assert.ok(Date.now() < waitUntil, "Upload request did not reach the mocked API"); await new Promise(resolve => setTimeout(resolve, 20)); }
  assert.equal(await page.getByRole("button", { name: "بستن ویرایشگر تصویر", exact: true }).isDisabled(), true);
  assert.equal(await page.getByText("تصویر از سرور تأیید و ذخیره شد.", { exact: true }).count(), 0);
  mode = "success"; releaseUpload(); await saved();
  const first = mutations[0]; assert.equal(first.etag, '"none"');

  await choose(); await page.getByRole("button", { name: "حذف فایل از انتخاب", exact: true }).click();
  assert.equal(deletes, 0); assert.equal(await page.getByRole("button", { name: "حذف تصویر ذخیره‌شده", exact: true }).count(), 1);
  await choose(); await page.getByRole("button", { name: "جایگزینی تصویر", exact: true }).click(); await saved();
  assert.notEqual(mutations[1].key, first.key); assert.notEqual(mutations[1].etag, '"none"');

  await choose(); mode = "conflict";
  await page.getByRole("button", { name: "جایگزینی تصویر", exact: true }).click();
  await page.getByText("تصویر یا وضعیت عملیات تغییر کرده است؛ نسخهٔ تازه را بررسی کنید و برای تغییر دوباره اقدام کنید.", { exact: true }).waitFor();
  const conflicted = mutations.at(-1); const conflictCount = mutations.length;
  await page.getByRole("button", { name: "ارسال با نسخهٔ تازه", exact: true }).click(); await saved();
  assert.equal(mutations.length, conflictCount + 1); assert.notEqual(mutations.at(-1).key, conflicted.key); assert.notEqual(mutations.at(-1).etag, conflicted.etag);

  const beforeRefresh = refreshes;
  await page.clock.setFixedTime(new Date(await page.evaluate(() => Date.now()) + 601_000));
  await choose(); mode = "lost";
  await page.getByRole("button", { name: "جایگزینی تصویر", exact: true }).click();
  await page.getByRole("button", { name: "تکرار همان عملیات", exact: true }).waitFor();
  assert.ok(refreshes > beforeRefresh, "Expired access token was not refreshed before the upload");
  const ambiguous = mutations.at(-1); const writesBeforeRetry = writes;
  assert.equal(await page.getByLabel("متن جایگزین (اختیاری)", { exact: true }).isDisabled(), true);
  await page.getByRole("button", { name: "تکرار همان عملیات", exact: true }).click(); await saved();
  assert.equal(writes, writesBeforeRetry); assert.equal(mutations.at(-1).key, ambiguous.key); assert.equal(mutations.at(-1).etag, ambiguous.etag);

  await page.getByRole("button", { name: "حذف تصویر ذخیره‌شده", exact: true }).click();
  await page.getByText("حذف تصویر از سرور تأیید شد.", { exact: true }).waitFor();
  await page.getByText("این محصول تصویر ذخیره‌شده ندارد.", { exact: true }).waitFor();
  assert.equal(deletes, 1);
  await page.getByRole("button", { name: "بستن ویرایشگر تصویر", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });

  await page.setViewportSize({ width: 390, height: 844 });
  await open("محصول دوم");
  await page.getByText("این محصول تصویر ذخیره‌شده ندارد.", { exact: true }).waitFor();
  assert.equal(await page.locator('dialog img').count(), 0);
  const dimensions = await page.getByRole("dialog").evaluate(element => ({ width: element.getBoundingClientRect().width, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
  assert.ok(dimensions.width <= 390, "Mobile dialog exceeds viewport"); assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 1, "Mobile dialog overflows horizontally");
  // Drag/drop uses Uppy's headless handler, not a custom picker/transport.
  const transfer = await page.evaluateHandle(base64 => { const transfer = new DataTransfer(); const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0)); transfer.items.add(new File([bytes], "product-photo.png", { type: "image/png" })); return transfer; }, png.toString("base64"));
  await page.getByRole("button", { name: "انتخاب تصویر یا کشیدن و رها کردن فایل", exact: true }).dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
  await page.getByText("پیش‌نمایش محلی؛ هنوز ذخیره نشده", { exact: true }).waitFor();
  await page.getByRole("button", { name: "حذف فایل از انتخاب", exact: true }).click();
  // Persian invalid-file feedback and keyboard focus remain visible on mobile.
  await page.locator('dialog input[type="file"]').setInputFiles({ name: "bad.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
  await page.getByText("یک تصویر JPEG، PNG یا WebP با حجم حداکثر ۵ مگابایت انتخاب کنید.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "دریافت وضعیت تازه", exact: true }).focus(); await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => !!document.querySelector("dialog")?.contains(document.activeElement)), true);
  await page.keyboard.press("Escape"); await page.getByRole("dialog").waitFor({ state: "hidden" });
  const urls = await page.evaluate(() => window.__mediaUrls);
  assert.equal(new Set(urls.created).size, urls.created.length);
  assert.deepEqual([...new Set(urls.revoked)].sort(), [...urls.created].sort());
  assert.equal(mutations.some(operation => operation.productId === secondId), false);
  assert.ok(previews > 0);
  await context.unroute("**/v1/**");
  return { checks: ["empty state", "RTL desktop/mobile", keyboardPicker ? "keyboard picker/focus/Escape" : "keyboard focus/Escape", "drag-drop", "selection vs removal", "multipart headers", "upload/progress/replace/delete", "412 deliberate conflict", "expired-token refresh", "ambiguous success stable retry", "protected preview", "product switching", "object URL cleanup", "Persian validation"], requests: mutations.length, committedUploads: writes, deletions: deletes, realR2: false };
}
