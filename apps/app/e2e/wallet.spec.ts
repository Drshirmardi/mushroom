import { expect, test, type Page, type Route } from "@playwright/test";

const APP_ORIGIN = "http://localhost:3001";
const INTENT_ID = "33333333-3333-4333-8333-333333333333";
const ORDER_ID = "22222222-2222-4222-8222-222222222222";

const corsHeaders = {
  "access-control-allow-origin": APP_ORIGIN,
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

const authentication = {
  accessToken: "e2e-token",
  tokenType: "Bearer",
  expiresIn: 600,
  user: { id: "11111111-1111-4111-8111-111111111111", phone: "+989120000000", roles: ["PATIENT"] },
};

type AsyncHandler = (route: Route, url: URL, request: ReturnType<Route["request"]>) => Promise<void> | void;
type Rule = { method: string; pattern: RegExp; handler: AsyncHandler };

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, headers: { ...corsHeaders, "content-type": "application/json" }, body: JSON.stringify(body) });
}

async function installApi(page: Page, rules: Rule[]) {
  await page.route("**/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    const rule = rules.find((candidate) => candidate.method === request.method() && candidate.pattern.test(url.pathname));
    if (rule) {
      await rule.handler(route, url, request);
      return;
    }
    await json(route, { code: "NOT_FOUND" }, 404);
  });
}

const refresh: Rule = { method: "POST", pattern: /^\/v1\/auth\/refresh$/, handler: (route) => json(route, authentication) };

const walletSummary = (balanceRial: string, frozen = false) => ({
  patientId: "11111111-1111-4111-8111-111111111111",
  currency: "IRR",
  balanceRial,
  version: 3,
  frozen,
  asOf: "2026-10-16T10:00:00.000Z",
});

const intent = (overrides: Record<string, unknown> = {}) => ({
  id: INTENT_ID,
  purpose: "ORDER",
  status: "PENDING",
  method: null,
  amountRial: "1250000",
  currency: "IRR",
  orderId: ORDER_ID,
  appointmentId: null,
  expiresAt: null,
  paidAt: null,
  createdAt: "2026-10-16T10:00:00.000Z",
  methods: [
    { code: "WALLET", available: true, balanceRial: "5000000" },
    { code: "GATEWAY", available: true, balanceRial: null },
  ],
  attempts: [],
  refunds: [],
  ...overrides,
});

test("wallet page renders the authoritative balance, ledger and empty state", async ({ page }) => {
  await installApi(page, [
    refresh,
    { method: "GET", pattern: /^\/v1\/patients\/me\/wallet$/, handler: (route) => json(route, walletSummary("1250000")) },
    {
      method: "GET",
      pattern: /^\/v1\/patients\/me\/wallet\/transactions$/,
      handler: (route) =>
        json(route, {
          page: 1,
          pageSize: 20,
          total: 2,
          items: [
            { id: "t1", kind: "TOPUP", deltaRial: "500000", balanceAfterRial: "1250000", reference: "gateway:a:credit", createdAt: "2026-10-15T10:00:00.000Z" },
            { id: "t2", kind: "PAYMENT", deltaRial: "-125000", balanceAfterRial: "750000", reference: "intent:b:debit", createdAt: "2026-10-14T10:00:00.000Z" },
          ],
        }),
    },
  ]);

  await page.goto("/profile/wallet");
  await expect(page.getByRole("heading", { name: "کیف پول", exact: true })).toBeVisible();
  await expect(page.getByTestId("wallet-balance-value")).toContainText("۱۲۵٬۰۰۰");
  await expect(page.getByText("تراکنش‌های اخیر")).toBeVisible();
  await expect(page.getByText("شارژ کیف پول")).toBeVisible();
  await expect(page.getByText("+۵۰٬۰۰۰")).toBeVisible();
  await expect(page.getByText("پرداخت از کیف پول")).toBeVisible();
  await expect(page.getByText("−۱۲٬۵۰۰")).toBeVisible();

  await page.unroute("**/v1/**");
  await installApi(page, [
    refresh,
    { method: "GET", pattern: /^\/v1\/patients\/me\/wallet$/, handler: (route) => json(route, walletSummary("0", true)) },
    { method: "GET", pattern: /^\/v1\/patients\/me\/wallet\/transactions$/, handler: (route) => json(route, { page: 1, pageSize: 20, total: 0, items: [] }) },
  ]);
  await page.reload();
  await expect(page.getByText("تراکنشی وجود ندارد.")).toBeVisible();
  await expect(page.getByText("خرج کردن از این کیف پول موقتاً مسدود شده است.", { exact: false })).toBeVisible();
});

test("top-up requires an integer TOMAN amount and never fabricates a success", async ({ page }) => {
  let topupBody = "";
  await installApi(page, [
    refresh,
    { method: "GET", pattern: /^\/v1\/patients\/me\/wallet$/, handler: (route) => json(route, walletSummary("0")) },
    { method: "GET", pattern: /^\/v1\/patients\/me\/wallet\/transactions$/, handler: (route) => json(route, { page: 1, pageSize: 20, total: 0, items: [] }) },
    {
      method: "POST",
      pattern: /^\/v1\/patients\/me\/wallet\/topups$/,
      handler: async (route, _url, request) => {
        topupBody = request.postData() ?? "";
        await json(route, intent({ purpose: "TOPUP", orderId: null }), 201);
      },
    },
    { method: "POST", pattern: /^\/v1\/patients\/me\/billing\/intents\/[^/]+\/gateway-attempts$/, handler: (route) => json(route, { id: "a1", intentId: INTENT_ID, status: "REQUIRES_RECONCILIATION", amountRial: "1000000", currency: "IRR", redirectUrl: null }, 201) },
  ]);

  await page.goto("/profile/wallet");
  await page.getByRole("button", { name: "افزایش موجودی" }).click();
  await page.getByLabel("مبلغ شارژ (تومان)").fill("500");
  await page.getByRole("button", { name: "پرداخت و شارژ" }).click();
  await expect(page.getByText("کمترین مبلغ شارژ", { exact: false })).toBeVisible();
  expect(topupBody).toBe("");

  await page.getByLabel("مبلغ شارژ (تومان)").fill("۱۰۰۰۰۰");
  await page.getByRole("button", { name: "پرداخت و شارژ" }).click();
  await expect.poll(() => topupBody).toBe(JSON.stringify({ amountToman: "100000" }));
  await expect(page.getByText("پرداخت در وضعیت نامشخص است", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "مشاهدهٔ نتیجه" })).toBeVisible();
});

test("payment result treats a verified intent as success", async ({ page }) => {
  await installApi(page, [
    refresh,
    { method: "GET", pattern: /^\/v1\/patients\/me\/billing\/intents\/[^/]+$/, handler: (route) => json(route, intent({ status: "PAID", method: "WALLET", orderId: ORDER_ID, paidAt: "2026-10-16T10:05:00.000Z" })) },
  ]);
  await page.goto(`/profile/wallet/payment-result?intentId=${INTENT_ID}`);
  await expect(page.getByRole("heading", { name: "پرداخت با موفقیت انجام شد" })).toBeVisible();
  await expect(page.getByText("کیف پول", { exact: true })).toBeVisible();
});

test("payment result keeps an ambiguous bank outcome out of both success and failure", async ({ page }) => {
  await installApi(page, [
    refresh,
    { method: "GET", pattern: /^\/v1\/patients\/me\/billing\/intents\/[^/]+$/, handler: (route) => json(route, intent({ status: "PENDING", attempts: [{ id: "a1", status: "REQUIRES_RECONCILIATION", reference: null, traceNumber: null, verifiedAt: null }] })) },
  ]);
  await page.goto(`/profile/wallet/payment-result?intentId=${INTENT_ID}`);
  await expect(page.getByRole("heading", { name: "نتیجهٔ پرداخت هنوز قطعی نیست" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "پرداخت با موفقیت انجام شد" })).toHaveCount(0);
});

test("store payment chooser pays with the wallet and reaches the order success page", async ({ page }) => {
  const order = { id: ORDER_ID, orderNumber: "1024", status: "PENDING_PAYMENT", totalAmountToman: "125000", paymentStatus: null };
  await installApi(page, [
    refresh,
    { method: "GET", pattern: /^\/v1\/patients\/me\/orders\/[^/]+$/, handler: (route) => json(route, order) },
    { method: "POST", pattern: /^\/v1\/patients\/me\/billing\/order-intents$/, handler: (route) => json(route, intent(), 201) },
    { method: "GET", pattern: /^\/v1\/patients\/me\/billing\/intents\/[^/]+$/, handler: (route) => json(route, intent()) },
    { method: "POST", pattern: /^\/v1\/patients\/me\/billing\/intents\/[^/]+\/wallet-payment$/, handler: (route) => json(route, intent({ status: "PAID", method: "WALLET", paidAt: "2026-10-16T10:05:00.000Z" }), 201) },
    { method: "GET", pattern: /^\/v1\/patients\/me\/orders\/[^/]+\/receipt$/, handler: (route) => json(route, { orderId: ORDER_ID, orderNumber: "1024", totalAmountToman: "125000", status: "PAID", method: "WALLET", verifiedAt: "2026-10-16T10:05:00.000Z", providerReferenceId: null, providerTraceNumber: null, order: { ...order, status: "PAID", paymentStatus: "PAID", paymentMethod: "WALLET" } }) },
  ]);

  await page.goto(`/store/payment?orderId=${ORDER_ID}`);
  await expect(page.getByText("پرداخت از کیف پول")).toBeVisible();
  await expect(page.getByText("کسری موجودی", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: /پرداخت از کیف پول/ }).click();
  await expect(page).toHaveURL(new RegExp(`/store/order-success\\?orderId=${ORDER_ID}`, "u"));
  await expect(page.getByText("رسید پرداخت")).toBeVisible();
});

test("appointment payment chooser pays with the wallet and creates the appointment", async ({ page }) => {
  const appointmentIntent = intent({ purpose: "APPOINTMENT", orderId: null, amountRial: "900000" });
  await installApi(page, [
    refresh,
    { method: "GET", pattern: /^\/v1\/patients\/me\/billing\/intents\/[^/]+$/, handler: (route) => json(route, appointmentIntent) },
    { method: "POST", pattern: /^\/v1\/patients\/me\/billing\/intents\/[^/]+\/wallet-payment$/, handler: (route) => json(route, { ...appointmentIntent, status: "PAID", method: "WALLET", appointmentId: "44444444-4444-4444-8444-444444444444" }, 201) },
  ]);

  await page.goto(`/appointments/book/pay?intentId=${INTENT_ID}`);
  await expect(page.getByText("پرداخت از کیف پول")).toBeVisible();
  await page.getByRole("button", { name: /پرداخت از کیف پول/ }).click();
  await expect(page).toHaveURL(/\/appointments\/book\/success\?appointmentId=44444444-4444-4444-8444-444444444444/u);
  await expect(page.getByRole("heading", { name: "نوبت با موفقیت ثبت شد!" })).toBeVisible();
});

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("wallet page is usable at mobile width", async ({ page }) => {
    await installApi(page, [
      refresh,
      { method: "GET", pattern: /^\/v1\/patients\/me\/wallet$/, handler: (route) => json(route, walletSummary("0")) },
      { method: "GET", pattern: /^\/v1\/patients\/me\/wallet\/transactions$/, handler: (route) => json(route, { page: 1, pageSize: 20, total: 0, items: [] }) },
    ]);
    await page.goto("/profile/wallet");
    await expect(page.getByText("موجودی کیف پول")).toBeVisible();
    await page.getByRole("button", { name: "افزایش موجودی" }).click();
    await expect(page).toHaveURL(/\/profile\/wallet$/u);
    await expect(page.getByLabel("مبلغ شارژ (تومان)")).toBeVisible();
    await expect(page.getByRole("heading", { name: "افزایش موجودی" })).toBeVisible();
    await expect(page.getByLabel("مبلغ شارژ (تومان)")).toHaveValue("۲۵۰٬۰۰۰");
    await expect(page.getByRole("button", { name: /^۲۵۰٬۰۰۰/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /^۵۰۰٬۰۰۰/ }).click();
    await expect(page.getByLabel("مبلغ شارژ (تومان)")).toHaveValue("۵۰۰٬۰۰۰");
    await page.getByLabel("مبلغ شارژ (تومان)").fill("۹۹۹۹۹۹۹۹۹۹۹");
    await expect(page.getByLabel("مبلغ شارژ (تومان)")).toHaveValue("۲۰٬۰۰۰٬۰۰۰");
  });
});
