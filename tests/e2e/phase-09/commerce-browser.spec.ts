import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { cleanupRunScopedFixture, createRunScopedFixture, localAdminCredentials, openDatabase, orderState, patientForPhone, type Fixture } from "./commerce-browser.fixture";

const api = "http://localhost:3003/v1";
const localhost = /^http:\/\/localhost(?::\d+)?(?:\/|$)/u;
type BrowserIssues = { external: string[]; errors: string[]; responses: Array<{ status: number; url: string }> };
const toPersian = (value: string) => value.replace(/\d/gu, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]!);
const tomanLabel = (value: string) => `${new Intl.NumberFormat("fa-IR").format(Number(value))} تومان`;

function guardPage(page: Page, issues: BrowserIssues) {
  page.on("request", (request) => { if (!localhost.test(request.url())) issues.external.push(new URL(request.url()).host); });
  page.on("response", (response) => { if (response.status() >= 400) issues.responses.push({ status: response.status(), url: response.url() }); });
  page.on("pageerror", (error) => issues.errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") issues.errors.push(message.text()); });
}

async function loginPatient(context: BrowserContext, phone: string, password: string, register: boolean, issues: BrowserIssues) {
  const page = await context.newPage(); guardPage(page, issues);
  if (register) {
    await page.goto("http://localhost:3000/signup");
    await page.getByLabel("شماره موبایل").fill(phone);
    await page.getByLabel("رمز عبور", { exact: true }).fill(password);
    await page.getByLabel("تکرار رمز عبور").fill(password);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "ثبت‌نام" }).click();
    await expect(page).toHaveURL(/http:\/\/localhost:3000\/login/u);
  } else await page.goto("http://localhost:3000/login");
  await page.getByLabel("شماره موبایل").fill(phone);
  await page.getByLabel("رمز عبور", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page).toHaveURL(/http:\/\/localhost:3001\//u);
  // The destination performs its real refresh-cookie bootstrap after the web redirect.
  // Keep the context on the destination long enough to prove that a fresh session stays authenticated.
  await page.waitForTimeout(750);
  await expect(page).toHaveURL(/http:\/\/localhost:3001\//u);
  return page;
}

async function adminApiToken(): Promise<string> {
  const credentials = localAdminCredentials();
  const response = await fetch(`${api}/auth/login`, { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ ...credentials, remember: false }) });
  if (!response.ok) throw new Error("The local ADMIN account could not authenticate for revenue verification.");
  const body = await response.json() as { accessToken?: string };
  if (!body.accessToken) throw new Error("The local ADMIN account did not receive an access token.");
  return body.accessToken;
}

async function revenueSnapshot(accessToken: string) {
  const to = new Date(); const from = new Date(to); from.setUTCDate(from.getUTCDate() - 29);
  const response = await fetch(`${api}/admin/commerce/revenue?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}&granularity=DAY`, { headers: { authorization: `Bearer ${accessToken}` } });
  expect(response.status).toBe(200);
  return response.json() as Promise<Record<string, unknown>>;
}

async function cancelForCleanup(accessToken: string, fixture: Fixture, orderId: string | undefined) {
  if (!orderId) return;
  const response = await fetch(`${api}/admin/commerce/orders/${orderId}/cancel-before-payment`, { method: "POST", headers: { authorization: `Bearer ${accessToken}`, "idempotency-key": `${fixture.runId}-cleanup` } });
  if (![200, 201, 204, 409, 422].includes(response.status)) throw new Error("Unable to cancel a disposable pending-payment order during cleanup.");
}

test("completes the isolated Phase 09 pending-payment lifecycle in Chrome", async ({ browser }) => {
  const database = await openDatabase();
  const fixture = await createRunScopedFixture(database);
  const adminToken = await adminApiToken();
  const issues: BrowserIssues[] = [];
  const contexts: BrowserContext[] = [];
  let orderId: string | undefined;
  try {
    for (const port of [3000, 3001, 3002, 3003]) expect((await fetch(`http://localhost:${port}${port === 3003 ? "/v1/health/live" : "/"}`, { redirect: "manual" })).status).toBeLessThan(500);
    const patientAContext = await browser.newContext(); contexts.push(patientAContext);
    const patientAIssues: BrowserIssues = { external: [], errors: [], responses: [] }; issues.push(patientAIssues);
    const patientA = await loginPatient(patientAContext, fixture.patientAPhone, fixture.password, true, patientAIssues);
    await expect.poll(() => patientA.evaluate(() => ({ hostname: location.hostname, secure: window.isSecureContext, randomUuid: typeof crypto.randomUUID }))).toEqual({ hostname: "localhost", secure: true, randomUuid: "function" });
    const patientARecord = await patientForPhone(database, fixture.patientAPhone, fixture.clinicId);
    await patientA.goto("http://localhost:3001/store");
    const product = patientA.locator("article").filter({ hasText: fixture.title });
    await expect(product).toBeVisible();
    await product.getByRole("button").last().click();
    await patientA.goto("http://localhost:3001/store/cart");
    await expect(patientA.getByText(fixture.title, { exact: true })).toBeVisible();
    await patientA.reload();
    await expect(patientA.getByText(fixture.title, { exact: true })).toBeVisible();
    await patientA.getByRole("button", { name: "ادامه و تکمیل خرید" }).click();
    await expect(patientA).toHaveURL(/\/store\/checkout/u);
    await expect(patientA.getByText("۰ تومان", { exact: true })).toBeVisible();
    const courier = patientA.getByText("ارسال با پیک", { exact: true }).locator("..");
    await expect(courier).toBeVisible();
    await expect(courier.getByText(tomanLabel(fixture.courierRateToman), { exact: true })).toBeVisible();
    const revenueBefore = await revenueSnapshot(adminToken);
    const checkoutResponse = patientA.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/v1/patients/me/orders"));
    await patientA.getByRole("button", { name: "ثبت سفارش" }).click();
    const checkout = await checkoutResponse;
    expect(checkout.status()).toBe(201);
    const checkoutBody = await checkout.json() as { id: string; orderNumber: string; totalAmountToman: string };
    orderId = checkoutBody.id;
    await expect(patientA).toHaveURL(new RegExp(`/store/payment\\?orderId=${orderId}`, "u"));
    await expect(patientA.getByText(`شماره سفارش ${checkoutBody.orderNumber}`)).toBeVisible();
    await expect(patientA.getByText(tomanLabel(checkoutBody.totalAmountToman), { exact: true })).toBeVisible();
    await patientA.reload();
    await expect(patientA.getByText(`شماره سفارش ${checkoutBody.orderNumber}`)).toBeVisible();
    await expect(patientA.getByText(tomanLabel(checkoutBody.totalAmountToman), { exact: true })).toBeVisible();
    const afterCheckout = await orderState(database, fixture, patientARecord.patientId, orderId);
    expect(afterCheckout).toMatchObject({ orderCount: 1, status: "PENDING_PAYMENT", reservationStatus: "ACTIVE", reservationQuantity: 1, onHandQuantity: fixture.baseline.onHandQuantity, reservedQuantity: fixture.baseline.reservedQuantity + 1, reservationEffects: 1, releaseEffects: 0, paymentAttempts: 0, payments: 0 });
    const blockedResponse = patientA.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith(`/v1/patients/me/orders/${orderId}/payment-attempts`));
    await patientA.getByRole("button", { name: "شروع پرداخت امن" }).click();
    const blocked = await blockedResponse;
    expect(blocked.status()).toBe(503);
    expect((await blocked.json() as { code?: string }).code).toBe("SADAD_GO_LIVE_BLOCKED");
    await expect(patientA.getByText("درگاه پرداخت هنوز برای پذیرندگی فعال نیست. هیچ پرداخت یا انتقالی انجام نشده است.")).toBeVisible();
    expect(await orderState(database, fixture, patientARecord.patientId, orderId)).toMatchObject({ paymentAttempts: 0, payments: 0 });
    const freshAContext = await browser.newContext(); contexts.push(freshAContext);
    const freshAIssues: BrowserIssues = { external: [], errors: [], responses: [] }; issues.push(freshAIssues);
    const freshA = await loginPatient(freshAContext, fixture.patientAPhone, fixture.password, false, freshAIssues);
    await freshA.goto("http://localhost:3001/store/orders");
    await expect(freshA.getByText("در انتظار پرداخت")).toBeVisible();
    await expect(freshA.getByText(toPersian(checkoutBody.orderNumber), { exact: false })).toBeVisible();
    const patientBContext = await browser.newContext(); contexts.push(patientBContext);
    const patientBIssues: BrowserIssues = { external: [], errors: [], responses: [] }; issues.push(patientBIssues);
    const patientB = await loginPatient(patientBContext, fixture.patientBPhone, fixture.password, true, patientBIssues);
    const patientBOrders = patientB.waitForResponse((response) => response.request().method() === "GET" && response.url().endsWith("/v1/patients/me/orders"));
    await patientB.goto("http://localhost:3001/store/orders");
    await expect(patientB.getByText(checkoutBody.orderNumber, { exact: false })).toHaveCount(0);
    const patientBToken = (await (await patientBOrders).request().allHeaders()).authorization?.replace(/^Bearer\s+/u, "") ?? "";
    expect(patientBToken).not.toBe("");
    const denied = await Promise.all([
      fetch(`${api}/patients/me/orders/${orderId}`, { headers: { authorization: `Bearer ${patientBToken}` } }),
      fetch(`${api}/patients/me/orders/${orderId}/receipt`, { headers: { authorization: `Bearer ${patientBToken}` } }),
      fetch(`${api}/patients/me/orders/${orderId}/payment-attempts`, { method: "POST", headers: { authorization: `Bearer ${patientBToken}`, "idempotency-key": `${fixture.runId}-patient-b` } }),
    ]);
    for (const response of denied) expect(response.status).toBe(404);
    const adminContext = await browser.newContext(); contexts.push(adminContext);
    const adminIssues: BrowserIssues = { external: [], errors: [], responses: [] }; issues.push(adminIssues);
    const admin = await adminContext.newPage(); guardPage(admin, adminIssues);
    const credentials = localAdminCredentials();
    await admin.goto("http://localhost:3000/login?next=http://localhost:3002/orders");
    await admin.getByLabel("شماره موبایل").fill(credentials.phone);
    await admin.getByLabel("رمز عبور", { exact: true }).fill(credentials.password);
    await admin.getByRole("button", { name: "ورود" }).click();
    await expect(admin).toHaveURL(/http:\/\/localhost:3002\/orders/u);
    const orderRow = admin.locator("tr").filter({ hasText: checkoutBody.orderNumber });
    await expect(orderRow).toBeVisible();
    const cancellation = admin.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith(`/v1/admin/commerce/orders/${orderId}/cancel-before-payment`));
    await orderRow.getByRole("button", { name: "لغو" }).click();
    expect((await cancellation).ok()).toBe(true);
    await expect(orderRow.getByText("CANCELLED", { exact: true })).toBeVisible();
    const afterCancel = await orderState(database, fixture, patientARecord.patientId, orderId);
    expect(afterCancel).toMatchObject({ orderCount: 1, status: "CANCELLED", reservationStatus: "RELEASED", reservationQuantity: 1, onHandQuantity: fixture.baseline.onHandQuantity, reservedQuantity: fixture.baseline.reservedQuantity, reservationEffects: 1, releaseEffects: 1, paymentAttempts: 0, payments: 0 });
    await freshA.reload();
    await expect(freshA.getByText("CANCELLED", { exact: true })).toBeVisible();
    expect(await revenueSnapshot(adminToken)).toEqual(revenueBefore);
    for (const issue of issues) {
      expect(issue.external).toEqual([]);
      const unexpectedResponses = issue.responses.filter(({ status, url }) => !((status === 503 && url.endsWith(`/v1/patients/me/orders/${orderId}/payment-attempts`)) || (status === 404 && url.startsWith(`${api}/patients/me/orders/${orderId}`))));
      expect(unexpectedResponses).toEqual([]);
      expect(issue.errors.filter((message) => !/^Failed to load resource: the server responded with a status of (404|503)/u.test(message))).toEqual([]);
    }
  } finally {
    await cancelForCleanup(adminToken, fixture, orderId);
    await Promise.all(contexts.map((context) => context.close()));
    await cleanupRunScopedFixture(database, fixture);
    await database.end();
  }
});
