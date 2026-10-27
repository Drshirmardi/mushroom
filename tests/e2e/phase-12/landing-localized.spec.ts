import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdir } from "node:fs/promises";

const cors = { "access-control-allow-origin": "http://localhost:3000", "access-control-allow-credentials": "true", "access-control-allow-headers": "content-type,idempotency-key", "access-control-allow-methods": "POST,OPTIONS" };
const challengeId = "00000000-0000-4000-8000-000000000321";

test.beforeEach(async ({ context }) => {
    await context.route("**/v1/auth/refresh", route => route.fulfill({ status: 401, headers: cors, contentType: "application/json", body: JSON.stringify({ code: "UNAUTHORIZED" }) }));
});

for (const locale of ["fa", "en", "zh-CN"] as const) {
    test(`${locale}: localized SSR, four responsive widths, service navigation and keyboard`, async ({ page, context }) => {
        await context.addCookies([{ name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" }]);
        const response = await page.goto(locale === "fa" ? "/" : `/${locale}`);
        expect(response?.status()).toBe(200);
        expect(await response!.text()).toContain(`lang="${locale}"`);
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "fa" ? "rtl" : "ltr");
        for (const width of [320, 390, 768, 1440]) {
            await page.setViewportSize({ width, height: 960 });
            await page.evaluate(() => document.fonts.ready);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
            expect(await page.evaluate(() => getComputedStyle(document.documentElement).direction)).toBe(locale === "fa" ? "rtl" : "ltr");
            await expect(page.locator("h1")).toBeVisible();
            const titleFont = await page.locator("h1").evaluate(element => getComputedStyle(element).fontFamily);
            expect(titleFont).toContain(locale === "fa" ? "IRANYekanX" : locale === "en" ? "Geist" : "Noto Sans SC");
        }
        const tabs = page.locator(".hero-path-tabs [role=tab]");
        await tabs.nth(0).focus();
        await page.keyboard.press(locale === "fa" ? "ArrowLeft" : "ArrowRight");
        await expect(tabs.nth(1)).toBeFocused();
        await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
        await expect(page.locator(".hero-path-panel")).toHaveAttribute("id", "hero-panel-1");
        await page.locator(".service-tabs [role=tab]").nth(3).click();
        await expect(page.locator(".service-panel")).toHaveAttribute("id", "service-panel-3");
        await page.locator(".faq-list summary").first().click();
        await expect(page.locator(".faq-list details").first()).toHaveAttribute("open", "");
        await expect(page.locator('main a[href="#"]')).toHaveCount(0);
        expect(await page.locator("main").innerText()).not.toMatch(/معجزه|ACUHEALTH20|۱۰،۰۰۰|۹۸٪/);
        await page.setViewportSize({ width: 1440, height: 1000 });
        await tabs.nth(0).click();
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        const output = process.env.LANDING_SCREENSHOT_DIR ?? join(tmpdir(), "mushroom-landing-preview");
        await mkdir(output, { recursive: true });
        await page.screenshot({ path: join(output, `landing-${locale}-desktop.png`) });
        if (locale === "fa") await page.screenshot({ path: join(output, "landing-fa-full.png"), fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({ path: join(output, `landing-${locale}-mobile.png`) });
    });
}

test("mobile/desktop dialogs retain phone and OTP across all locale changes, errors and automatic success", async ({ context, page }) => {
    let requests = 0;
    let verification = 0;
    await context.route("http://localhost:3001/**", route => route.fulfill({ contentType: "text/html", body: "<main>patient destination</main>" }));
    await context.route("**/v1/auth/otp/**", async route => {
        if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
        if (route.request().url().endsWith("/verify")) {
            verification++;
            if (verification === 1) return route.fulfill({ status: 400, headers: cors, contentType: "application/json", body: JSON.stringify({ code: "OTP_INVALID", message: "متن فارسی سرور" }) });
            return route.fulfill({ headers: cors, contentType: "application/json", body: JSON.stringify({ accessToken: "test-only-token", tokenType: "Bearer", expiresIn: 900, user: { id: "00000000-0000-4000-8000-000000000009", phone: "+989121234567", roles: ["PATIENT"] } }) });
        }
        requests++;
        expect(route.request().postDataJSON()).toEqual({ phone: "09121234567", remember: true });
        return route.fulfill({ headers: cors, contentType: "application/json", body: JSON.stringify({ challengeId, destinationMasked: "+98******4567", expiresAt: new Date(Date.now() + 120000).toISOString(), resendAvailableAt: new Date(Date.now() + 60000).toISOString() }) });
    });
    await context.addCookies([{ name: "NEXT_LOCALE", value: "fa", domain: "localhost", path: "/" }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.locator(".hero-path-tabs [role=tab]").nth(1).click();
    await page.locator(".hero-path-panel .landing-button").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.locator(".landing-auth-panel").evaluate(panel => Promise.all(panel.getAnimations().map(animation => animation.finished)));
    const mobilePanel = await page.locator(".landing-auth-panel").boundingBox();
    expect(mobilePanel!.x).toBe(0);
    expect(mobilePanel!.width).toBe(390);
    expect(new URL(page.url()).searchParams.get("next")).toBe("http://localhost:3001/assessment/couples");
    await page.locator("#landing-phone").fill("bad!۰۹۱21234567");
    await expect(page.locator("#landing-phone")).toHaveValue("۰۹۱۲۱۲۳۴۵۶۷");
    await dialog.getByRole("combobox").selectOption("en");
    await expect(page).toHaveURL(/\/en\?/);
    await expect(dialog).toBeVisible();
    await expect(page.locator("#landing-phone")).toHaveValue("09121234567");
    await expect(page.locator(".landing-auth-heading p")).toContainText("Iranian");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(page.locator(".site-login")).toBeFocused();
    await page.locator(".site-login").click();
    await expect(page.locator("#landing-phone")).toHaveValue("09121234567");
    await dialog.getByRole("button", { name: "Send sign-in code" }).click();
    await expect(page.locator(".landing-otp-input")).toBeVisible();
    await page.locator(".landing-otp-input").fill("123");
    await dialog.getByRole("combobox").selectOption("zh-CN");
    await expect(page).toHaveURL(/\/zh-CN\?/);
    await expect(page.locator(".landing-otp-input")).toHaveValue("123");
    await expect(page.locator(".landing-otp-expiry")).toBeDisabled();
    await expect(page.locator(".landing-auth-heading h2")).toHaveText("验证手机号码");
    await page.locator(".landing-otp-input").fill("123456");
    await expect(page.locator("#landing-auth-error")).toContainText("验证码不正确");
    expect(await dialog.innerText()).not.toContain("متن فارسی سرور");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator(".landing-auth-panel").evaluate(panel => Promise.all(panel.getAnimations().map(animation => animation.finished)));
    const panel = await page.locator(".landing-auth-panel").boundingBox();
    expect(panel!.width).toBeLessThanOrEqual(480);
    const close = await page.locator(".landing-auth-close").boundingBox();
    expect(close!.x).toBeLessThan(panel!.x + panel!.width / 2);
    await dialog.getByRole("combobox").selectOption("fa");
    await expect(page.locator("#landing-auth-error")).toContainText("کد واردشده درست نیست");
    await page.locator(".landing-otp-input").fill("123456");
    await expect(page.locator(".landing-otp.is-success")).toBeVisible();
    await expect(page.getByRole("button", { name: "ادامه مسیر" })).toHaveCount(0);
    await expect(page).toHaveURL("http://localhost:3001/assessment/couples");
    expect(requests).toBe(1);
    expect(verification).toBe(2);
});

test("legacy routes retain the selected language and safe next destination", async ({ context, page }) => {
    await context.addCookies([{ name: "NEXT_LOCALE", value: "zh-CN", domain: "localhost", path: "/" }]);
    await page.goto("/login?next=" + encodeURIComponent("http://localhost:3001/assessment?resume=1"));
    await expect(page).toHaveURL(/\/zh-CN\/?\?login=1/);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator(".landing-auth-heading h2")).toHaveText("登录");
    expect(new URL(page.url()).searchParams.get("next")).toBe("http://localhost:3001/assessment?resume=1");
});

test("localized not-found and reduced-motion remain usable", async ({ context, page }) => {
    await context.addCookies([{ name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" }]);
    await page.goto("/en/missing-page");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(page).toHaveURL("http://localhost:3000/en");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 640, height: 700 });
    await page.locator(".site-login").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await page.locator(".landing-auth-panel").evaluate(panel => getComputedStyle(panel).animationName)).toBe("none");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
});
