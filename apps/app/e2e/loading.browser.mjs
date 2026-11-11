import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// All API requests, including mutations, are intercepted. No real patient/provider writes.
const base = process.env.APP_URL ?? 'http://127.0.0.1:3017';
const output = new URL('../.local/loading/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
page.setDefaultTimeout(10_000);
const id = '11111111-1111-4111-8111-111111111111';
const manifest = [], errors = [], warnings = [], responses = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) responses.push({ url: response.url(), status: response.status() }); });
const record = (action, selector = '') => manifest.push({ at: new Date().toISOString(), route: new URL(page.url()).pathname, action, selector });
const shot = async name => { await page.screenshot({ path: new URL(`${name}.png`, output).pathname.replace(/^\/([A-Za-z]:)/, '$1') }); record(`screenshot: ${name}`); };
const pending = [];
let holdAuth = true, mode = 'hold', writeGate, writes = 0, appointmentReads = 0;
let entry = { required: false }, paymentRequests = 0;
const appointment = (key, day) => ({ id: key, startsAt: `2026-11-${day}T10:00:00Z`, status: 'CONFIRMED' });
const preferences = { items: [{ category: 'FINANCIAL', inAppEnabled: true }, { category: 'REMINDER', inAppEnabled: true }] };
const product = { id, title: 'محصول آزمایشی', slug: 'sample', category: { id, name: 'محصولات' }, image: { id, contentPath: `/v1/commerce/products/${id}/images/${id}`, altText: 'تصویر محصول', mimeType: 'image/svg+xml', width: 80, height: 80 }, skus: [{ id, code: 'TEST', title: null, currentPriceToman: '125000', currentTaxToman: '0' }] };
let releaseImage, holdImage = false;
await page.route('**/v1/**', async route => {
  const request = route.request(), url = new URL(request.url()), p = url.pathname;
  const headers = { 'access-control-allow-origin': request.headers().origin || '*', 'access-control-allow-credentials': 'true' };
  const send = (data, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) }).catch(() => {});
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'authorization,content-type,idempotency-key,x-marriage-request-id' } });
  if (p.endsWith('/auth/refresh')) {
    if (holdAuth) await new Promise(resolve => pending.push(resolve));
    return send({ accessToken: 'loading-fixture', expiresIn: 3600, user: { id, roles: ['PATIENT'] } });
  }
  if (p.endsWith('/entry')) return send(entry);
  if (request.method() !== 'GET') {
    const write = ++writes;
    if (p.endsWith('/health-observations') && request.method() === 'POST') {
      await writeGate;
      return send({ id: `${id}-${write}`, ...request.postDataJSON() });
    }
    if (p.endsWith('/entry/payment')) {
      paymentRequests++; await writeGate; return send({ code: 'INJECTED_PAYMENT_FAILURE' }, 503);
    }
    throw new Error(`Unexpected mutation: ${request.method()} ${p}`);
  }
  if (p.includes('/images/')) {
    if (holdImage) await new Promise(resolve => { releaseImage = resolve; });
    return route.fulfill({ status: 200, headers, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="blue"/></svg>' }).catch(() => {});
  }
  if (mode === 'hold') await new Promise(resolve => pending.push(resolve));
  if (mode === 'error') return send({ code: 'LOADING_TEST_FAILURE' }, 503);
  if (p.endsWith('/notifications/preferences')) return send(preferences);
  if (p === '/v1/appointments') {
    appointmentReads++;
    const read = appointmentReads;
    if (mode === 'race' && read <= 3 && read > 1) await new Promise(resolve => pending.push(resolve));
    return send({ items: [appointment(`read-${read}`, read === 3 ? '20' : read === 2 ? '19' : '18')], total: 1 });
  }
  if (p.endsWith('/health-observations')) return send({ items: [] });
  if (p === '/v1/commerce/products') return send({ items: [product], total: 1, page: 1, pageSize: 20 });
  if (p === `/v1/commerce/products/${id}`) return send(product);
  if (p.endsWith('/addresses')) return send([]);
  if (p.endsWith('/recommendations')) return send({ status: 'NO_RESULT', items: [] });
  if (p.endsWith('/banners')) return send({ items: [] });
  return send({ items: [], total: 0 });
});
const release = () => pending.splice(0).forEach(resolve => resolve());
try {
  await page.goto(`${base}/profile/notifications`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-heartbeat="screen"]').waitFor();
  expect(await page.locator('body').innerText()).not.toContain('آماده‌سازی');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.heartbeat__trace').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await shot('bootstrap'); record('bootstrap ECG shown');
  holdAuth = false; release();
  await page.locator('[data-loading-skeleton="settings"]').waitFor();
  for (const width of [320, 375, 414, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.getByRole('navigation', { name: 'ناوبری اصلی' }).isVisible()).toBe(true);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.loading-state').first().evaluate(el => getComputedStyle(el, '::after').animationName)).toBe('none');
  await page.addStyleTag({ content: 'html {font-size:200% !important}' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await shot('settings-skeleton-zoom');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  mode = 'error'; release();
  await page.getByRole('button', { name: 'تلاش دوباره', exact: true }).waitFor();
  expect(await page.locator('[data-loading-skeleton]').count()).toBe(0);
  await shot('settings-error');
  mode = 'hold'; await page.getByRole('button', { name: 'تلاش دوباره', exact: true }).click();
  record('clicked retry', 'button:has-text("تلاش دوباره")');
  await page.locator('[data-loading-skeleton="settings"]').waitFor();
  mode = 'full'; release();
  await page.getByText('مالی و کیف پول', { exact: true }).waitFor();
  await shot('settings-loaded');

  // Latest response wins; a refresh failure leaves the known appointment visible.
  await page.goto(`${base}/appointments`);
  await page.locator('a[href="/appointments/read-1"]').waitFor();
  mode = 'race';
  await page.getByRole('button', { name: 'به‌روزرسانی', exact: true }).click();
  await expect.poll(() => appointmentReads).toBe(2);
  expect(await page.locator('a[href="/appointments/read-1"]').count()).toBe(1);
  await page.locator('.loading-refresh [data-heartbeat]').waitFor();
  await page.getByRole('button', { name: 'به‌روزرسانی', exact: true }).click();
  await expect.poll(() => appointmentReads).toBe(3);
  pending.pop()();
  await page.locator('a[href="/appointments/read-3"]').waitFor();
  release(); await page.waitForTimeout(200);
  expect(await page.locator('a[href="/appointments/read-2"]').count()).toBe(0);
  record('newest response retained after older request completed');
  mode = 'error'; await page.getByRole('button', { name: 'به‌روزرسانی', exact: true }).click();
  await page.getByRole('button', { name: 'دریافت دوباره', exact: true }).waitFor();
  expect(await page.locator('a[href="/appointments/read-3"]').count()).toBe(1);
  await shot('appointments-refresh-error-retains-data');

  // Existing user inputs survive the pending operation; each of four metrics is sent once.
  mode = 'full'; await page.goto(`${base}/trackers/mood`);
  await page.getByRole('button', { name: 'ثبت حال امروز', exact: true }).waitFor();
  await page.locator('input[type="range"]').first().fill('9'); record('typed sleep value', 'input[type="range"]');
  let releaseWrite; writeGate = new Promise(resolve => { releaseWrite = resolve; });
  await page.getByRole('button', { name: 'ثبت حال امروز', exact: true }).click();
  const busy = page.locator('button[aria-busy="true"]');
  await busy.locator('[data-heartbeat="inline"]').waitFor();
  await expect(busy).toBeDisabled();
  expect(await page.locator('input[type="range"]').first().inputValue()).toBe('9');
  await shot('operation-ecg');
  await expect.poll(() => writes).toBe(4); releaseWrite();
  await page.getByRole('button', { name: 'ثبت حال امروز', exact: true }).waitFor();
  record('operation finished and input retained');

  // A static-label asynchronous control owns its own ECG and rejects duplicate clicks.
  entry = { required: true, phase: 'PAYMENT', assessmentTitle: 'آزمون آزمایشی', amountRial: '10000', introduction: 'شرایط آزمون آزمایشی', canDefer: false };
  await page.goto(base + '/welcome');
  const payment = page.getByRole('button', { name: 'ادامه به پرداخت', exact: true });
  await payment.waitFor();
  writeGate = new Promise(resolve => { releaseWrite = resolve; });
  await payment.click();
  await payment.locator('[data-heartbeat]').waitFor(); await expect(payment).toBeDisabled();
  await expect.poll(() => paymentRequests).toBe(1);
  await shot('async-action-ecg'); releaseWrite();
  await expect(payment).toBeEnabled();
  expect(paymentRequests).toBe(1); record('async control recovered from failure; only one payment request');
  entry = { required: false };

  mode = 'full'; holdImage = true;
  await page.goto(`${base}/store/products/${id}`);
  const image = page.locator('.store-gallery__slide .product-image-frame').first();
  await expect(image).toHaveAttribute('data-pending', 'true');
  const before = await image.boundingBox(); expect(before.height).toBeGreaterThan(100);
  await shot('image-skeleton');
  await expect.poll(() => Boolean(releaseImage)).toBe(true); holdImage = false; releaseImage();
  await expect(image).toHaveAttribute('data-pending', 'false');
  const after = await image.boundingBox(); expect(Math.abs(before.height - after.height)).toBeLessThanOrEqual(1);
  await shot('image-loaded');

  // Read-only smoke of each fetch family: hold requests to inspect initial skeletons.
  for (const route of ['/articles', '/profile/medical', '/profile/history', '/appointments/summary', '/profile/health-record', '/profile/security', '/store/orders', '/store/cart', '/store/checkout', '/store/payment?orderId=test', '/profile/wallet', '/appointments/book', `/appointments/book/schedule?doctorId=${id}&doctorServiceId=${id}`, '/assessment', '/assessment/result?submissionId=test', '/assessment/resume?submissionId=test', '/programs', '/treatment', '/chat?appointmentId=test']) {
    mode = 'hold'; await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-loading-skeleton], [data-assessment-skeleton], [aria-busy="true"] .skeleton').first().waitFor();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    record('initial skeleton verified', route);
    mode = 'error'; release();
    await page.waitForTimeout(100);
  }
  // Requests that never settle still stop the skeleton at the existing 10s limit.
  await page.clock.install();
  mode = 'full'; holdImage = true;
  await page.goto(`${base}/store/products/${id}`);
  await expect(page.locator('.store-gallery__slide .product-image-frame').first()).toHaveAttribute('data-pending', 'true');
  await page.clock.runFor(10_100);
  await expect(page.locator('.store-gallery__slide .product-image-frame').first()).toHaveAttribute('data-pending', 'false');
  await expect(page.locator('.store-gallery__slide img').first()).toHaveAttribute('src', /^data:image/);
  holdImage = false; releaseImage?.(); record('stalled visible image reached its neutral fallback');
  mode = 'hold'; await page.goto(base + '/articles');
  await page.locator('[data-loading-skeleton]').first().waitFor();
  await page.clock.runFor(10_100);
  await page.getByRole('button', { name: 'دریافت دوباره', exact: true }).waitFor();
  expect(await page.locator('[data-loading-skeleton]').count()).toBe(0);
  record('stalled read ended in retry state at request timeout');
  mode = 'error'; release();
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ PASS: true, scope: 'controlled loading checks; not a full live UX audit', widths: 7, writes, expectedInjectedFailures: responses.filter(r => r.status === 503).length, warnings, interactions: manifest.length }));
} catch (error) {
  await shot('failure'); console.error(JSON.stringify({ errors, warnings, body: (await page.locator('body').innerText()).slice(-1800) })); throw error;
} finally {
  holdAuth = false; mode = 'error'; release(); releaseImage?.();
  await writeFile(new URL('manifest.json', output), JSON.stringify({ manifest, errors, warnings, responses }, null, 2));
  await browser.close();
}
