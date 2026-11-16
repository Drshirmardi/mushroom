import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { installStoreProductFixture } from './store-product-ux-fixture.mjs';
const base = process.env.APP_URL || 'http://127.0.0.1:3018';
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 375, height: 812 } });
page.setDefaultTimeout(8000); await installStoreProductFixture(page);
const items = [
  { encounterId: 'e1', appointmentId: 'a1', completedAt: '2025-01-01T10:00:00Z', patientSummary: 'خلاصه قدیمی', revisionNumber: 1 },
  { encounterId: 'e2', appointmentId: 'a2', completedAt: '2026-01-01T10:00:00Z', patientSummary: 'خلاصه تازه\n' + 'توضیح طولانی برای خواندن بیمار. '.repeat(30) + 'https://example.test/' + 'x'.repeat(200), revisionNumber: 2 },
  { encounterId: 'e3', appointmentId: 'a3', completedAt: 'invalid', patientSummary: '', revisionNumber: 1 },
];
const state = { items, status: 200, hold: false, reads: 0 }, errors = [], manifest = [];
page.on('pageerror', e => errors.push(e.message));
await page.route('**/v1/patients/me/clinical/history', async route => {
  const headers = { 'access-control-allow-origin': route.request().headers().origin || '*', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,OPTIONS' };
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
  state.reads++; if (state.hold) await new Promise(resolve => { state.release = resolve; });
  return route.fulfill({ status: state.status, headers, contentType: 'application/json', body: JSON.stringify(state.status === 200 ? { items: state.items } : {}) });
});
await mkdir('.local/clinical-history', { recursive: true });
const log = action => manifest.push({ at: new Date().toISOString(), action });
try {
  await page.goto(base + '/profile/history'); await page.locator('article').first().waitFor();
  expect(await page.locator('article').first().textContent()).toContain('خلاصه تازه');
  await expect(page.getByText('تاریخ ثبت نشده', { exact: true })).toBeVisible();
  await page.screenshot({ path: '.local/clinical-history/closed.png' });
  await page.getByText('مشاهدهٔ خلاصهٔ ویزیت', { exact: true }).click(); await expect(page.getByText('خلاصه تازه', { exact: false })).toBeVisible();
  log('open full clinical summary; latest-first and malformed date fallback');
  await page.screenshot({ path: '.local/clinical-history/open.png' });
  for (const width of [320, 375, 414, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; }); log('seven-width and text200% long URL reflow');
  state.release = null; state.hold = true; await page.getByRole('button', { name: 'تازه‌سازی سوابق', exact: true }).click();
  await expect.poll(() => typeof state.release).toBe('function');
  await expect(page.locator('ul[aria-busy="true"]')).toBeVisible(); expect(await page.locator('article').count()).toBe(3);
  expect(await page.locator('details').getAttribute('open')).not.toBeNull();
  await expect(page.locator('[data-loading-skeleton]')).toHaveCount(0);
  state.hold = false; state.status = 503; state.release(); await page.getByRole('button', { name: 'دریافت دوباره', exact: true }).waitFor();
  expect(await page.locator('article').count()).toBe(3); log('transient refresh error keeps valid summaries and open disclosure');
  state.status = 403; await page.getByRole('button', { name: 'دریافت دوباره', exact: true }).click(); await expect(page.locator('article')).toHaveCount(0);
  state.release = null; state.hold = true; await page.getByRole('button', { name: 'دریافت دوباره', exact: true }).click();
  await expect.poll(() => typeof state.release).toBe('function'); expect(await page.locator('article').count()).toBe(0);
  state.hold = false; state.status = 200; state.release(); await expect(page.locator('article')).toHaveCount(3);
  log('denial clears private data; retry never resurrects old summaries while pending');
  state.items = []; await page.getByRole('button', { name: 'تازه‌سازی سوابق', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'هنوز خلاصهٔ ویزیتی منتشر نشده است', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'نسخه‌ها و برنامهٔ درمان من', exact: true }).click(); await page.waitForURL('**/treatment');
  await page.goBack(); await page.getByRole('heading', { name: 'سوابق درمانی', exact: true }).waitFor(); log('empty state and treatment round trip');
  await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.0/axe.min.js' });
  const axe = await page.evaluate(async () => (await window.axe.run(document.querySelector('.patient-app-shell'))).violations.map(v => ({ id: v.id, impact: v.impact })));
  expect(axe.filter(v => ['critical', 'serious'].includes(v.impact))).toEqual([]); expect(errors).toEqual([]);
  await page.reload(); await page.getByRole('button', { name: 'بازگشت', exact: true }).click(); await page.waitForURL('**/profile');
  log('direct-entry Back has deterministic profile fallback');
  await writeFile('.local/clinical-history/manifest.json', JSON.stringify({ manifest, errors, axe, reads: state.reads }, null, 2));
  console.log(JSON.stringify({ PASS: true, scenarios: manifest.length, errors, axe }));
} catch (e) { await page.screenshot({ path: '.local/clinical-history/failure.png' }); throw e; }
finally { await browser.close(); }
