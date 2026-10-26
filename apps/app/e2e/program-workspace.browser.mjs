import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('.local/program-workspace', { recursive: true });
const id = '11111111-1111-4111-8111-111111111111';
const safety = { intendedAudience: 'عموم بزرگسالان', limitations: 'آموزشی', contraindications: [], seekProfessionalCare: 'مراجعه به متخصص' };
const first = { id, programKey: 'TEXT_TEST', locale: 'fa-IR', versionNumber: 1, kind: 'READY_EDUCATION', title: 'شناخت ویژگی‌های شخصیتی', summary: 'راهنمای آموزشی برای شناخت بهتر ویژگی‌ها و الگوهای رفتاری متناسب با نتیجهٔ مزاج‌شناسی شما.', body: 'متن کامل آموزشی', status: 'APPROVED', safety, contentReferences: [] };
const browser = await chromium.launch();
try {
  for (const [width, height] of [[375,820],[390,850],[768,850],[1440,900],[844,390]]) {
    const mobile = width < 768;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    let sourceRequests = 0, created = null;
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error' && /validateDOMNesting|In HTML|hydration|unique.*key|cannot be a descendant/i.test(msg.text())) errors.push(msg.text()); });
    await page.route('**/v1/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname, origin = req.headers().origin ?? 'http://localhost:3002';
      const send = data => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true' }, body: JSON.stringify(data) });
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS', 'access-control-allow-headers': 'authorization,content-type,idempotency-key' } });
      if (path === '/v1/auth/refresh') return send({ accessToken: 'synthetic', tokenType: 'Bearer', expiresIn: 600, user: { id, phone: '+989000000000', roles: ['ADMIN'] } });
      if (path === '/v1/admin/program-definitions') return send({ items: Array.from({length:12}, (_,i) => ({ ...first, id: i ? `${String(i + 1).padStart(8,'0')}-1111-4111-8111-111111111111` : id, title: i ? `خدمت آموزشی شماره ${i + 1}` : first.title, status: i % 2 ? 'DRAFT' : 'APPROVED' })), total: 12, page: 1, pageSize: 12 });
      if (path.endsWith('/mezaj')) return send({ programDefinitionId: id, revision: 1, enabled: true, icon: 'book', pairs: ['damavi/safravi'] });
      if (path.includes('/program-offerings/setup/')) return send({ latestPublication: null, defaultTerms: { title: 'شرایط خرید خدمات اختصاصی مزاج', body: 'دسترسی دائمی پس از خرید', versionNumber: 1 }, termsPolicy: null, suggestedRetentionPolicyRef: null });
      if (path === '/v1/admin/guidance-content') { sourceRequests++; return send({ items: [], total: 0, page: 1, pageSize: 50 }); }
      if (path === '/v1/admin/program-definitions/versions' && req.method() === 'POST') { created = req.postDataJSON(); return send({ ...first, ...created, contentReferences: [], status: 'DRAFT' }); }
      return send({ items: [], total: 0, unreadCount: 0 });
    });
    await page.goto('http://localhost:3002/programs');
    await page.getByRole('button', { name: /شناخت ویژگی‌های شخصیتی/ }).waitFor();
    const root = page.getByRole('region', { name: 'فضای مدیریت خدمات', exact: true });
    assert.ok(await root.evaluate(el => el.scrollHeight > el.clientHeight));
    assert.equal(await root.evaluate(el => getComputedStyle(el).overflowY), 'auto');
    await root.evaluate(el => { el.scrollTop = 0; });
    const cardSizes = await page.locator('.program-definition-card').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().height));
    assert.ok(cardSizes.every(height => height <= 170));
    await page.screenshot({ path: `.local/program-workspace/list-${width}.png` });
    await root.hover();
    await page.mouse.wheel(0, 1000);
    await page.waitForFunction(() => document.querySelector('.program-workspace').scrollTop > 50);
    await root.focus();
    await page.keyboard.press('End');
    await page.waitForFunction(() => { const el = document.querySelector('.program-workspace'); return el.scrollTop + el.clientHeight >= el.scrollHeight - 2; });
    const pager = await page.getByRole('navigation', { name: 'صفحه‌های خدمات', exact: true }).boundingBox();
    assert.ok(pager.y >= 0 && pager.y + pager.height <= height);
    await page.getByRole('button', { name: 'خدمت جدید', exact: true }).click();
    const popup = page.getByRole('dialog');
    await popup.waitFor();
    await page.getByLabel(/عنوان خدمت/).fill('متن ذخیره‌نشدهٔ آزمایشی');
    assert.ok(await popup.evaluate(el => el.scrollHeight > el.clientHeight));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `.local/program-workspace/form-${width}.png` });
    if (mobile) {
      await popup.evaluate(el => { el.scrollTop = 0; });
      const client = await context.newCDPSession(page);
      const x = Math.round(width / 2), y = height - 80;
      await client.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{x,y}] });
      for (let offset=20;offset<=300;offset+=20) await client.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{x,y:y-offset}] });
      await client.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
      await page.waitForFunction(() => document.querySelector('.program-dialog[open]').scrollTop > 30);
      await client.detach();
    }
    await popup.focus(); await page.keyboard.press('End');
    await page.waitForFunction(() => { const el=document.querySelector('.program-dialog[open]');return el.scrollTop+el.clientHeight>=el.scrollHeight-2; });
    const save = await page.getByRole('button', { name: 'ذخیرهٔ پیش‌نویس نسخهٔ جدید', exact: true }).boundingBox();
    assert.ok(save.y >= 0 && save.y + save.height <= height);
    await page.screenshot({ path: `.local/program-workspace/form-end-${width}.png` });
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'بستن', exact: true }).click();
    assert.equal(await page.getByLabel(/عنوان خدمت/).inputValue(), 'متن ذخیره‌نشدهٔ آزمایشی');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'بستن', exact: true }).click();
    await root.focus(); await page.keyboard.press('End');
    await page.waitForFunction(() => { const el=document.querySelector('.program-workspace');return el.scrollTop+el.clientHeight>=el.scrollHeight-2; });
    const opener = page.locator('.program-definition-card').last();
    const listPosition = await root.evaluate(el => el.scrollTop);
    await opener.click();
    for (let i=0;i<12;i++) { await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => !!document.activeElement?.closest('dialog[open]')), true); }
    await page.keyboard.press('Escape');
    await popup.waitFor({ state: 'hidden' });
    assert.equal(await root.evaluate(el => el.scrollTop), listPosition);
    assert.equal(await opener.evaluate(el => el === document.activeElement), true);
    if (width >= 768) {
      await opener.click(); await popup.waitFor();
      await page.mouse.click(2, 2);
      await popup.waitFor({ state: 'hidden' });
    }
    await page.getByRole('button', { name: /شناخت ویژگی‌های شخصیتی/ }).click();
    await page.getByRole('button', { name: 'مزاج و نمایش', exact: true }).click();
    await page.getByLabel('آیکون خدمت', { exact: true }).selectOption('heart');
    await page.getByRole('button', { name: 'قیمت و انتشار', exact: true }).click();
    await page.getByLabel('قیمت خدمت به تومان', { exact: true }).fill('۱۲۳۴۵');
    await page.getByRole('button', { name: 'مزاج و نمایش', exact: true }).click();
    assert.equal(await page.getByLabel('آیکون خدمت', { exact: true }).inputValue(), 'heart');
    await page.getByRole('button', { name: 'قیمت و انتشار', exact: true }).click();
    assert.equal(await page.getByLabel('قیمت خدمت به تومان', { exact: true }).inputValue(), '۱۲۳۴۵');
    await popup.evaluate(el => { el.scrollTop = 0; });
    await page.screenshot({ path: `.local/program-workspace/editor-${width}.png` });
    await page.getByRole('button', { name: 'بستن', exact: true }).click();
    await page.getByRole('button', { name: 'خدمت جدید', exact: true }).click();
    for (const [label,value] of [['عنوان خدمت','شخصیت‌شناسی بر اساس مزاج'],['دسته‌بندی','شناخت خود'],['معرفی کوتاه پیش از خرید','معرفی آموزشی خدمت'],['متن کامل پس از خرید','متن خریداری‌شدهٔ آموزشی'],['این محتوا برای چه کسانی است؟','عموم بزرگسالان'],['شرایط استفاده','مطالعهٔ شخصی'],['محدودیت‌های محتوای آموزشی','محتوای آموزشی'],['راهنمای مراجعه به متخصص','در صورت نیاز مراجعه کنید.']]) await page.getByLabel(label).fill(value);
    assert.equal(await page.getByText('منابع آموزشی تأییدشدهٔ مرتبط', { exact: true }).count(), 0);
    const create = page.getByRole('button', { name: 'ذخیرهٔ پیش‌نویس نسخهٔ جدید', exact: true });
    assert.equal(await create.isDisabled(), false);
    await create.click();
    await page.getByRole('button', { name: 'ویرایش در نسخهٔ تازه', exact: true }).waitFor();
    assert.equal(created.title, 'شخصیت‌شناسی بر اساس مزاج');
    assert.equal(created.contentReferences, undefined);
    assert.equal(sourceRequests, 0);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS ${width}x${height}: real wheel/End${mobile?'/touch':''} scrolling, bottom actions reachable, sections preserve drafts, dirty-close recovery, no overflow/errors`);
  }
} finally { await browser.close(); }
