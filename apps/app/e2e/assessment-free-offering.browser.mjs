import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const id = '71111111-1111-4111-8111-111111111111', consent = '72222222-2222-4222-8222-222222222222', grant = '73333333-3333-4333-8333-333333333333';
const browser = await chromium.launch();
try {
 for (const width of [390, 1440]) for (const mode of ['PAID']) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [], writes = [];
  page.on('pageerror', e => errors.push(e.message));
  let release, entered; const submitted = new Promise(resolve => { release = resolve; }); const requested = new Promise(resolve => { entered = resolve; });
  await page.route('**/v1/**', async route => {
   const req = route.request(), path = new URL(req.url()).pathname;
   const headers = { 'access-control-allow-origin': req.headers().origin || 'http://localhost:3001', 'access-control-allow-credentials': 'true' };
   const send = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(data) });
   if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS', 'access-control-allow-headers': 'authorization,content-type,idempotency-key' } });
   if (path === '/v1/auth/refresh') return send({ accessToken: 'synthetic', expiresIn: 600, user: { id, phone: '+989000000000', roles: ['PATIENT'] } });
   if (path === '/v1/patients/me/entry') return send({ required: false });
   if (path === `/v1/patients/me/educational-assessment-offerings/${id}`) return send({ id, offeringVersionId: id, title: 'ارزیابی رایگان آزمایشی', kind: 'INDIVIDUAL', priceMode: mode, amountRial: mode === 'FREE' ? '0' : '250000', publicationHash: 'b'.repeat(64), termsPolicy: mode === 'PAID' ? { id: grant, title: 'شرایط خرید همین نسخه', body: 'متن خرید همین آزمون', contentHash: 'c'.repeat(64) } : null, termsConsentId: null, currency: 'IRR', algorithmId: 'DIMENSION_TIEBREAK', algorithmVersion: 2, publicationAuthority: 'ADMIN_PUBLISHED', processingPolicy: { id, title: 'رضایت همین نسخه', body: 'متن پردازش و نگهداری و نمایش همین آزمون', contentHash: 'a'.repeat(64) }, processingConsentId: null, accessGrantId: null, submissionId: null, accessSupported: true, blockers: [] });
   if (path === '/v1/patients/me/assessment-consents') { writes.push('consent'); assert.ok(req.headers()['idempotency-key']); const body = req.postDataJSON(), terms = body.policyVersionId === grant; assert.deepEqual(body, { policyVersionId: terms ? grant : id, contentHash: (terms ? 'c' : 'a').repeat(64), accepted: true }); return send({ id: terms ? grant : consent, withdrawnAt: null }, 201); }
   if (path === '/v1/patients/me/educational-assessment-access') { writes.push('grant'); assert.ok(req.headers()['idempotency-key']); assert.deepEqual(req.postDataJSON(), { publicationId: id, processingConsentRecordId: consent }); entered(); await submitted; return send({ id: grant, accessMode: 'FREE', publicationId: id, grantedAt: new Date().toISOString() }, 201); }
   if (path === '/v1/patients/me/billing/assessment-intents') { assert.equal(mode, 'PAID'); writes.push('billing'); assert.ok(req.headers()['idempotency-key']); assert.deepEqual(req.postDataJSON(), { publicationId: id, publicationHash: 'b'.repeat(64), processingConsentRecordId: consent, termsConsentRecordId: grant }); entered(); await submitted; return send({ id: grant }, 201); }
   if (path.includes('/billing/') || path.includes('/wallet/')) throw new Error('Free access must not request financial action');
   return send({ items: [], total: 0, unreadCount: 0 });
  });
  await page.goto(`http://localhost:3001/assessment/educational/${id}`);
  const button = page.getByRole('button', { name: mode === 'FREE' ? 'ثبت رضایت و شروع رایگان' : 'ثبت رضایت و ادامه به پرداخت', exact: true });
  await button.waitFor(); assert.equal(await button.isDisabled(), true);
  await page.getByText('متن پردازش و نگهداری و نمایش همین آزمون', { exact: true }).waitFor();
  for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.check();
  await button.click(); await requested;
  await page.getByRole('button', { name: 'در حال ثبت…', exact: true }).waitFor();
  assert.deepEqual(writes, mode === 'FREE' ? ['consent', 'grant'] : ['consent', 'consent', 'billing']);
  assert.equal(await page.getByRole('button', { name: 'در حال ثبت…', exact: true }).isDisabled(), true);
  release();
  await page.waitForURL(mode === 'FREE' ? `**/assessment/resume?grantId=${grant}` : `**/profile/wallet/pay?intentId=${grant}`);
  assert.deepEqual(writes, mode === 'FREE' ? ['consent', 'grant'] : ['consent', 'consent', 'billing']); assert.deepEqual(errors, []);
  console.log('PASS responsive exact acceptance and single FREE entitlement or PAID existing billing handoff', mode, width);
  await page.close();
 }
} finally { await browser.close(); }
