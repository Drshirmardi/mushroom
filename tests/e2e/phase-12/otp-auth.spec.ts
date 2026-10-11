import { expect, test, type Route } from "@playwright/test";

const challengeId = "00000000-0000-4000-8000-000000000321";
const testOnlyCode = "481205";

test("completes OTP-first login without exposing the code in a browser response", async ({ context, page }) => {
  const apiRequests: Array<{ path: string; body: unknown }> = [];
  let apiOrigin = "http://localhost:3003";

  const patientDestination = (route: Route) => route.fulfill({
    contentType: "text/html",
    body: "<main>patient application destination</main>",
  });
  await context.route("http://localhost:3001/**", patientDestination);
  await context.route("http://127.0.0.1:3001/**", patientDestination);

  await context.route("**/v1/auth/otp/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    apiOrigin = url.origin;
    const corsHeaders = {
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "content-type,idempotency-key",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-origin": "http://127.0.0.1:3200",
    };
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    const body = request.postDataJSON();
    apiRequests.push({ path: url.pathname, body });

    if (url.pathname.endsWith("/verify")) {
      expect(body).toEqual({ code: testOnlyCode });
      await route.fulfill({
        contentType: "application/json",
        headers: { ...corsHeaders, "set-cookie": "sz_refresh_dev=fake-browser-refresh; Path=/; HttpOnly; SameSite=Lax" },
        body: JSON.stringify({
          accessToken: "browser-test-access-token",
          tokenType: "Bearer",
          expiresIn: 900,
          user: { id: "00000000-0000-4000-8000-000000000009", phone: "+989121234567", roles: ["PATIENT"] },
        }),
      });
      return;
    }

    expect(request.headers()["idempotency-key"]).toBeTruthy();
    expect(body).toEqual({ phone: "09121234567", remember: true });
    const response = {
      challengeId,
      destinationMasked: "+98******4567",
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
      resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
    };
    expect(JSON.stringify(response)).not.toContain(testOnlyCode);
    await route.fulfill({ contentType: "application/json", headers: corsHeaders, body: JSON.stringify(response) });
  });

  await page.goto("/login");
  await expect(page.getByRole("tab", { name: "کد یک‌بارمصرف" })).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("شماره موبایل").fill("۰۹۱۲۱۲۳۴۵۶۷");
  await page.getByRole("button", { name: "ارسال کد" }).click();
  await expect(page.getByText("کد ارسال شد", { exact: true })).toBeVisible();

  await page.getByLabel("کد یک‌بارمصرف").fill(testOnlyCode);
  await page.getByRole("button", { name: "تأیید و ادامه" }).click();
  await expect(page).toHaveURL(/:3001\//u);
  await expect(page.getByText("patient application destination", { exact: true })).toBeVisible();

  expect(apiRequests.map(({ path }) => path)).toEqual([
    "/v1/auth/otp/challenges",
    `/v1/auth/otp/challenges/${challengeId}/verify`,
  ]);
  const cookies = await context.cookies(apiOrigin);
  expect(cookies.some(({ name }) => name === "sz_refresh_dev")).toBe(true);
});

test("keeps password login as an explicit secondary method", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("tab", { name: "رمز عبور" }).click();
  await expect(page.getByRole("textbox", { name: "رمز عبور", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "ورود", exact: true })).toBeVisible();
});
