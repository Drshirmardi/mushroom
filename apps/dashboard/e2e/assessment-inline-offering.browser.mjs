import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const id = '81111111-1111-4111-8111-111111111111';
const browser = await chromium.launch();
try {
 for (const width of [390, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let version = { id, assessmentKey: 'SYNTHETIC', locale: 'fa-IR', versionNumber: 1, status: 'DRAFT', title: 'آزمون آزمایشی', contentHash: 'a'.repeat(64), structure: { schemaVersion: 1, sections: [{ id: 's', title: 'بخش', questions: [{ id: 'q', title: 'پرسش', type: 'BOOLEAN', required: true, trueScore: 1, falseScore: 0 }] }] } }, published = 0;
  await page.route('**/v1/**', async route => {
   const req = route.request(), path = new URL(req.url()).pathname;
   const headers = { 'access-control-allow-origin': req.headers().origin || 'http://localhost:3002', 'access-control-allow-credentials': 'true' };
   const send = data => route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(data) });
   if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'authorization,content-type,idempotency-key' } });
   if (path === '/v1/auth/refresh') return send({ accessToken: 'synthetic', expiresIn: 600, user: { id, phone: '+989000000000', roles: ['ADMIN'] } });
   if (path === '/v1/admin/assessments') return send({ items: [version], total: 1, page: 1, pageSize: 12 });
   if (path === `/v1/admin/assessments/${id}`) {
    if (req.method() === 'PATCH') version = { ...version, ...req.postDataJSON(), contentHash: 'b'.repeat(64) };
    return send(version);
   }
   if (path === '/v1/admin/assessment-offerings/inline-versions') {
    published++; assert.ok(req.headers()['idempotency-key']);
    const body = req.postDataJSON(); assert.equal(body.expectedQuestionnaireHash, version.contentHash);
    assert.equal(body.assessmentVersionId, id); assert.equal(body.priceMode, 'PAID');
    for (const field of ['offeringKey', 'algorithmId', 'consentPolicyVersionId', 'protocolReviewId']) assert.equal(field in body, false);
    version = { ...version, status: 'PUBLISHED', publishedAt: new Date().toISOString() };
    return send({ ...body, id, versionNumber: 1, offeringKey: 'AUTO_SYNTHETIC', status: 'DRAFT', publicationAuthority: 'ADMIN_PUBLISHED', authoringTexts: body.texts, policyDraft: {}, releaseReadiness: { ready: true, blockers: [] } });
   }
   return send({ items: [], total: 0, page: 1, pageSize: 20, unreadCount: 0 });
  });
  await page.goto('http://localhost:3002/assessments');
  await page.getByRole('button', { name: 'ویرایش و مدیریت', exact: true }).click();
  await page.getByLabel('عنوان آزمون', { exact: true }).fill('عنوان تازه ذخیره نشده');
  await page.getByRole('button', { name: 'عرضه و اتصال‌ها', exact: true }).click();
  const action = page.getByRole('button', { name: 'انتشار آزمون و عرضه', exact: true });
  await action.waitFor(); assert.equal(await action.isDisabled(), true); assert.equal(published, 0);
  await page.getByRole('button', { name: 'ذخیرهٔ پیش‌نویس', exact: true }).click();
  await page.getByText('پیش‌نویس روی سرور ذخیره شد.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'عرضه و اتصال‌ها', exact: true }).click();
  await page.getByLabel('عنوان عرضه', { exact: true }).fill('عرضهٔ تازه');
  await page.getByRole('textbox', { name: 'مبلغ به ریال', exact: true }).fill('100000');
  await action.click();
  await page.getByText('آزمون و عرضه منتشر شدند.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'ساخت پیش‌نویس از این نسخه', exact: true }).waitFor();
  assert.equal(published, 1); assert.equal(await page.getByLabel('عنوان عرضه', { exact: true }).inputValue(), 'عرضهٔ تازه');
  assert.deepEqual(errors, []); console.log('PASS inline no-ID publication, dirty source guard and refresh preserving offer text', width);
  await page.close();
 }
} finally { await browser.close(); }
