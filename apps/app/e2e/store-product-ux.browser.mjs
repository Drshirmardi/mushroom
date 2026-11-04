import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { installStoreProductFixture } from './store-product-ux-fixture.mjs';

const base = process.env.APP_URL || 'http://127.0.0.1:3018';
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 375, height: 812 } });
page.setDefaultTimeout(8000);
const state = await installStoreProductFixture(page), errors = [], evidence = [];
page.on('pageerror', e => errors.push(e.message));
await mkdir('.local/store-product-implementation', { recursive: true });
const log = action => evidence.push({ at: new Date().toISOString(), action });
const open = async () => {
  await page.goto(`${base}/store/products/p1?sku=s2`);
  await page.getByRole('button', { name: 'افزودن به سبد', exact: true }).waitFor();
};
const sections = async () => {
  for (const name of ['دربارهٔ محصول', 'ترکیبات', 'دستور مصرف', 'هشدارها', 'موارد منع مصرف']) {
    const link = page.getByRole('link', { name, exact: true });
    await link.click();
    await expect(link).toHaveAttribute('aria-current', 'true');
    await expect.poll(() => page.evaluate(title => {
      const link = [...document.querySelectorAll('.store-content-nav a')].find(a => a.textContent === title);
      const section = document.querySelector(link.getAttribute('href')), root = document.querySelector('.store-detail');
      const nav = document.querySelector('.store-content-nav'), r = section.getBoundingClientRect(), v = root.getBoundingClientRect();
      return r.top >= nav.getBoundingClientRect().bottom - 2 && r.top < v.bottom - 20;
    }, name)).toBe(true);
  }
};
try {
  await open();
  await sections(); log('all short-content destinations visible below sticky navigation');
  state.long = true; await open(); await sections(); log('all long-content destinations and RTL active chips');
  const handle = page.locator('.store-detail__handle-button');
  await handle.press('ArrowUp'); await expect.poll(() => page.locator('.store-detail').evaluate(e => e.scrollTop)).toBeLessThan(2);
  await handle.press('ArrowDown'); await expect(handle).toHaveAttribute('aria-expanded', 'true');
  log('keyboard open and close');
  let grip = await handle.boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + 20); await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + 170, { steps: 8 }); await page.mouse.up();
  await expect(handle).toHaveAttribute('aria-expanded', 'false');
  grip = await handle.boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + 20); await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2, grip.y - 170, { steps: 8 }); await page.mouse.up();
  await expect(handle).toHaveAttribute('aria-expanded', 'true'); log('pointer drag close and reopen');
  await page.getByRole('button', { name: 'افزودن به سبد', exact: true }).dblclick();
  await expect(page.getByRole('link', { name: 'سبد خرید، ۱ کالا', exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1); expect(state.writes[0].skuId).toBe('s2');
  await page.getByRole('button', { name: 'برو به سبد خرید', exact: true }).waitFor({ state: 'detached' });
  await page.getByRole('link', { name: 'سبد خرید، ۱ کالا', exact: true }).click(); await page.waitForURL('**/store/cart');
  log('one mutation on double-click; persistent cart works after toast expiry');
  await page.goBack(); await page.getByRole('button', { name: 'افزایش تعداد روغن آزمایشی مراقبت و سلامت', exact: true }).waitFor();
  expect(new URL(page.url()).searchParams.get('sku')).toBe('s2');
  state.rejectCart = true;
  await page.getByRole('button', { name: 'افزایش تعداد روغن آزمایشی مراقبت و سلامت', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'درخواست انجام نشد', exact: true })).toBeVisible();
  expect(state.quantities.s2).toBe(1);
  state.rejectCart = false;
  await page.getByRole('button', { name: 'افزایش تعداد روغن آزمایشی مراقبت و سلامت', exact: true }).click();
  await expect(page.getByRole('link', { name: 'سبد خرید، ۲ کالا', exact: true })).toBeVisible();
  log('failed quantity change keeps selection and count; next attempt succeeds');
  await page.screenshot({ path: '.local/store-product-implementation/behavior.png' });
  expect(errors).toEqual([]);
  await writeFile('.local/store-product-implementation/behavior.json', JSON.stringify({ evidence, writes: state.writes, errors }, null, 2));
  console.log(JSON.stringify({ PASS: true, evidence: evidence.length, errors }));
} finally { await browser.close(); }
