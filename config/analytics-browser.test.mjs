import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { chromium } from '@playwright/test';

test('real browser: one loader, sanitized views/CTA, no API calls, opt-out', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const requests = [];
    await page.route('**/*', route => {
      requests.push(route.request().url());
      return route.fulfill({ status: 200, contentType: route.request().resourceType() === 'document' ? 'text/html' : 'text/javascript', body: route.request().resourceType() === 'document' ? '<html lang="fa"><body>analytics test</body></html>' : '' });
    });
    await page.goto('https://analytics.example.test/store/products/secret?token=private');
    const core = await readFile(new URL('./analytics.ts', import.meta.url), 'utf8');
    const contextSource = await readFile(new URL('./analytics-context.ts', import.meta.url), 'utf8');
    const operationsSource = await readFile(new URL('./analytics-operations.ts', import.meta.url), 'utf8');
    const adapter = (await readFile(new URL('./analytics-browser.ts', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '');
    const source = ts.transpile((core + '\n' + contextSource + '\n' + operationsSource + '\n' + adapter).replace(/export /g, ''), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      window.__MUSHROOM_RUNTIME_CONFIG__ = { analyticsMeasurementId: 'G-TEST123', analyticsConsent: 'granted' };
      trackBrowserPage(location.pathname, 'app');
      trackBrowserPage(location.pathname, 'app');
      trackBrowserAction('header_login', 'header', 'web');
    });
    const commands = await page.evaluate(() => window.dataLayer.map(args => Array.from(args)));
    const defaults = commands.find(args => args[0] === 'set')?.[1];
    assert.equal(defaults?.send_page_view, false);
    assert.equal(defaults.page_location, 'https://analytics.example.test/store/products/:id');
    assert.equal(defaults.page_title, 'Mushroom');
    assert.equal(commands.filter(args => args[0] === 'config').length, 1);
    assert.equal(commands.filter(args => args[1] === 'page_view').length, 1);
    assert.equal(commands.filter(args => args[1] === 'cta_click').length, 1);
    assert.ok(commands.filter(args => args[0] === 'event').every(args => !('debug_mode' in args[2])));
    assert.ok(!JSON.stringify(commands).includes('private'));
    assert.ok(!JSON.stringify(commands).includes('secret'));
    await page.evaluate(() => { localStorage.setItem('mushroom.analytics', 'denied'); trackBrowserAction('header_login', 'header', 'web'); });
    assert.equal(await page.evaluate(() => window.dataLayer.filter(args => args[0] === 'event').length), commands.filter(args => args[0] === 'event').length);
    assert.equal(requests.filter(url => url.includes('/api/') || url.includes('/v1/')).length, 0);
  } finally { await browser.close(); }
});

test('runtime debug opt-in uses the shared singleton loader and never overrides opt-out', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    let loaders = 0;
    await page.route('**/*', route => {
      if (route.request().url().includes('googletagmanager.com/gtag/js')) loaders++;
      return route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' });
    });
    await page.goto('https://analytics.example.test/');
    const files = ['analytics.ts', 'analytics-context.ts', 'analytics-operations.ts', 'analytics-browser.ts'];
    const source = (await Promise.all(files.map(file => readFile(new URL(file, import.meta.url), 'utf8')))).join('\n').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
    await page.addScriptTag({ content: ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }) });
    await page.evaluate(() => {
      window.__MUSHROOM_RUNTIME_CONFIG__ = { analyticsMeasurementId: 'G-TEST123', analyticsConsent: 'granted', analyticsDebug: 'true' };
      trackBrowserPage('/', 'web'); trackBrowserPage('/', 'web'); trackBrowserAction('header_login', 'header', 'web');
    });
    const events = await page.evaluate(() => window.dataLayer.map(args => Array.from(args)).filter(args => args[0] === 'event'));
    assert.equal(events.length, 2);
    assert.ok(events.every(args => args[2].debug_mode === true));
    assert.equal(await page.locator('script[src*="googletagmanager.com/gtag/js"]').count(), 1);
    await page.evaluate(() => { localStorage.setItem('mushroom.analytics', 'denied'); trackBrowserAction('header_login', 'header', 'web'); });
    assert.equal(await page.evaluate(() => window.dataLayer.filter(args => args[0] === 'event').length), 2);
    assert.equal(loaders, 1);
  } finally { await browser.close(); }
});
