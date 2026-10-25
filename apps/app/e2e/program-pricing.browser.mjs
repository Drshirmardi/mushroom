import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('.local/program-pricing', { recursive: true });
const id = '11111111-1111-4111-8111-111111111111';
const termsId = '22222222-2222-4222-8222-222222222222';
const terms = { id: termsId, policyKey: 'PROGRAM_PURCHASE_TERMS', title: 'شرایط خرید آموزشی', versionNumber: 2, locale: 'fa-IR', body: 'متن آزمایشی شرایط خرید خدمات آموزشی', contentHash: 'b'.repeat(64) };
const definition = { id, programKey: 'TEXT_TEST', locale: 'fa-IR', versionNumber: 1, kind: 'READY_EDUCATION', title: 'خدمت آزمایشی', summary: 'متن معرفی آزمایشی', body: 'متن کامل', status: 'APPROVED', contentHash: 'a'.repeat(64), safety: { limitations: 'آموزشی', contraindications: [], seekProfessionalCare: 'مراجعه به متخصص' }, contentReferences: [] };
const browser = await chromium.launch();
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 850 } });
    const page = await context.newPage();
    const errors = [];
    let missingTerms = false, loadError = false, conflict = false, blocked = false, previewConfig = null, publishedBody = null;
    let publication = { id, programDefinitionId: id, amountRial: '1500001', status: 'ACTIVE', configurationReady: true, accessMode: 'DAYS', accessDurationDays: 30, quoteTtlSeconds: 600, retentionPolicyRef: 'REVIEWED_TEST', publicationNumber: 1 };
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/v1/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname, origin = req.headers().origin ?? 'http://localhost:3002';
      const send = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true' }, body: JSON.stringify(data) });
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS', 'access-control-allow-headers': 'authorization,content-type,idempotency-key' } });
      if (path === '/v1/auth/refresh') return send({ accessToken: 'synthetic', tokenType: 'Bearer', expiresIn: 600, user: { id, phone: '+989000000000', roles: ['ADMIN'] } });
      if (path === '/v1/admin/program-definitions') return send({ items: [definition], total: 1, page: 1, pageSize: 12 });
      if (path.endsWith('/mezaj')) return send({ programDefinitionId: id, revision: 1, enabled: true, icon: 'book', pairs: ['damavi/safravi'] });
      if (path === `/v1/admin/program-offerings/setup/${id}`) return loadError ? send({ code: 'UNAVAILABLE' }, 503) : send({ latestPublication: publication, termsPolicy: missingTerms ? null : terms, suggestedRetentionPolicyRef: 'REVIEWED_TEST' });
      if (path === '/v1/admin/program-offerings/preview') {
        previewConfig = req.postDataJSON();
        return send({ configuration: previewConfig, definition, termsPolicy: terms, configurationReady: !blocked, publicationHash: blocked ? null : 'c'.repeat(64), expectedPublicationNumber: publication.publicationNumber, blockers: blocked ? ['PROGRAM_CLINICAL_DEFINITION_UNAVAILABLE'] : [] });
      }
      if (path === '/v1/admin/program-offerings' && req.method() === 'POST') {
        publishedBody = req.postDataJSON();
        if (conflict) return send({ code: 'PROGRAM_PUBLICATION_CONFLICT' }, 409);
        assert.ok(req.headers()['idempotency-key']);
        publication = { ...publication, ...publishedBody, retentionPolicyRef: publishedBody.retentionPolicyRef ?? null, publicationNumber: publication.publicationNumber + 1 };
        return send(publication, 201);
      }
      return send({ items: [], total: 0, unreadCount: 0 });
    });
    const open = async () => { await page.goto('http://localhost:3002/programs'); await page.getByRole('button', { name: /خدمت آزمایشی/ }).click(); await page.getByRole('button', { name: 'قیمت و انتشار', exact: true }).click(); };
    await open();
    const region = page.getByRole('region', { name: 'قیمت و انتشار' });
    const price = page.getByLabel('قیمت خدمت به تومان', { exact: true });
    await price.waitFor();
    assert.equal(await price.inputValue(), '150000.1');
    await region.getByText('آخرین تعرفهٔ منتشرشده: ۱۵۰٬۰۰۰ تومان و ۱ ریال', { exact: true }).waitFor();
    await price.fill('۱۵۰٬۰۰۰');
    await region.getByRole('button', { name: 'بررسی آمادگی انتشار' }).click();
    await region.getByRole('heading', { name: 'آمادهٔ انتشار', exact: true }).waitFor();
    assert.equal(previewConfig.amountRial, '1500000');
    assert.equal(previewConfig.retentionPolicyRef, undefined);
    assert.equal(await page.getByLabel('مرجع مصوب نگهداری سوابق', { exact: true }).count(), 0);
    assert.equal(previewConfig.termsPolicyVersionId, termsId);
    assert.equal(previewConfig.accessMode, 'DAYS');
    assert.equal(previewConfig.accessDurationDays, 30);
    assert.equal(previewConfig.quoteTtlSeconds, 600);
    const publish = region.getByRole('button', { name: 'انتشار برای خرید', exact: true });
    assert.equal(await publish.isDisabled(), true);
    await region.getByRole('checkbox').check();
    conflict = true;
    await publish.click();
    await region.getByText(/نوشته‌های شما حفظ شده/).waitFor();
    assert.equal(await price.inputValue(), '۱۵۰٬۰۰۰');
    conflict = false;
    await publish.click();
    await region.getByText('تعرفه با موفقیت منتشر شد.').waitFor();
    assert.equal(publishedBody.amountRial, '1500000');
    assert.equal(publishedBody.retentionPolicyRef, undefined);
    await page.getByRole('button', { name: 'بستن', exact: true }).click();
    await page.getByRole('button', { name: /خدمت آزمایشی/ }).click();
    await page.getByRole('button', { name: 'قیمت و انتشار', exact: true }).click();
    await price.waitFor();
    assert.equal(await price.inputValue(), '150000');
    await region.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `.local/program-pricing/programs-${width}.png`, fullPage: true });
    blocked = true;
    await region.getByRole('button', { name: 'بررسی آمادگی انتشار' }).click();
    await region.getByText(/متن این نسخه یا منابع آن هنوز تأیید معتبر پزشک ندارند/).waitFor();
    assert.equal(await publish.count(), 0);
    missingTerms = true;
    await open();
    await region.getByText(/شرایط خرید خدمات برای این کلینیک هنوز فعال نشده/).waitFor();
    assert.equal(await region.getByRole('button', { name: 'بررسی آمادگی انتشار' }).isDisabled(), true);
    loadError = true;
    await open();
    await region.getByRole('button', { name: 'تلاش دوباره', exact: true }).waitFor();
    loadError = false;
    await region.getByRole('button', { name: 'تلاش دوباره', exact: true }).click();
    await price.waitFor();
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS ${width}: saved/exact price, Persian toman, publication/409/reopen, access duration, translated blockers, missing terms, retry, no overflow/errors`);
  }
} finally { await browser.close(); }
