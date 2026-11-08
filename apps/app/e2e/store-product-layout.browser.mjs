import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { installStoreProductFixture } from './store-product-ux-fixture.mjs';

const base = process.env.APP_URL || 'http://127.0.0.1:3018';
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 375, height: 812 } });
page.setDefaultTimeout(8000);
const state = await installStoreProductFixture(page), errors = [], warnings = [], responses = [], results = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
page.on('response', r => { if (r.status() >= 400) responses.push({ url: r.url(), status: r.status() }); });
const dir = '.local/store-product-implementation'; await mkdir(dir, { recursive: true });
const overflow = async () => {
  const value = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(value).toBeLessThanOrEqual(1);
};
const axe = async () => {
  await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.0/axe.min.js' });
  const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('.patient-app-shell'))).violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) })));
  expect(violations.filter(v => ['critical', 'serious'].includes(v.impact))).toEqual([]);
  return violations;
};
try {
  await page.goto(base + '/store'); await page.getByRole('heading', { name: 'محصولات فروشگاه', exact: true }).waitFor();
  for (const width of [320, 375, 414, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 812 }); await overflow();
    expect(await page.locator('.store-product__variant').first().innerText()).toBe('بسته کوچک');
    const order = await page.evaluate(() => {
      const product = document.querySelector('#store-products'), banner = document.querySelector('.store-hero'), shortcuts = document.querySelector('.store-quick-links');
      return Boolean(product.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING) && Boolean(banner.compareDocumentPosition(shortcuts) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(order).toBe(true); results.push({ route: 'store', width, overflow: 0 });
  }
  await page.setViewportSize({ width: 375, height: 812 });
  expect((await page.locator('.store-product').first().boundingBox()).y).toBeLessThan(400);
  await expect(page.getByText('هنوز پیشنهاد محصولی', { exact: false })).toHaveCount(0);
  await page.screenshot({ path: `${dir}/store-mobile.png` });
  const storeAxe = await axe();
  state.longTitle = true; await page.reload(); await page.locator('.store-product').first().waitFor();
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; }); await overflow();
  const cardContent = await page.locator('.store-product').first().evaluate(card => {
    const c = card.getBoundingClientRect(), title = card.querySelector('h2'), price = card.querySelector('.store-price bdi').getBoundingClientRect();
    return { titleClipped: title.scrollHeight > title.clientHeight + 1, priceInside: price.left >= c.left && price.right <= c.right };
  });
  expect(cardContent).toEqual({ titleClipped: false, priceInside: true });
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; }); state.longTitle = false;
  await page.goto(base + '/store?view=all&category=cat1&q=روغن');
  await page.getByRole('link', { name: 'مشاهدهٔ روغن آزمایشی مراقبت و سلامت', exact: true }).click();
  await page.getByLabel('انتخاب نوع محصول', { exact: true }).selectOption('s2');
  await page.getByRole('link', { name: 'سبد خرید', exact: true }).click(); await page.waitForURL('**/store/cart');
  await page.goBack(); await page.getByLabel('انتخاب نوع محصول', { exact: true }).waitFor();
  expect(new URL(page.url()).searchParams.get('sku')).toBe('s2');
  await page.getByRole('button', { name: 'بازگشت', exact: true }).click();
  await page.getByRole('searchbox', { name: 'جستجو در فروشگاه', exact: true }).waitFor();
  expect(new URL(page.url()).searchParams.get('category')).toBe('cat1');
  expect(await page.getByRole('searchbox', { name: 'جستجو در فروشگاه', exact: true }).inputValue()).toBe('روغن');
  results.push({ roundTrip: 'query/category and selected SKU preserved' });

  state.longTitle = true; state.long = true;
  await page.goto(base + '/store/products/p1?sku=s2'); await page.getByLabel('انتخاب نوع محصول', { exact: true }).waitFor();
  for (const width of [320, 375, 414, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await overflow();
    // Product sheet copy uses the compact Tailwind type scale and never clips long Farsi text.
    const copy = await page.evaluate(() => {
      const title = document.querySelector('[data-product-title]');
      const paragraph = document.querySelector('#product-about p');
      const sectionHeading = document.querySelector('[data-product-info-heading]');
      const nav = document.querySelector('.store-content-nav');
      const size = (node) => parseFloat(getComputedStyle(node).fontSize);
      return {
        title: size(title),
        body: size(paragraph),
        sectionHeading: size(sectionHeading),
        hasHorizontalNav: Boolean(nav && getComputedStyle(nav).overflowX === 'auto'),
        bodyOverflows: paragraph.scrollWidth > paragraph.clientWidth + 1
      };
    });
    expect(copy.title).toBeGreaterThanOrEqual(18);
    expect(copy.title).toBeLessThanOrEqual(23);
    expect(copy.body).toBeGreaterThanOrEqual(14);
    expect(copy.body).toBeLessThanOrEqual(16);
    expect(copy.sectionHeading).toBeLessThanOrEqual(17);
    expect(copy.hasHorizontalNav).toBe(true);
    expect(copy.bodyOverflows).toBe(false);
    const g = await page.evaluate(() => {
      const gallery = document.querySelector('.store-gallery').getBoundingClientRect(), sheet = document.querySelector('.store-detail__sheet').getBoundingClientRect();
      const handle = document.querySelector('.store-detail__handle-button');
      const bar = document.querySelector('.store-purchase-bar').getBoundingClientRect();
      const number = document.querySelector('.store-purchase-bar .store-price bdi');
      return { gallery: { x: gallery.x, y: gallery.y, height: gallery.height }, sheet: { x: sheet.x, y: sheet.y }, handle: getComputedStyle(handle).display, barBottom: bar.bottom, numberHeight: number.getBoundingClientRect().height, numberLine: parseFloat(getComputedStyle(number).lineHeight) };
    });
    expect(g.barBottom).toBeLessThanOrEqual(901); expect(g.numberHeight).toBeLessThanOrEqual(g.numberLine + 2);
    if (width < 1024) { expect(g.gallery.height).toBeLessThanOrEqual(379); expect(g.handle).not.toBe('none'); }
    else { expect(g.gallery.x).toBeGreaterThan(g.sheet.x); expect(Math.abs(g.gallery.y - g.sheet.y)).toBeLessThan(2); expect(g.gallery.height).toBeLessThanOrEqual(481); expect(g.handle).toBe('none'); }
    results.push({ route: 'product', width, ...g });
  }
  await page.screenshot({ path: `${dir}/product-desktop.png` });
  await page.getByRole('link', { name: 'هشدارها', exact: true }).click();
  await expect(page.getByRole('link', { name: 'هشدارها', exact: true })).toHaveAttribute('aria-current', 'true');
  await expect.poll(() => page.evaluate(() => {
    const h = document.querySelector('#product-warnings').getBoundingClientRect(), nav = document.querySelector('.store-content-nav').getBoundingClientRect(), root = document.querySelector('.store-detail').getBoundingClientRect();
    return h.top >= nav.bottom - 2 && h.top < root.bottom;
  })).toBe(true);
  const productAxe = await axe();
  for (const size of [{ width: 375, height: 812 }, { width: 768, height: 390 }, { width: 720, height: 450 }]) {
    await page.setViewportSize(size); await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; }); await overflow();
    const link = page.getByRole('link', { name: 'هشدارها', exact: true }); await link.click();
    expect(await link.getAttribute('aria-current')).toBe('true');
    await expect.poll(() => page.evaluate(() => {
      const root = document.querySelector('.store-detail').getBoundingClientRect(), target = document.querySelector('#product-warnings').getBoundingClientRect();
      return root.height > 60 && target.top >= root.top && target.top < root.bottom - 20;
    })).toBe(true);
    const button = page.getByRole('button', { name: 'افزودن به سبد', exact: true }); await button.focus();
    const box = await button.boundingBox(); expect(box.y + box.height).toBeLessThanOrEqual(size.height - 12);
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  state.longTitle = false; state.long = false;
  await page.setViewportSize({ width: 375, height: 812 });
  state.holdProduct = true; await page.goto(base + '/store/products/p1?sku=s2');
  await expect(page.locator('[data-loading-skeleton="product"]')).toBeVisible();
  state.holdProduct = false; state.releaseProduct(); await page.getByRole('button', { name: 'افزودن به سبد', exact: true }).waitFor();
  state.failProduct = true; await page.reload(); await page.getByRole('button', { name: 'تلاش دوباره', exact: true }).waitFor();
  state.failProduct = false; await page.getByRole('button', { name: 'تلاش دوباره', exact: true }).click(); await page.getByLabel('انتخاب نوع محصول', { exact: true }).waitFor();
  state.failImage = true; await page.reload();
  await expect.poll(() => page.locator('.store-gallery__slide img').getAttribute('src')).toContain('data:image/svg+xml');
  await page.screenshot({ path: `${dir}/product-mobile.png` }); state.failImage = false;
  state.empty = true; await page.goto(base + '/store?view=all'); await page.getByRole('heading', { name: 'هنوز محصولی در این صفحه نیست', exact: true }).waitFor();
  state.empty = false; state.recommendations = true; await page.goto(base + '/store'); await page.getByRole('heading', { name: 'محصولات مرتبط با شما', exact: true }).waitFor();
  state.recommendations = false; state.recommendationStatus = 'NO_RESULT'; await page.reload(); await expect(page.getByRole('link', { name: 'شروع ارزیابی', exact: true })).toBeVisible();
  state.failRecommendations = true; await page.reload(); await expect(page.getByText('پیشنهادهای مرتبط با شما دریافت نشد.', { exact: true })).toBeVisible();
  state.failRecommendations = false; await page.getByRole('button', { name: 'تلاش دوباره', exact: true }).click(); await expect(page.getByRole('link', { name: 'شروع ارزیابی', exact: true })).toBeVisible();
  await page.goto(base + '/store/products/p1?sku=s2'); await page.getByLabel('انتخاب نوع محصول', { exact: true }).waitFor();
  await page.screenshot({ path: `${dir}/product-mobile.png` });
  expect(errors).toEqual([]);
  await writeFile(`${dir}/layout.json`, JSON.stringify({ results, storeAxe, productAxe, errors, warnings, injectedFailures: responses }, null, 2));
  console.log(JSON.stringify({ PASS: true, widths: 7, storeAxe, productAxe, errors, warnings: warnings.length }));
} catch (error) {
  await page.screenshot({ path: `${dir}/layout-failure.png` });
  await writeFile(`${dir}/layout-failure.json`, JSON.stringify({ message: String(error).slice(0,1400), viewport: page.viewportSize(), last: results.at(-1), geometry: await page.evaluate(() => Object.fromEntries(['.store-detail', '.store-detail__handle-button', '.store-content-nav', '.store-purchase-bar', '.store-page-header'].map(s => [s, document.querySelector(s)?.getBoundingClientRect().toJSON()]))) }, null, 2));
  throw error;
} finally { await browser.close(); }
