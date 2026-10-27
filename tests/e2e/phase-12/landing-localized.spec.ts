import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdir } from "node:fs/promises";

const cors = { "access-control-allow-origin": "http://localhost:3000", "access-control-allow-credentials": "true", "access-control-allow-headers": "content-type,idempotency-key", "access-control-allow-methods": "POST,OPTIONS" };
const challengeId = "00000000-0000-4000-8000-000000000321";

test.beforeEach(async ({ context }) => {
    await context.route("**/v1/auth/refresh", route => route.fulfill({ status: 401, headers: cors, contentType: "application/json", body: JSON.stringify({ code: "UNAUTHORIZED" }) }));
    await context.route("https://trustseal.enamad.ir/logo.aspx?**", route => route.abort());
});

for (const locale of ["fa", "en", "zh-CN", "ar"] as const) {
    test(`${locale}: localized SSR, four responsive widths, service navigation and keyboard`, async ({ page, context }) => {
        await context.addCookies([{ name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" }]);
        const response = await page.goto(locale === "fa" ? "/" : `/${locale}`);
        expect(response?.status()).toBe(200);
        expect(await response!.text()).toContain(`lang="${locale}"`);
        await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute("href", "http://localhost:3000/ar");
        const rtl = locale === "fa" || locale === "ar";
        await expect(page.locator("html")).toHaveAttribute("dir", rtl ? "rtl" : "ltr");
        for (const width of [320, 390, 768, 1440]) {
            await page.setViewportSize({ width, height: 960 });
            await page.evaluate(() => document.fonts.ready);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
            expect(await page.evaluate(() => getComputedStyle(document.documentElement).direction)).toBe(rtl ? "rtl" : "ltr");
            await expect(page.locator("h1")).toBeVisible();
            const titleFont = await page.locator("h1").evaluate(element => getComputedStyle(element).fontFamily);
            expect(titleFont).toContain(rtl ? "IRANYekanX" : locale === "en" ? "Geist" : "Noto Sans SC");
        }
        const tabs = page.locator(".hero-path-tabs [role=tab]");
        await tabs.nth(0).focus();
        await page.keyboard.press(rtl ? "ArrowLeft" : "ArrowRight");
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
    await dialog.locator(".landing-auth-language button").click();
    await dialog.getByRole("menuitemradio", { name: "English", exact: true }).click();
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
    await dialog.locator(".landing-auth-language button").click();
    await dialog.getByRole("menuitemradio", { name: "简体中文", exact: true }).click();
    await expect(page).toHaveURL(/\/zh-CN\?/);
    await expect(page.locator(".landing-otp-input")).toHaveValue("123");
    await dialog.locator(".landing-auth-language button").click();
    await dialog.getByRole("menuitemradio", { name: "العربية", exact: true }).click();
    await expect(page).toHaveURL(/\/ar\?/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(dialog).toHaveAttribute("dir", "rtl");
    await expect(page.locator(".landing-otp-input")).toHaveValue("123");
    await expect(page.locator(".landing-otp-expiry")).toBeDisabled();
    await expect(page.locator(".landing-auth-heading h2")).toHaveText("تأكيد رقم الهاتف");
    await page.locator(".landing-otp-input").fill("123456");
    await expect(page.locator("#landing-auth-error")).toContainText("الرمز غير صحيح");
    expect(await dialog.innerText()).not.toContain("متن فارسی سرور");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator(".landing-auth-panel").evaluate(panel => Promise.all(panel.getAnimations().map(animation => animation.finished)));
    const panel = await page.locator(".landing-auth-panel").boundingBox();
    expect(panel!.width).toBeLessThanOrEqual(480);
    const close = await page.locator(".landing-auth-close").boundingBox();
    expect(close!.x).toBeLessThan(panel!.x + panel!.width / 2);
    await dialog.locator(".landing-auth-language button").click();
    await dialog.getByRole("menuitemradio", { name: "فارسی", exact: true }).click();
    await expect(page.locator("#landing-auth-error")).toContainText("کد واردشده درست نیست");
    await page.locator(".landing-otp-input").fill("123456");
    await expect(page.locator(".landing-otp.is-success")).toBeVisible();
    await expect(page.getByRole("button", { name: "ادامه مسیر" })).toHaveCount(0);
    await expect(page).toHaveURL("http://localhost:3001/assessment/couples");
    expect(requests).toBe(1);
    expect(verification).toBe(2);
});

for (const width of [390, 1440]) {
    test(`login language menu stays interactive in the native dialog at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 960 });
        await page.goto("/en?login=1");
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await page.locator(".landing-auth-panel").evaluate(panel => Promise.all(panel.getAnimations().map(animation => animation.finished)));
        await page.locator("#landing-phone").fill("09121234567");
        const trigger = dialog.locator(".landing-auth-language button");
        await trigger.click();
        await expect(dialog.getByRole("menu")).toBeVisible();
        await expect(dialog.getByRole("menuitemradio")).toHaveCount(4);
        await page.keyboard.press("Escape");
        await expect(page.getByRole("menu")).not.toBeVisible();
        await expect(dialog).toBeVisible();
        await expect(trigger).toBeFocused();
        await trigger.click();
        await dialog.getByRole("menuitemradio", { name: "简体中文", exact: true }).click();
        await expect(page).toHaveURL(/\/zh-CN\?login=1/);
        await expect(dialog).toBeVisible();
        await expect(page.locator("#landing-phone")).toHaveValue("09121234567");
    });
}

test("legacy routes retain the selected language and safe next destination", async ({ context, page }) => {
    await context.addCookies([{ name: "NEXT_LOCALE", value: "zh-CN", domain: "localhost", path: "/" }]);
    await page.goto("/login?next=" + encodeURIComponent("http://localhost:3001/assessment?resume=1"));
    await expect(page).toHaveURL(/\/zh-CN\/?\?login=1/);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator(".landing-auth-heading h2")).toHaveText("登录");
    expect(new URL(page.url()).searchParams.get("next")).toBe("http://localhost:3001/assessment?resume=1");
});

test("Arabic locale persists, localizes fallback pages and accepts Arabic phone digits", async ({ context, page }) => {
    await context.addCookies([{ name: "NEXT_LOCALE", value: "ar", domain: "localhost", path: "/" }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page).toHaveURL("http://localhost:3000/ar");
    await expect(page).toHaveTitle(/الدكتور شيرمردي/);
    await page.goto("/ar/missing-page");
    await expect(page.getByRole("heading", { name: "الصفحة غير موجودة" })).toBeVisible();
    await page.getByRole("link", { name: "العودة إلى الرئيسية" }).click();
    await expect(page).toHaveURL("http://localhost:3000/ar");
    await page.goto("/login?next=" + encodeURIComponent("http://localhost:3001/assessment?resume=1"));
    await expect(page).toHaveURL(/\/ar\/?\?login=1/);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveAttribute("dir", "rtl");
    await page.locator(".landing-auth-panel").evaluate(panel => Promise.all(panel.getAnimations().map(animation => animation.finished)));
    await page.locator("#landing-phone").fill("٠٩١٢١٢٣٤٥٦٧");
    await expect(page.locator("#landing-phone")).toHaveValue("09121234567");
    await expect(dialog).toContainText("باللغة الفارسية");
    await dialog.locator(".landing-auth-language button").click();
    await expect(dialog.getByRole("menuitemradio", { name: "العربية", exact: true })).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await page.locator(".site-login").click();
    await expect(page.locator("#landing-phone")).toHaveValue("09121234567");
    expect(new URL(page.url()).searchParams.get("next")).toBe("http://localhost:3001/assessment?resume=1");
});

for (const width of [390, 1440]) {
    for (const outcome of ["success", "failure"] as const) {
        test(`footer trust seal stays stable on ${outcome} at ${width}px`, async ({ page }) => {
            let release: (() => void) | undefined;
            await page.route("https://trustseal.enamad.ir/logo.aspx?**", async route => {
                await new Promise<void>(resolve => { release = resolve; });
                if (outcome === "success") await route.fulfill({ path: join(process.cwd(), "apps/web/public/brand/enamad-fallback.png"), contentType: "image/png" });
                else await route.abort();
            });
            await page.setViewportSize({ width, height: 960 });
            await page.goto("/en");
            const seal = page.locator(".footer-enamad");
            await seal.scrollIntoViewIfNeeded();
            await page.locator(".footer-enamad-fallback").evaluate((image: HTMLImageElement) => image.decode());
            await expect.poll(() => Boolean(release)).toBe(true);
            await expect(seal).toHaveAttribute("href", "https://trustseal.enamad.ir/?id=750189&Code=1S4CAYPwv3TxOdNZrWHL0UxywYOkTiSO");
            await expect(seal).toHaveAttribute("referrerpolicy", "origin");
            await expect(seal).toHaveAttribute("target", "_blank");
            await expect(page.locator(".footer-enamad-fallback")).toBeVisible();
            const before = await seal.boundingBox();
            release!();
            if (outcome === "success") {
                await expect(seal).toHaveAttribute("data-loaded", "true");
                await expect(page.locator(".footer-enamad-live")).toHaveCSS("opacity", "1");
                await expect(page.locator(".footer-enamad-fallback")).toBeHidden();
            } else {
                await expect(page.locator(".footer-enamad-live")).toHaveCount(0);
                await expect(page.locator(".footer-enamad-fallback")).toBeVisible();
            }
            expect(await seal.boundingBox()).toEqual(before);
            if (width >= 768) {
                const intro = await page.locator(".footer-intro").boundingBox();
                expect(before!.y).toBeGreaterThanOrEqual(intro!.y + intro!.height);
            } else {
                const contact = await page.locator(".footer-contact").boundingBox();
                expect(before!.x).toBeGreaterThanOrEqual(contact!.x + contact!.width);
            }
        });
    }
}

for (const locale of ["fa", "en", "zh-CN", "ar"]) {
    test(`${locale}: hero quote types and erases words without resizing, respects reduced motion`, async ({ context, page }) => {
        await context.addCookies([{ name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" }]);
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width: 810, height: 960 });
        await page.goto(locale === "fa" ? "/" : `/${locale}`);
        const words = page.locator(".word-loop-word");
        const visible = page.locator('.word-loop-word[data-visible="true"]');
        const count = await words.count();
        expect(count).toBeGreaterThan(1);
        await expect(visible).toHaveCount(count);
        const accessible = await page.locator(".word-loop-accessible").textContent();
        await page.clock.install();
        await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100)));
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await expect(visible).toHaveCount(0);
        const before = await page.locator(".hero-quote").boundingBox();
        await page.clock.runFor(310);
        await expect(visible).toHaveCount(1);
        await page.clock.runFor(300 * (count - 1));
        await expect(visible).toHaveCount(count);
        expect(await page.locator(".hero-quote").boundingBox()).toEqual(before);
        await page.clock.runFor(3200 + 130 * (count - 1) + 10);
        await expect(visible).toHaveCount(0);
        await page.clock.runFor(550);
        await expect(visible).toHaveCount(1);
        await expect(page.locator(".word-loop-accessible")).toHaveText(accessible!);
        await page.emulateMedia({ reducedMotion: "reduce" });
        await expect(visible).toHaveCount(count);
        await page.clock.runFor(10000);
        await expect(visible).toHaveCount(count);
    });
}

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
