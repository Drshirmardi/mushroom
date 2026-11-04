import { chromium } from '@playwright/test';
import { verifyStoreImages } from './store-images-browser.mjs';

const base = process.env.APP_URL ?? 'http://127.0.0.1:3017';
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 375, height: 812 } });
page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
await page.route('**/v1/**', route => {
  const request = route.request(), path = new URL(request.url()).pathname;
  const headers = { 'access-control-allow-origin': base, 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' };
  const send = data => route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(data) });
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
  if (path.endsWith('/auth/refresh')) return send({ accessToken: 'fixture', expiresIn: 3600, user: { id: '11111111-1111-4111-8111-111111111111', roles: ['PATIENT'] } });
  if (path.endsWith('/entry')) return send({ required: false });
  if (path.endsWith('/addresses')) return send([]);
  if (path.startsWith('/v1/commerce/')) return route.fallback();
  if (request.method() !== 'GET') throw new Error('Unexpected mutation');
  return send({ items: [], total: 0 });
});
try {
  await verifyStoreImages(page, base);
  console.log('PASS: real/missing/failed product images, product switching, RTL and stable layout.');
} catch (error) {
  console.error(JSON.stringify({ url: page.url(), body: (await page.locator('body').innerText()).slice(0, 1800) }));
  throw error;
} finally { await browser.close(); }
