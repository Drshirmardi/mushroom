import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { installPurchaseFixture } from './purchase-ux-fixture.mjs';
const base = process.env.APP_URL ?? 'http://127.0.0.1:3017';
await mkdir('.local/purchase-ux', { recursive: true });
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 375, height: 812 } });
page.setDefaultTimeout(8000);
const state = await installPurchaseFixture(page), errors = [], manifest = [], warnings = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
const log = action => manifest.push({ at: new Date().toISOString(), url: page.url(), action });
try {
  await page.goto(base + '/store/cart'); await page.getByRole('heading', { name: 'سبد خرید', exact: true }).waitFor();
  await page.screenshot({ path: '.local/purchase-ux/cart.png' });
  await page.getByRole('button', { name: 'ثبت سفارش', exact: true }).click(); log('cart primary action -> checkout');
  const submit = page.getByRole('button', { name: 'ثبت سفارش و ادامهٔ پرداخت', exact: true });
  await submit.waitFor();
  for (const width of [320, 375, 414, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const box = await submit.boundingBox(), footer = await page.locator('.patient-shell-nav').boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(footer.y);
    expect(footer.y - box.y - box.height).toBeGreaterThanOrEqual(16);
    expect(await page.locator('.patient-action-slot').getByRole('button', { name: 'ثبت سفارش و ادامهٔ پرداخت', exact: true }).count()).toBe(1);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator('#checkout-discount').fill('INVALID'); await page.getByRole('button', { name: 'اعمال کد', exact: true }).click();
  await page.getByRole('button', { name: 'حذف کد تخفیف', exact: true }).click();
  log('typed discount; error recovery preserves checkout');
  await page.screenshot({ path: '.local/purchase-ux/checkout.png' });
  await submit.click(); await page.waitForURL('**/store/payment?orderId=o1'); log('checkout command -> payment');
  await page.getByRole('button', { name: 'پرداخت از کیف پول', exact: false }).click();
  await page.getByRole('dialog').waitFor(); await page.screenshot({ path: '.local/purchase-ux/payment-confirm.png' });
  await page.keyboard.press('Escape');
  await page.locator('.patient-shell-content').evaluate(el => { el.scrollTop = 40; });
  await page.getByRole('button', { name: 'بازگشت', exact: true }).click();
  await page.waitForURL('**/store/checkout'); log('store payment Back returned to checkout');
  // Enter the shared payment surface via an actual app link to preserve tracked history.
  await page.clock.install();
  await page.goto(base + '/');
  await page.locator('a[href="/profile/wallet/pay?intentId=i1"]').click();
  await page.getByRole('button', { name: 'پرداخت از کیف پول', exact: false }).waitFor();
  const before = state.reads; await page.waitForTimeout(100); await page.clock.runFor(6000);
  await expect.poll(() => state.reads).toBeGreaterThan(before);
  expect(await page.locator('[data-loading-skeleton], .loading-refresh').count()).toBe(0);
  log('shared payment polled without visible loading flash');
  await page.getByRole('button', { name: 'بازگشت', exact: true }).click(); await page.waitForURL(base + '/');
  log('shared payment Back returned to actual home origin, not wallet');
  await page.clock.resume();
  state.paid = true;
  await page.goto(base + '/store/order-success?orderId=o1');
  await page.getByRole('dialog').waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.local/purchase-ux/receipt-confirm.png' });
  await page.getByRole('button', { name: 'مشاهده جزئیات سفارش', exact: true }).click();
  await page.waitForTimeout(500);
  await page.locator('.patient-action-slot').getByRole('button', { name: 'پیگیری سفارش', exact: true }).waitFor();
  await page.screenshot({ path: '.local/purchase-ux/receipt.png' });
  log('verified receipt dialog closed; tracking action docked');
  state.receiptStatus = 'PENDING'; await page.reload();
  await page.getByText('تا زمان تأیید واقعی پرداخت', { exact: false }).waitFor();
  expect(await page.getByRole('dialog').count()).toBe(0); log('unverified receipt cannot show success');
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ PASS: true, widths: 7, commands: state.commands, errors, warnings }));
} catch (error) {
  console.error(JSON.stringify({ url: page.url(), body: (await page.locator('body').innerText()).slice(-1600), errors }));
  throw error;
} finally {
  await writeFile('.local/purchase-ux/manifest.json', JSON.stringify({ manifest, errors, warnings }, null, 2));
  await browser.close();
}
