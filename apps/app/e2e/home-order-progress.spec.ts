import { expect, test, type Page } from '@playwright/test';

const orderId = '22222222-2222-4222-8222-222222222222';
async function installApi(page: Page, state: { status: string; pickup?: boolean; unavailable?: boolean }) {
  const headers = { 'access-control-allow-origin': 'http://localhost:3001', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
  await page.route('**/v1/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === '/v1/auth/refresh') return json({ accessToken: 'synthetic', tokenType: 'Bearer', expiresIn: 600, user: { id: 'test-patient', roles: ['PATIENT'] } });
    if (path === '/v1/patients/me/entry') return json({ required: false, assessmentRequired: false, phase: 'COMPLETE', firstName: 'تست', lastName: 'سفارش', gender: 'MALE', birthDate: '1990-01-01', assessmentVersionId: null, assessmentTitle: null, submissionId: null });
    if (path === '/v1/patients/me/journey') return json({ onboarding: { isComplete: true }, home: { latestAssessment: null, activeTreatmentPlanId: null, setupSteps: [], actions: [
      { code: 'OPEN_APPOINTMENT', resourceId: 'test-visit', title: null, amountRial: null, paymentPurpose: null },
      { code: 'CONTINUE_PAYMENT', resourceId: 'test-payment', title: null, amountRial: '1250000', paymentPurpose: 'ORDER' },
      { code: 'TRACK_ORDER', resourceId: orderId, title: null, amountRial: null, paymentPurpose: null },
    ] } });
    if (path === `/v1/patients/me/orders/${orderId}`) return state.unavailable ? json({ code: 'COMMERCE_ORDER_NOT_FOUND' }, 404) : json({ id: orderId, orderNumber: '1024', status: state.status, shippingMethod: state.pickup ? 'PICKUP' : 'COURIER', totalAmountToman: '125000', subtotalAmountToman: '125000', taxAmountToman: '0', discountAmountToman: '0', shippingAmountToman: '0', lines: [], paymentStatus: 'VERIFIED', refundStatuses: [], trackingUrl: null, trackingCode: null });
    if (request.method() !== 'GET') throw new Error(`Unexpected write ${path}`);
    return json({ items: [], total: 0, hasMore: false });
  });
}

test('paid order card stays compact in RTL and opens the same tracking page', async ({ page }) => {
  await installApi(page, { status: 'PAID' });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto('/');
    const card = page.getByRole('link', { name: 'پیگیری سفارش شماره ۱۰۲۴', exact: true });
    await expect(card.getByRole('listitem')).toHaveCount(4);
    await expect(card.locator('[aria-current="step"]')).toContainText('آماده‌سازی');
    await expect(card).toHaveAttribute('href', `/store/order-tracking?orderId=${orderId}`);
    const box = await card.boundingBox(); expect(box!.height).toBeLessThan(215);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const steps = await card.getByRole('listitem').evaluateAll(items => items.map(item => item.getBoundingClientRect().x));
    expect(steps[0]).toBeGreaterThan(steps[3]);
    if (width === 390 || width === 1440) { await card.scrollIntoViewIfNeeded(); await page.screenshot({ path: `.local/home05-${width}.png` }); }
  }
  await page.getByRole('link', { name: 'پیگیری سفارش شماره ۱۰۲۴', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/store/order-tracking\\?orderId=${orderId}`));
  await expect(page.getByRole('heading', { name: 'مسیر سفارش شما' })).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(5);
});

test('order card uses actual dispatch or pickup state and avoids invented progress on closed/error responses', async ({ page }) => {
  const state = { status: 'SHIPPED', pickup: false, unavailable: false }; await installApi(page, state);
  await page.goto('/');
  const card = page.locator('.home-order-card');
  await expect(card.locator('[aria-current="step"]')).toContainText('ارسال سفارش');
  state.pickup = true; state.status = 'READY_FOR_PICKUP'; await page.reload();
  await expect(card.locator('[aria-current="step"]')).toContainText('آماده دریافت');
  await expect(card).toContainText('دریافت حضوری');
  state.status = 'DELIVERED'; await page.reload(); await expect(card).toHaveCount(0);
  state.unavailable = true; await page.reload();
  await expect(card).toContainText('برای بررسی وضعیت');
  await expect(card.getByRole('list')).toHaveCount(0);
});
