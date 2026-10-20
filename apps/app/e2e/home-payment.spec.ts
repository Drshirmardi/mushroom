import { expect, test } from "@playwright/test";

// All API requests are intercepted; no real cancellation or wallet mutation is made.
test("Home follows service payments, offers the funded wallet and ignores remaining optional top-ups", async ({ page }) => {
  const pending = ["new-order", "old-order"];
  const cancelled = new Set<string>();
  let rejectCancel = true;
  let cancellations = 0;
  const headers = { "access-control-allow-origin": "http://localhost:3001", "access-control-allow-credentials": "true", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,OPTIONS" };
  await page.route("**/v1/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, headers, contentType: "application/json", body: JSON.stringify(body) });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path === "/v1/auth/refresh") return json({ accessToken: "synthetic", tokenType: "Bearer", expiresIn: 600, user: { id: "patient-fixture", roles: ["PATIENT"] } });
    if (path === "/v1/patients/me/journey") return json({
      onboarding: { isComplete: true, answeredRequiredCount: 3, requiredCount: 3 },
      nextAction: pending.length ? { code: "CONTINUE_PAYMENT", resourceId: pending[0] } : { code: "BOOK_CONSULTATION", resourceId: null },
      pendingPayments: { items: pending.map(id => ({ id, purpose: "ORDER", amountRial: id === "new-order" ? "2500000" : "1000000", currency: "IRR", expiresAt: null })).concat([{id: "optional-topup", purpose: "TOPUP", amountRial: "5000000", currency: "IRR", expiresAt: null}]), hasMore: false },
    });
    const payment = path.match(/\/billing\/intents\/([^/]+)(\/cancel)?$/);
    if (payment) {
      const id = payment[1];
      const intent = () => ({ id, purpose: "ORDER", amountRial: id === "new-order" ? "2500000" : "1000000", currency: "IRR", status: cancelled.has(id) ? "CANCELLED" : "PENDING", methods: [{ code: "WALLET", available: true, balanceRial: "10000000" }, { code: "GATEWAY", available: false, balanceRial: null }] });
      if (request.method() === "POST" && payment[2]) {
        expect(request.headers()["idempotency-key"]).toBeTruthy();
        if (rejectCancel) return json({ code: "BILLING_PAYMENT_PENDING" }, 409);
        cancellations++;
        cancelled.add(id);
        pending.splice(pending.indexOf(id), 1);
      }
      return json(intent());
    }
    if (path.endsWith("/notifications") || path === "/v1/patients/me/articles") return json({ items: [], total: 0 });
    if (request.method() !== "GET") throw new Error(`Unexpected mutation ${path}`);
    return json({}, 404);
  });
  await page.goto("http://localhost:3001/");
  const card = page.locator(".home-next");
  await expect(card.getByRole("heading", { name: "پرداخت سفارش" })).toBeVisible();
  await expect(card).toContainText("۲۵۰٬۰۰۰ تومان");
  await expect(card).toContainText("۳ درخواست در انتظار");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `.playwright-mcp/home-payments-pending-${test.info().project.name}.png` });
  await card.getByRole("link", { name: "پیگیری پرداخت" }).click();
  await expect(page.getByRole("button", { name: "پرداخت از کیف پول", exact: false })).toBeVisible();
  await page.getByRole("button", { name: "لغو این پرداخت" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "یک پرداخت بانکی" })).toBeVisible();
  expect(cancellations).toBe(0);
  await expect(page.getByRole("link", { name: "بازگشت به خانه و قدم بعدی" })).toHaveCount(0);
  rejectCancel = false;
  await page.getByRole("button", { name: "لغو این پرداخت" }).click();
  await expect(page.getByRole("status")).toContainText("این درخواست پرداخت لغو شده است");
  await expect(page.getByRole("button", { name: "لغو این پرداخت" })).toHaveCount(0);
  await page.screenshot({ path: `.playwright-mcp/home-payment-cancelled-${test.info().project.name}.png` });
  await page.getByRole("link", { name: "بازگشت به خانه و قدم بعدی" }).click();
  await expect(card).toContainText("۱۰۰٬۰۰۰ تومان");
  await expect(card).not.toContainText("۳ درخواست در انتظار");
  await expect(card.getByRole("link", { name: "پیگیری پرداخت" })).toHaveAttribute("href", "/profile/wallet/pay?intentId=old-order");
  await page.screenshot({ path: `.playwright-mcp/home-payment-${test.info().project.name}.png` });
  await card.getByRole("link", { name: "پیگیری پرداخت" }).click();
  await page.getByRole("button", { name: "لغو این پرداخت" }).click();
  await page.getByRole("link", { name: "بازگشت به خانه و قدم بعدی" }).click();
  await expect(card.getByRole("link", { name: "رزرو مشاوره" })).toBeVisible();
  await expect(card.getByRole("link", { name: "پیگیری پرداخت" })).toHaveCount(0);
  expect(cancellations).toBe(2);
});
