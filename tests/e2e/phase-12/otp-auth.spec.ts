import { expect, test, type Route } from "@playwright/test";

const challengeId = "00000000-0000-4000-8000-000000000321";
const testOnlyCode = "481205";

test.beforeEach(async ({ context }) => {
  await context.route("**/v1/auth/refresh", route => route.fulfill({
    status: 401, contentType: "application/json", body: JSON.stringify({ code: "UNAUTHORIZED" }),
    headers: { "access-control-allow-origin": "http://127.0.0.1:3200", "access-control-allow-credentials": "true" },
  }));
});

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
  await expect(page).toHaveURL(/\/\?login=1$/u);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("شماره موبایل").fill("۰۹۱۲۱۲۳۴۵۶۷");
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  await expect(page.getByRole("heading", { name: "تأیید شماره موبایل" })).toBeVisible();

  await page.getByLabel("کد یک‌بارمصرف شش‌رقمی").fill(testOnlyCode);
  await expect(page.locator(".landing-otp")).toHaveClass(/is-verifying/u);
  await expect.poll(() => page.locator(".landing-otp-digit").evaluateAll(digits => {
    const positions = digits.map(digit => digit.getBoundingClientRect().top);
    return Math.max(...positions) - Math.min(...positions);
  })).toBeGreaterThan(20);
  expect(await page.locator(".landing-auth-panel").evaluate(panel => panel.scrollWidth === panel.clientWidth)).toBe(true);
  await expect(page.getByRole("button", { name: "ادامه مسیر" })).toBeVisible();
  await expect(page).toHaveURL(/\/\?login=1$/u);
  await page.getByRole("button", { name: "ادامه مسیر" }).click();
  await expect(page).toHaveURL(/:3001\//u);
  await expect(page.getByText("patient application destination", { exact: true })).toBeVisible();

  expect(apiRequests.map(({ path }) => path)).toEqual([
    "/v1/auth/otp/challenges",
    `/v1/auth/otp/challenges/${challengeId}/verify`,
  ]);
  const cookies = await context.cookies(apiOrigin);
  expect(cookies.some(({ name }) => name === "sz_refresh_dev")).toBe(true);
});

test("opens in place, hides dormant methods and restores focus after Escape", async ({ page }) => {
  await page.goto("/");
  const login = page.getByRole("button", { name: "ورود", exact: true });
  await login.click();
  await expect(page).toHaveURL("http://127.0.0.1:3200/");
  await expect(page.getByLabel("شماره موبایل", { exact: true })).toBeFocused();
  await expect(page.locator("input[type=password]")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /ثبت‌نام/u })).toHaveCount(0);
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "بستن پنجره ورود", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(login).toBeFocused();
  await page.goto("/signup?next=" + encodeURIComponent("http://localhost:3001/assessment?resume=1"));
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(new URL(page.url()).searchParams.get("next")).toBe("http://localhost:3001/assessment?resume=1");
});

test("fits mobile and desktop, remains usable in a short viewport and drags closed", async ({ page }) => {
  await page.goto("/");
  for (const width of [320, 390, 430, 480, 600, 767, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole("button", { name: "ورود", exact: true }).click();
    await page.locator(".landing-auth-panel").evaluate(panel => Promise.all(panel.getAnimations().map(animation => animation.finished)));
    const box = await page.locator(".landing-auth-panel").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    if (width < 768) {
      expect(box!.width).toBe(width);
      expect(Math.abs(box!.y + box!.height - 844)).toBeLessThan(2);
    }
    else expect(box!.width).toBe(480);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 420 });
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await page.getByLabel("شماره موبایل").fill("09121234567");
  await expect(page.getByRole("button", { name: "دریافت کد ورود" })).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  const handle = page.locator(".landing-auth-handle");
  await page.waitForTimeout(450);
  const box = await handle.boundingBox();
  await page.mouse.move(box!.x + 40, box!.y + 20);
  await page.mouse.down();
  await page.mouse.move(box!.x + 40, box!.y + 150, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("opens a white sheet without transient dialog scrollbars or the central phone symbol", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(page.locator(".landing-auth-panel")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator(".landing-phone-symbol")).toHaveCount(0);
  const frames = await dialog.evaluate(async element => {
    const position = element.querySelector<HTMLElement>(".landing-auth-position")!;
    const panel = element.querySelector<HTMLElement>(".landing-auth-panel")!;
    const samples: Array<{ verticalOverflow: number; horizontalOverflow: number; top: number }> = [];
    const started = performance.now();
    await new Promise<void>(resolve => {
      const sample = () => {
        samples.push({
          verticalOverflow: element.scrollHeight - element.clientHeight,
          horizontalOverflow: element.scrollWidth - element.clientWidth,
          top: panel.getBoundingClientRect().top,
        });
        if (performance.now() - started < 550) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    return { samples, overflow: getComputedStyle(element).overflow, positionOverflow: getComputedStyle(position).overflow,
      scrollbarWidth: getComputedStyle(panel).scrollbarWidth };
  });
  expect(frames.overflow).toBe("clip");
  expect(frames.positionOverflow).toBe("clip");
  expect(frames.scrollbarWidth).toBe("none");
  expect(frames.samples.length).toBeGreaterThan(5);
  for (const frame of frames.samples) {
    expect(frame.verticalOverflow).toBeLessThanOrEqual(1);
    expect(frame.horizontalOverflow).toBeLessThanOrEqual(1);
  }
  for (let index = 1; index < frames.samples.length; index++) {
    expect(frames.samples[index].top).toBeLessThanOrEqual(frames.samples[index - 1].top + 1);
  }
});

const corsHeaders = {
  "access-control-allow-origin": "http://127.0.0.1:3200",
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type,idempotency-key",
  "access-control-allow-methods": "POST,OPTIONS",
};

test("recovers from invalid code, resends and uses the replacement challenge", async ({ context, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let requestCount = 0;
  let verifyCount = 0;
  const paths: string[] = [];
  await context.route("**/v1/auth/otp/**", async route => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: corsHeaders });
    const path = new URL(route.request().url()).pathname;
    paths.push(path);
    if (path.endsWith("/verify")) {
      verifyCount++;
      return route.fulfill({ status: 400, headers: corsHeaders, contentType: "application/json", body: JSON.stringify({ code: "OTP_INVALID" }) });
    }
    requestCount++;
    return route.fulfill({ headers: corsHeaders, contentType: "application/json", body: JSON.stringify({
      challengeId: requestCount === 1 ? challengeId : "replacement-challenge", destinationMasked: "+98******4567",
      expiresAt: new Date(Date.now() + 120000).toISOString(), resendAvailableAt: new Date(Date.now() - 1000).toISOString(),
    }) });
  });
  await page.goto("/login");
  await page.getByLabel("شماره موبایل").fill("bad-number");
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("شماره موبایل معتبر");
  expect(requestCount).toBe(0);
  await page.getByLabel("شماره موبایل").fill("09121234567");
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  const codeInput = page.getByLabel("کد یک‌بارمصرف شش‌رقمی");
  await codeInput.fill("۱۲۳۴۵۶");
  await expect(codeInput).toBeDisabled();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("کد واردشده درست نیست");
  await expect(codeInput).toHaveValue("");
  await expect(codeInput).toBeFocused();
  expect(verifyCount).toBe(1);
  await expect(page.getByRole("button", { name: "ادامه مسیر" })).toHaveCount(0);
  await page.getByRole("button", { name: "ارسال دوباره کد", exact: true }).click();
  await codeInput.fill(testOnlyCode);
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  expect(paths).toContain("/v1/auth/otp/challenges/replacement-challenge/verify");
  await page.getByRole("button", { name: "ویرایش شماره موبایل" }).click();
  await expect(page.getByLabel("شماره موبایل")).toHaveValue("09121234567");
  await expect(page.getByLabel("شماره موبایل")).toBeFocused();
});

test("rejects expired code locally, respects cooldown and handles SMS unavailable", async ({ context, page }) => {
  let verifies = 0;
  await context.route("**/v1/auth/otp/**", async route => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: corsHeaders });
    if (route.request().url().endsWith("/verify")) verifies++;
    return route.fulfill({ headers: corsHeaders, contentType: "application/json", body: JSON.stringify({
      challengeId, destinationMasked: "+98******4567", expiresAt: new Date(Date.now() - 1000).toISOString(),
      resendAvailableAt: new Date(Date.now() + 60000).toISOString(),
    }) });
  });
  await page.goto("/login");
  await page.getByLabel("شماره موبایل").fill("09121234567");
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  await expect(page.getByRole("button", { name: /ارسال دوباره تا/u })).toBeDisabled();
  await page.getByLabel("کد یک‌بارمصرف شش‌رقمی").fill(testOnlyCode);
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("زمان اعتبار کد تمام شده");
  expect(verifies).toBe(0);
  await page.getByRole("button", { name: "ویرایش شماره موبایل" }).click();
  await context.route("**/v1/auth/otp/challenges", route => route.fulfill({ status: 503,
    headers: corsHeaders, contentType: "application/json", body: JSON.stringify({ code: "SMS_PROVIDER_UNAVAILABLE" }),
  }));
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("درگاه پیامک آماده نیست");
  await expect(page.getByRole("dialog").getByRole("alert")).not.toContainText("رمز عبور");
});

test("respects reduced motion and dismisses through the backdrop", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.locator(".landing-auth-panel").evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  await page.locator(".landing-auth-backdrop").click({ position: { x: 10, y: 10 } });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has("login")).toBe(false);
});
