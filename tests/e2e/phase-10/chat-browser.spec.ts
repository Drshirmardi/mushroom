import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { cancelChatBrowserFixture, createChatBrowserFixture, disposablePhone, openDatabase } from "./chat-browser.fixture";

type BrowserIssues = { external: string[]; errors: string[]; tokenInUrl: string[] };
const localOrigin = /^(?:https?|wss?):\/\/localhost(?::\d+)?(?:\/|$)/u;

function guardPage(page: Page, issues: BrowserIssues) {
  page.on("request", (request) => {
    const url = request.url();
    if (!localOrigin.test(url)) issues.external.push(new URL(url).host);
    if (/(?:[?&](?:token|access_token|authorization)=)/iu.test(url)) issues.tokenInUrl.push(url);
  });
  page.on("pageerror", (error) => issues.errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !/^Failed to load resource:/u.test(message.text())) issues.errors.push(message.text());
  });
}

async function registerAndLogin(context: BrowserContext, phone: string, password: string, issues: BrowserIssues) {
  const page = await context.newPage();
  guardPage(page, issues);
  await page.goto("http://localhost:3000/signup");
  await page.getByLabel("شماره موبایل").fill(phone);
  await page.getByLabel("رمز عبور", { exact: true }).fill(password);
  await page.getByLabel("تکرار رمز عبور").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "ثبت‌نام" }).click();
  await expect(page).toHaveURL(/http:\/\/localhost:3000\/login/u);
  await page.getByLabel("شماره موبایل").fill(phone);
  await page.getByLabel("رمز عبور", { exact: true }).fill(password);
  const refreshResponse = page.waitForResponse((response) => response.request().method() === "POST" && /\/v1\/auth\/refresh$/u.test(response.url()));
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page).toHaveURL(/http:\/\/localhost:3001\//u);
  expect((await refreshResponse).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "دکتر شیرمردی", exact: true })).toBeVisible();
  return page;
}

test("patient completes the real browser text-chat flow without media or token URL leakage", async ({ browser }) => {
  const database = await openDatabase();
  const runId = `f10-browser-${Date.now()}`;
  const phone = disposablePhone(runId);
  const password = "F10-browser-disposable-password";
  const issues: BrowserIssues = { external: [], errors: [], tokenInUrl: [] };
  const context = await browser.newContext();
  let appointmentId: string | undefined;
  try {
    for (const port of [3000, 3001, 3003]) expect((await fetch(`http://127.0.0.1:${port}${port === 3003 ? "/v1/health/live" : "/"}`, { redirect: "manual" })).status).toBeLessThan(500);
    const page = await registerAndLogin(context, phone, password, issues);
    const fixture = await createChatBrowserFixture(database, phone);
    appointmentId = fixture.appointmentId;
    const body = `F10 synthetic text ${fixture.runId}`;
    const sendResponse = page.waitForResponse((response) => response.request().method() === "POST" && /\/v1\/chat\/conversations\/[^/]+\/messages$/u.test(response.url()));
    await page.goto(`http://localhost:3001/chat?appointmentId=${appointmentId}`);
    await expect(page.getByText("گفتگوی مشاوره", { exact: true })).toBeVisible();
    await expect(page.getByText("متصل", { exact: false })).toBeVisible();
    await expect(page.getByPlaceholder("پیام متنی…")).toBeEnabled();
    await expect(page.getByRole("button", { name: /تماس|ویدئو|صوت/u })).toHaveCount(0);
    await page.getByPlaceholder("پیام متنی…").fill(body);
    await page.getByRole("button", { name: "ارسال پیام" }).click();
    expect((await sendResponse).status()).toBe(201);
    await expect(page.getByText(body, { exact: true })).toBeVisible();
    expect(issues.external).toEqual([]);
    expect(issues.tokenInUrl).toEqual([]);
    expect(issues.errors.filter((message) => !/Download the React DevTools/u.test(message))).toEqual([]);
  } finally {
    if (appointmentId) await cancelChatBrowserFixture(database, { appointmentId, runId });
    await context.close();
    await database.end();
  }
});
