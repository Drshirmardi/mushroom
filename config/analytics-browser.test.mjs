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
    assert.equal(commands.filter(args => args[0] === 'config').length, 1);
    assert.equal(commands.filter(args => args[1] === 'page_view').length, 1);
    assert.equal(commands.filter(args => args[1] === 'cta_click').length, 1);
    assert.ok(!JSON.stringify(commands).includes('private'));
    assert.ok(!JSON.stringify(commands).includes('secret'));
    await page.evaluate(() => { localStorage.setItem('mushroom.analytics', 'denied'); trackBrowserAction('header_login', 'header', 'web'); });
    assert.equal(await page.evaluate(() => window.dataLayer.filter(args => args[0] === 'event').length), commands.filter(args => args[0] === 'event').length);
    assert.equal(requests.filter(url => url.includes('/api/') || url.includes('/v1/')).length, 0);
  } finally { await browser.close(); }
});
