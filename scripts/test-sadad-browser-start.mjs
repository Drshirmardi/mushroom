import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
require('reflect-metadata');
const Fastify = require('fastify');
const { SadadCallbackController } = require('./dist/modules/commerce/payments/patient-payment-attempt.controller.js');
const { buildSadadStartUrl } = require('./dist/modules/commerce/payments/sadad-browser-start.js');
const api = Fastify();
const runtime = { settings: () => ({ redirectProfile: 'PHP_VPG_PURCHASE' }) };
const controller = new SadadCallbackController({}, { consume: async () => true }, runtime);
api.get('/v1/payments/providers/sadad/start', (request, reply) => controller.start(request, reply));
await api.listen({ port: 0, host: '127.0.0.1' });
const local = api.server.address();
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const bankRequests = [];
  const merchantRequests = [];
  await context.route('https://merchant.example.test/**', async route => {
    merchantRequests.push(route.request().url());
    const url = new URL(route.request().url());
    const response = await fetch(`http://127.0.0.1:${local.port}${url.pathname}`);
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
  });
  await context.route('https://sadad.shaparak.ir/**', async route => {
    bankRequests.push({ url: route.request().url(), referer: route.request().headers().referer });
    await route.fulfill({ contentType: 'text/html', body: '<title>Synthetic bank</title>' });
  });
  await context.route('https://dev-app.example.test/**', route => route.fulfill({ contentType: 'text/html', body: '<button>Continue</button>' }));
  const page = await context.newPage();
  const token = 'synthetic+/=token';
  const start = buildSadadStartUrl('https://merchant.example.test/v1/payments/providers/sadad/callback', token);
  await page.goto('https://dev-app.example.test/');
  await page.evaluate(url => { document.querySelector('button').onclick = () => location.assign(url); }, start);
  await page.getByRole('button').click();
  await page.waitForURL('https://sadad.shaparak.ir/**');
  assert.equal(bankRequests.length, 1);
  assert.equal(bankRequests[0].referer, 'https://merchant.example.test/');
  assert.equal(new URL(bankRequests[0].url).searchParams.get('Token'), token);
  assert.equal(merchantRequests[0], 'https://merchant.example.test/v1/payments/providers/sadad/start');
  for (const fragment of ['', '#%00bad', '#%E0%A4%A']) {
    await page.goto('https://merchant.example.test/v1/payments/providers/sadad/start' + fragment);
    await page.getByRole('status').filter({ hasText: 'پیوند پرداخت معتبر نیست' }).waitFor();
    assert.equal(bankRequests.length, 1);
  }
  await context.close();
  console.log('Sadad browser navigation PASS: real merchant document, merchant Referer, encoded token, fragment excluded from HTTP requests, malformed-token refusal; no bank contacted.');
} finally {
  await browser.close();
  await api.close();
}
