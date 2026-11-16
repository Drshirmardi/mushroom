import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';

// Explicit opt-in only. Uses ignored production build output, a private browser and
// synthetic auth bootstrap; every subsequent business request reaches the real API.
export async function analyticsBrowserFrontend(apiUrl: string) {
  const root = resolve('../..');
  const app = resolve(root, 'apps/app');
  const runner = resolve(app, '.next/standalone/apps/app');
  const origin = 'http://127.0.0.1:3311';
  const runtimePath = resolve(runner, 'public/runtime-config.js');
  await cp(resolve(app, 'public'), resolve(runner, 'public'), { recursive: true });
  await cp(resolve(app, '.next/static'), resolve(runner, '.next/static'), { recursive: true });
  const previous = await readFile(runtimePath, 'utf8').catch(() => '');
  await writeFile(runtimePath, `window.__MUSHROOM_RUNTIME_CONFIG__=Object.freeze(${JSON.stringify({
    apiUrl, appUrl: origin, webUrl: 'http://127.0.0.1:3310', dashboardUrl: 'http://127.0.0.1:3312',
    analyticsMeasurementId: 'G-TEST123', analyticsConsent: 'granted',
  })});`);
  const child = spawn(process.execPath, [resolve(runner, 'server.js')], {
    cwd: runner, env: { ...process.env, NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: '3311' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', data => { output = (output + String(data)).slice(-8000); });
  child.stderr.on('data', data => { output = (output + String(data)).slice(-8000); });
  const close = async () => {
    if (child.exitCode === null && !child.killed) {
      const exited = once(child, 'exit'); child.kill(); await exited;
    }
    await writeFile(runtimePath, previous);
  };
  try {
    await expect.poll(async () => {
      if (child.exitCode !== null) throw new Error(`Analytics frontend exited: ${output}`);
      return fetch(`${origin}/runtime-config.js`).then(response => response.status).catch(() => 0);
    }, { timeout: 20000 }).toBe(200);
  } catch (error) { await close(); throw error; }
  return { origin, close };
}

export async function browserWalletPayment(input: {
  origin: string; apiUrl: string; orderId: string; token: string; userId: string;
  mode: 'granted' | 'denied' | 'blocked';
}) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: input.mode === 'granted' ? 390 : 1440, height: 900 } });
    const errors: string[] = [];
    const headers: Array<Record<string, string>> = [];
    const failedApi: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(input.apiUrl) && response.status() >= 400) failedApi.push(`${response.status()} ${new URL(response.url()).pathname}`);
    });
    page.on('request', request => {
      if (request.url().startsWith(input.apiUrl) && request.method() === 'POST' && request.url().includes('/billing/')) headers.push(request.headers());
    });
    // Emulate only Google's documented gtag get callbacks, never a real property.
    await page.route('https://www.googletagmanager.com/**', route => input.mode === 'blocked' ? route.abort() : route.fulfill({
      contentType: 'text/javascript', body: `window.gtag=function(){window.dataLayer.push(arguments);if(arguments[0]==='get')arguments[3](arguments[2]==='client_id'?'123.456':String(Math.floor(Date.now()/1000)-10))}`,
    }));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === new URL(input.apiUrl).origin && url.pathname === '/v1/auth/refresh') {
        return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': input.origin, 'access-control-allow-credentials': 'true' },
          contentType: 'application/json', body: JSON.stringify({ accessToken: input.token, tokenType: 'Bearer', expiresIn: 600,
            user: { id: input.userId, phone: '+989120000000', roles: ['PATIENT'] } }) });
      }
      if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.fallback();
      if (url.hostname === 'www.googletagmanager.com') return route.fallback();
      return route.abort();
    });
    if (input.mode === 'denied') await page.addInitScript(() => localStorage.setItem('mushroom.analytics', 'denied'));
    await page.goto(`${input.origin}/store/payment?orderId=${input.orderId}&utm_source=browser_test&phone=private-query`);
    const pay = page.getByRole('button', { name: /پرداخت از کیف پول/ });
    await expect(pay).toBeVisible({ timeout: 20000 });
    await pay.click();
    const confirm = page.getByRole('button', { name: 'تأیید پرداخت', exact: true });
    if (await confirm.isVisible()) await confirm.click();
    await expect(page).toHaveURL(`${input.origin}/store/order-success?orderId=${input.orderId}`, { timeout: 20000 });
    await expect(page.getByText('رسید پرداخت', { exact: true })).toBeVisible();
    const events = await page.evaluate(() => ((window as unknown as { dataLayer?: IArguments[] }).dataLayer || [])
      .map(args => Array.from(args)).filter(args => args[0] === 'event'));
    await page.reload();
    await expect(page.getByText('رسید پرداخت', { exact: true })).toBeVisible();
    expect(errors).toEqual([]); expect(failedApi).toEqual([]);
    expect(events.some(args => args[1] === 'purchase')).toBe(false);
    for (const secret of ['private-query', input.token, input.userId, input.orderId]) expect(JSON.stringify(events)).not.toContain(secret);
    if (input.mode === 'denied') expect(events).toEqual([]);
    else expect(events.some(args => args[1] === 'page_view')).toBe(true);
    expect(headers.length).toBeGreaterThanOrEqual(2);
    const paidHeader = headers.at(-1)!;
    expect(paidHeader.authorization).toBe(`Bearer ${input.token}`);
    if (input.mode === 'granted') expect(JSON.parse(paidHeader['x-analytics-context'])).toMatchObject({ client_id: '123.456', source: 'browser_test' });
    else expect(paidHeader['x-analytics-context']).toBeUndefined();
    return events;
  } finally { await browser.close(); }
}
