import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { chromium } from '@playwright/test';

async function sdk(page) {
  const files = ['analytics.ts', 'analytics-context.ts', 'analytics-operations.ts', 'analytics-browser.ts'];
  const source = (await Promise.all(files.map(file => readFile(new URL(file, import.meta.url), 'utf8')))).join('\n').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  await page.addScriptTag({ content: ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }) });
}

test('Chromium cross-origin CTA/UTM handoff preserves product query and scopes destinations', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => route.fulfill({ status: 200, contentType: route.request().resourceType() === 'document' ? 'text/html' : 'text/javascript', body: route.request().resourceType() === 'document' ? '<html lang="fa"><body><section id="hero"><button data-analytics-action="enter">enter</button></section></body></html>' : '' }));
    await page.goto('https://web.example.test/?utm_source=instagram&utm_medium=social&utm_campaign=launch&phone=private');
    await sdk(page);
    await page.evaluate(() => {
      window.__MUSHROOM_RUNTIME_CONFIG__ = { analyticsMeasurementId: 'G-TEST123', analyticsConsent: 'granted', webUrl: 'https://web.example.test', appUrl: 'https://app.example.test' };
      trackBrowserPage('/', 'web');
      observeBrowserInteractions('/', 'web');
    });
    await page.getByRole('button', { name: 'enter' }).click();
    const destination = await page.evaluate(() => {
      if (decorateAnalyticsUrl('https://evil.test/', 'https://app.example.test') !== 'https://evil.test/') throw Error('cross-origin leak');
      return decorateAnalyticsUrl('https://app.example.test/store?product=original#keep', 'https://app.example.test');
    });
    assert.equal(new URL(destination).searchParams.get('ma_entry_cta'), 'hero_enter');
    assert.ok(!destination.includes('private'));
    await page.goto(destination); await sdk(page);
    await page.evaluate(() => {
      window.__MUSHROOM_RUNTIME_CONFIG__ = { analyticsMeasurementId: 'G-TEST123', analyticsConsent: 'granted', webUrl: 'https://web.example.test', appUrl: 'https://app.example.test' };
      trackBrowserPage('/store', 'app');
    });
    assert.equal(page.url(), 'https://app.example.test/store?product=original#keep');
    const result = await page.evaluate(() => {
      const commands = window.dataLayer.map(args => Array.from(args));
      return commands.find(args => args[0] === 'event' && args[1] === 'page_view')[2];
    });
    assert.equal(result.entry_cta, 'hero_enter'); assert.equal(result.source, 'instagram');
    assert.equal(result.page_location, 'https://app.example.test/store');
    assert.equal(result.page_referrer, '');
    // Opt-out blocks both transport metadata and handoff, without breaking navigation.
    await page.evaluate(() => localStorage.setItem('mushroom.analytics', 'denied'));
    assert.equal(await page.evaluate(() => decorateAnalyticsUrl('https://app.example.test/profile', 'https://app.example.test')), 'https://app.example.test/profile');
  } finally { await browser.close(); }
});

test('Chromium request observer sends attempts/results once and never reads or changes product payloads', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    let requests = 0;
    await page.route('**/*', route => {
      if (route.request().url().includes('/v1/')) {
        requests++;
        assert.equal(route.request().headers().authorization, 'Bearer test-secret');
        assert.deepEqual(JSON.parse(route.request().postData()), { skuId: 'private-sku', quantity: 2 });
        return route.fulfill({ status: 409, contentType: 'application/json', body: '{"code":"PRIVATE_REASON"}' });
      }
      return route.fulfill({ status: 200, contentType: route.request().resourceType() === 'document' ? 'text/html' : 'text/javascript', body: '' });
    });
    await page.goto('https://app.example.test/store'); await sdk(page);
    const result = await page.evaluate(async () => {
      window.__MUSHROOM_RUNTIME_CONFIG__ = { analyticsMeasurementId: 'G-TEST123', analyticsConsent: 'granted' };
      trackBrowserPage('/store', 'app');
      const request = new Request('https://app.example.test/v1/patients/me/cart', { method: 'PUT', headers: { authorization: 'Bearer test-secret', 'content-type': 'application/json' }, body: JSON.stringify({ skuId: 'private-sku', quantity: 2 }) });
      const response = await analyticsFetch(request, undefined, () => fetch(request), location.origin, 'app');
      return { body: await response.json(), commands: window.dataLayer.map(args => Array.from(args)).filter(args => args[0] === 'event') };
    });
    assert.equal(requests, 1); assert.deepEqual(result.body, { code: 'PRIVATE_REASON' });
    assert.equal(result.commands.filter(args => args[1] === 'action_attempt').length, 1);
    const event = result.commands.find(args => args[1] === 'action_result')[2];
    assert.equal(event.operation, 'cart_update'); assert.equal(event.outcome, 'rejected'); assert.equal(event.status_code, 409);
    for (const secret of ['test-secret', 'private-sku', 'PRIVATE_REASON']) assert.ok(!JSON.stringify(result.commands).includes(secret));
  } finally { await browser.close(); }
});

test('Chromium forwards optional server context only with consent to the configured API', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage(); const headers = [];
    await page.route('**/*', route => {
      if (route.request().url().includes('/v1/')) headers.push(route.request().headers());
      return route.fulfill({ status: 200, contentType: route.request().resourceType() === 'document' ? 'text/html' : 'application/json', body: route.request().resourceType() === 'document' ? '<html></html>' : '{}' });
    });
    const query = new URLSearchParams({ ma_at: String(Date.now()), ma_client_id: '123.456', ma_session_id: String(Math.floor(Date.now()/1000)-5), ma_measurement_id: 'G-TEST123', ma_entry_cta: 'home_enter' });
    await page.goto(`https://app.example.test/store?${query}`); await sdk(page);
    await page.evaluate(async () => {
      window.__MUSHROOM_RUNTIME_CONFIG__ = { analyticsMeasurementId: 'G-TEST123', analyticsConsent: 'granted' };
      trackBrowserPage('/store', 'app');
      const run = () => analyticsFetch(new Request(location.origin + '/v1/patients/me/orders', { method: 'POST', headers: { authorization: 'Bearer synthetic', 'content-type': 'application/json' }, body: '{}' }), undefined,
        (input, init) => fetch(input, init), location.origin, 'app');
      await run();
      localStorage.setItem('mushroom.analytics', 'denied'); await run();
    });
    assert.equal(headers.length, 2);
    const context = JSON.parse(headers[0]['x-analytics-context']);
    assert.equal(context.client_id, '123.456'); assert.equal(context.consent, 'granted'); assert.equal(context.entry_cta, 'home_enter');
    assert.equal(headers[0].authorization, 'Bearer synthetic');
    assert.equal(headers[1]['x-analytics-context'], undefined);
  } finally { await browser.close(); }
});
