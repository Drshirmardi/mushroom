import { expect, test, type Browser, type BrowserContext } from '@playwright/test';

const dashboardOrigin = process.env.PHASE_11_DASHBOARD_URL ?? 'http://localhost:3202';
const patientAppOrigin = process.env.PHASE_11_PATIENT_APP_URL ?? 'http://127.0.0.1:3201';
const webOrigin = process.env.PHASE_11_WEB_URL ?? 'http://127.0.0.1:3200';

type Role = 'ADMIN' | 'PATIENT' | 'DOCTOR' | 'STAFF';

const authentication = (roles: Role[]) => ({
  accessToken: 'browser-test-access-token',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: { id: '00000000-0000-4000-8000-000000000009', phone: '+989100000009', roles },
});

async function routeRedirectTargets(context: BrowserContext) {
  await context.route(`${patientAppOrigin}/**`, (route) => route.fulfill({
    contentType: 'text/html',
    body: '<main>patient application denial destination</main>',
  }));
  await context.route(`${webOrigin}/**`, (route) => route.fulfill({
    contentType: 'text/html',
    body: '<main>web login denial destination</main>',
  }));
}

async function dashboardPage(
  browser: Browser,
  refresh: { status: number; roles?: Role[] },
) {
  const context = await browser.newContext();
  await routeRedirectTargets(context);
  const protectedRequests: string[] = [];
  const page = await context.newPage();
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/v1/admin/')) protectedRequests.push(request.url());
    expect(request.url()).not.toMatch(/(?:[?&](?:token|access_token|authorization)=)/iu);
  });
  await context.route('**/v1/auth/refresh', (route) => route.fulfill({
    status: refresh.status,
    contentType: 'application/json',
    body: JSON.stringify(refresh.status === 200 ? authentication(refresh.roles ?? []) : {
      code: 'UNAUTHORIZED', message: 'Session is not active.', details: {},
    }),
  }));

  return { context, page, protectedRequests };
}

test('allows ADMIN direct dashboard navigation without an export surface', async ({ browser }) => {
  const { context, page, protectedRequests } = await dashboardPage(browser, { status: 200, roles: ['ADMIN'] });
  try {
    await page.goto(`${dashboardOrigin}/dashboard`);
    await expect(page.getByRole('navigation', { name: 'منوی اصلی' })).toBeVisible();
    await expect(page.getByRole('complementary').getByText('مدیر سیستم', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /خروجی|export/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /خروجی|export/i })).toHaveCount(0);
    expect(protectedRequests.some((url) => /\/export(?:[/?#]|$)/u.test(url))).toBe(false);
  } finally {
    await context.close();
  }
});

test('renders clinic-scoped operational CRM from the real API contract without marketing or export controls', async ({ browser }) => {
  const { context, page, protectedRequests } = await dashboardPage(browser, { status: 200, roles: ['ADMIN'] });
  const clinicId = '00000000-0000-4000-8000-000000000010';
  try {
    await context.route('**/v1/admin/clinic', (route) => {
      expect(route.request().headers().authorization).toBe('Bearer browser-test-access-token');
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: clinicId, name: 'کلینیک آزمایشی', timeZone: 'Asia/Tehran', status: 'ACTIVE' }) });
    });
    await context.route('**/v1/admin/commerce/customers**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      expect(url.searchParams.get('clinicId')).toBe(clinicId);
      expect(url.searchParams.get('page')).toBe('1');
      expect(url.searchParams.get('pageSize')).toBe('25');
      expect(request.headers().authorization).toBe('Bearer browser-test-access-token');
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          clinicId, currency: 'TOMAN', timeZone: 'Asia/Tehran', asOf: '2026-09-28T12:00:00.000Z',
          page: 1, pageSize: 25, totalCustomerCount: 1,
          summary: { totalCustomerCount: 1, vipCustomerCount: 1, netSpendToman: '450000', averageNetSpendToman: '450000' },
          items: [{ patientId: '00000000-0000-4000-8000-000000000011', displayName: 'مینا مشتری', accountStatus: 'ACTIVE', segment: 'VIP', successfulPurchaseCount: 5, grossToman: '500000', completedRefundToman: '50000', netSpendToman: '450000', topProduct: 'محصول محبوب', lastPurchaseAt: '2026-09-28T10:00:00.000Z' }],
        }),
      });
    });
    await page.goto(`${dashboardOrigin}/store-crm`);
    await expect(page.getByRole('heading', { name: 'مشتریان عملیاتی فروشگاه', exact: true })).toBeVisible();
    await expect(page.getByText('مینا مشتری', { exact: true })).toBeVisible();
    await expect(page.getByText('محصول محبوب', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /خروجی|export|کمپین|campaign|پیام انبوه/i })).toHaveCount(0);
    expect(protectedRequests.some((url) => new URL(url).pathname === '/v1/admin/commerce/customers')).toBe(true);
  } finally {
    await context.close();
  }
});

for (const role of ['PATIENT', 'DOCTOR', 'STAFF'] as const) {
  test(`denies ${role} direct dashboard navigation before protected UI disclosure`, async ({ browser }) => {
    const { context, page, protectedRequests } = await dashboardPage(browser, { status: 200, roles: [role] });
    try {
      await page.goto(`${dashboardOrigin}/dashboard`);
      await expect(page).toHaveURL(new RegExp(`^${patientAppOrigin.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}/`, 'u'));
      await expect(page.getByText('patient application denial destination', { exact: true })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'منوی اصلی' })).toHaveCount(0);
      await expect(page.getByText('مدیر سیستم', { exact: true })).toHaveCount(0);
      expect(protectedRequests).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

for (const state of ['disabled', 'revoked'] as const) {
  test(`denies a ${state} ADMIN session before dashboard UI disclosure`, async ({ browser }) => {
    const { context, page, protectedRequests } = await dashboardPage(browser, { status: 401 });
    try {
      await page.goto(`${dashboardOrigin}/dashboard`);
      await expect(page).toHaveURL(new RegExp(`^${webOrigin.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}/login`, 'u'));
      await expect(page.getByText('web login denial destination', { exact: true })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'منوی اصلی' })).toHaveCount(0);
      await expect(page.getByText('مدیر سیستم', { exact: true })).toHaveCount(0);
      expect(protectedRequests).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
