import { chromium, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';

const base = process.env.APP_URL ?? 'http://127.0.0.1:3017';
await mkdir('.local/brand', { recursive: true });
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 375, height: 812 } });
const errors = []; page.on('pageerror', error => errors.push(error.message));
let entry = { required: false };
await page.route('**/v1/**', route => {
  const request = route.request(), p = new URL(request.url()).pathname;
  const headers = { 'access-control-allow-origin': new URL(base).origin, 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' };
  const send = body => route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(body) });
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
  if (p.endsWith('/auth/refresh')) return send({ accessToken: 'fixture', expiresIn: 3600, user: { id: '11111111-1111-4111-8111-111111111111', roles: ['PATIENT'] } });
  if (request.method() !== 'GET') throw new Error('Unexpected mutation');
  if (p.endsWith('/entry')) return send(entry);
  if (p.endsWith('/addresses')) return send([]);
  if (p.endsWith('/journey')) return send({ onboarding: { isComplete: true }, home: { latestAssessment: null, activeTreatmentPlanId: null, actions: [] } });
  if (p.endsWith('/recommendations')) return send({ status: 'NO_RESULT', items: [] });
  return send({ items: [], total: 0 });
});
try {
  for (const [url, file] of [['/favicon.ico', 'favicon.ico'], ['/icon.svg', 'icon.svg'], ['/apple-icon.png', 'apple-icon.png']]) {
    const response = await page.request.get(base + url);
    expect(response.status()).toBe(200);
    expect(await response.body()).toEqual(await readFile(`src/app/${file}`));
  }
  for (const route of ['/', '/store']) {
    await page.goto(base + route);
    if (route === '/') {
      await page.getByRole('heading', { name: 'خانهٔ سلامت شما', exact: true }).waitFor();
      expect(await page.locator('.home-header .app-brand-logo').count()).toBe(0);
    } else await page.locator('.store-brand .app-brand-logo').waitFor();
    expect(await page.title()).toBe('دکتر شیرمردی');
    expect(await page.locator('body').innerText()).not.toContain('سبز زندگی');
    await page.screenshot({ path: `.local/brand/${route === '/' ? 'home' : 'store'}.png` });
  }
  entry = { required: true, phase: 'PROFILE', assessmentRequired: false };
  await page.goto(base + '/welcome');
  await page.locator('.app-brand-logo--animated').waitFor();
  expect(await page.locator('.app-brand-logo__part').count()).toBe(6);
  for (const width of [320, 375, 414, 768, 1440]) {
    await page.setViewportSize({ width, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: '.local/brand/welcome.png' });
  expect(await page.locator('.app-brand-logo__part').first().evaluate(el => getComputedStyle(el).animationName)).toBe('app-brand-assemble');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.app-brand-logo__part').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  expect(errors).toEqual([]);
  console.log('PASS: exact landing icons, static/animated marks, metadata, 5 widths, reduced motion; zero page exceptions/writes.');
} finally { await browser.close(); }
