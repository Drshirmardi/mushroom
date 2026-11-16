// Run against a locally started patient app; all API calls are intercepted.
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const base = process.env.PATIENT_APP_TEST_URL || 'http://127.0.0.1:3017';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw Error('Local app required');
const publication = '11111111-1111-4111-8111-111111111111';
const requestId = '22222222-2222-4222-8222-222222222222';
const receivedId = '33333333-3333-4333-8333-333333333333';
const definition = {
  version: 1, purpose: 'MARRIAGE',
  roles: [
    { id: 'FIRST', title: 'نفر اول', minimumAgeYears: 18, genders: ['MALE', 'FEMALE'] },
    { id: 'SECOND', title: 'نفر دوم', minimumAgeYears: 18, genders: ['MALE', 'FEMALE'] },
  ],
  genericJointText: 'نتیجه آموزشی',
};
const service = {
  publicationId: publication, title: 'تست شناخت پیش از ازدواج',
  amountRial: '100000', definition, eligibleRoles: ['FIRST'],
  linkingPolicy: { id: publication, title: 'شرایط اتصال حساب‌ها', body: 'شرایط این ارتباط را می‌پذیرم.' },
};
const makeRequest = (id, isInitiator) => ({
  id, isInitiator, status: 'PENDING', ownEligible: true,
  eligibilityNotConfirmed: false, ownRole: isInitiator ? 'FIRST' : 'SECOND',
  recipientPhoneMasked: isInitiator ? '09•••••6789' : null, initiatorName: isInitiator ? null : 'دعوت‌کننده',
  ownIneligibilityReason: null, continuation: { profileRequired: false, nextPath: '/assessment/marriage/requests/' + id },
  service, invitationPath: '/assessment/marriage/requests/' + id,
  educationalId: null, smsStatus: null, createdAt: '2026-11-09T00:00:00Z',
});

const browser = await chromium.launch();
try {
  for (const width of [375, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    const errors = []; let writes = 0;
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/v1/**', async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname;
      const headers = { 'access-control-allow-origin': request.headers().origin || '*', 'access-control-allow-credentials': 'true' };
      const send = (payload, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(payload) });
      if (request.method() === 'OPTIONS') return route.fulfill({
        status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'authorization,content-type,idempotency-key,x-marriage-request-id' },
      });
      if (path.endsWith('/auth/refresh')) return send({ accessToken: 'fixture', expiresIn: 600, user: { id: publication, roles: ['PATIENT'] } });
      if (path.endsWith('/entry')) return send({ required: false });
      if (path.endsWith('/educational-assessment-offerings')) return send({
        items: [{ id: publication, title: service.title, kind: 'COUPLES', servicePurpose: 'MARRIAGE', priceMode: 'PAID', amountRial: '100000' }],
        total: 1, page: 1, pageSize: 20,
      });
      if (path.endsWith('/marriage-requests/settings/' + publication)) return send(service);
      if (path.endsWith('/marriage-requests') && request.method() === 'GET') return send({
        items: [makeRequest(receivedId, false)], total: 1, page: 1, pageSize: 20,
      });
      if (path.endsWith('/marriage-requests') && request.method() === 'POST') {
        writes++;
        const body = request.postDataJSON();
        assert.equal(body.publicationId, publication);
        assert.equal(body.initiatorRole, 'FIRST');
        assert.equal(body.recipientPhone, '09123456789');
        assert.equal(body.consentAccepted, true);
        assert.ok(request.headers()['idempotency-key']);
        return send(makeRequest(requestId, true), 201);
      }
      if (path.endsWith('/marriage-requests/' + requestId)) return send(makeRequest(requestId, true));
      return send({ items: [], total: 0, unreadCount: 0 });
    });

    await page.goto(base + '/assessment/couples');
    await expect(page.getByRole('heading', { name: 'تست دو نفره', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'دعوت جدید داری', exact: true })).toBeVisible();
    const offering = page.getByRole('link', { name: /انتخاب و ادامه/ });
    await offering.click();
    await expect(page).toHaveURL(new RegExp('/assessment/couples\\?start=' + publication));
    await expect(page.getByRole('heading', { name: service.title, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'دعوت نفر دوم' })).toBeVisible();
    await page.getByLabel('شماره موبایل نفر دوم').fill('09123456789');
    const submit = page.getByRole('button', { name: 'ساخت دعوت و دریافت لینک' });
    assert.equal(await submit.isDisabled(), true);
    await page.getByRole('checkbox').check();
    await submit.click();
    await expect(page).toHaveURL(base + '/assessment/marriage/requests/' + requestId);
    await expect(page.getByRole('button', { name: 'کپی لینک دعوت' })).toBeVisible();
    assert.equal(writes, 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ PASS: true, width, writes, primaryPages: 2, preservedConsent: true }));
    await page.close();
  }
} finally {
  await browser.close();
}
