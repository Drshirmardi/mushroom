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
  await expect(page.locator('.store-content-nav')).toHaveCount(0);
  for (const id of ['product-about', 'product-ingredients', 'product-usage', 'product-warnings', 'product-contraindications']) {
    const section = page.locator(`#${id}`);
    await expect(section).toHaveCount(1);
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator('h3')).toBeVisible();
    expect(await section.evaluate(element => {
      const root = document.querySelector('.store-detail').getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      return bounds.top < root.bottom - 20 && bounds.bottom > root.top + 20;
    })).toBe(true);
  }
};
try {
  await open();
  await sections(); log('all short-content sections readable without navigation chips');
  state.long = true; await open(); await sections(); log('all long-content sections readable with vertical scrolling');
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
  const add = page.getByRole('button', { name: 'افزودن به سبد', exact: true });
  const initialBox = await add.boundingBox(), initialColor = await add.evaluate(e => getComputedStyle(e).backgroundColor);
  state.holdCart = true; await add.dblclick();
  await expect(add).toHaveAttribute('aria-busy', 'true'); await expect(add).toBeDisabled();
  expect((await add.innerText()).trim()).toBe(''); expect(await add.locator('[data-heartbeat]').count()).toBe(1);
  expect(await add.locator('svg:not([data-heartbeat])').count()).toBe(0);
  await add.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
  expect(await add.evaluate(e => getComputedStyle(e).backgroundColor)).not.toBe(initialColor);
  const busyBox = await add.boundingBox(); expect(busyBox.height).toBe(initialBox.height); expect(busyBox.width).toBe(initialBox.width);
  expect(initialBox.height).toBeGreaterThanOrEqual(44); expect(initialBox.width).toBeLessThanOrEqual(240);
  await page.screenshot({ path: '.local/store-product-implementation/add-button-busy.png' });
  state.holdCart = false; state.releaseCart(); log('compact stable-size button; pale background and ECG only while busy');
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
