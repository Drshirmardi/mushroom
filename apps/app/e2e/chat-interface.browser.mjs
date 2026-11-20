import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const userId = '11111111-1111-4111-8111-111111111111';
const appointmentId = '22222222-2222-4222-8222-222222222222';
const conversationId = '33333333-3333-4333-8333-333333333333';
const secondAppointmentId = '66666666-6666-4666-8666-666666666666';
const secondConversationId = '77777777-7777-4777-8777-777777777777';
const olderVisitId = '55555555-5555-4555-8555-555555555555';
const archiveId = '44444444-4444-4444-8444-444444444444';
const createdAt = new Date().toISOString();
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lVwAAAAASUVORK5CYII=', 'base64');
const mp4 = process.env.CHAT_TEST_MP4 ? await readFile(process.env.CHAT_TEST_MP4) : null;
const message = (sequence, name, mime, body) => ({
  id: 'message-' + sequence, sequence: String(sequence), senderKind: 'DOCTOR', createdAt, body: '', visibility: 'VISIBLE',
  attachment: { name, mime, size: body.length },
});
const image = message(1, 'sample.png', 'image/png', png);
const pdfBytes = Buffer.from('%PDF-1.7 synthetic');
const pdf = message(2, 'sample.pdf', 'application/pdf', pdfBytes);
const video = mp4 && message(3, 'sample.mp4', 'video/mp4', mp4);
const outgoing = message(5, 'test.pdf', 'application/pdf', pdfBytes);
const call = { id: 'demo-call', mode: 'AUDIO', status: 'MISSED' };
const active = { id: 'active-call', mode: 'AUDIO', status: 'ACTIVE', connectedAt: createdAt };
const items = [image, pdf, ...(video ? [video] : []), { id: 'marker', sequence: '4', senderKind: 'DOCTOR', createdAt, body: '', visibility: 'VISIBLE', callId: call.id }];

try {
  for (const [role, base, embedded] of [
    ['PATIENT', process.env.APP_URL ?? 'http://localhost:3001', false],
    ['ADMIN', process.env.DASHBOARD_URL ?? 'http://localhost:3002', false],
    ['ADMIN', process.env.DASHBOARD_URL ?? 'http://localhost:3002', true],
  ]) {
    const patient = role === 'PATIENT';
    const page = await browser.newPage({ viewport: patient ? { width: 320, height: 750 } : { width: 1240, height: 850 }, acceptDownloads: true });
    page.setDefaultTimeout(12_000);
    const attempts = [];
    const archiveRequests = [];
    const keyWarnings = [];
    let holdArchive;
    page.on('console', entry => {
      if (entry.text().includes('Encountered two children with the same key')) keyWarnings.push(entry.text());
    });
    const visit = {
      id: appointmentId, patientId: userId, patientDisplayName: 'بیمار آزمایشی',
      status: 'IN_PROGRESS', visitMode: 'ONLINE', startsAt: createdAt, endsAt: createdAt,
    };
    const historical = (id, sequence, body) => ({ id, sequence, body, senderKind: 'DOCTOR', createdAt, visibility: 'VISIBLE' });
    const conversation = { id: conversationId, appointmentId, clinicId: userId, patientId: userId, doctorId: userId, transport: 'mushroom', closedAt: null };
    await page.route('**/v1/**', async route => {
      const request = route.request();
      const { pathname, searchParams } = new URL(request.url());
      const headers = {
        'access-control-allow-origin': request.headers().origin ?? base,
        'access-control-allow-credentials': 'true',
        'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type',
      };
      const send = (json, status = 200) => route.fulfill({ status, headers, json });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (pathname === '/v1/auth/refresh') return send({ accessToken: 'synthetic', expiresIn: 3600, user: { id: userId, phone: "+989120001029", roles: [role] } });
      if (pathname === '/v1/patients/me/entry') return send({ required: false, firstName: 'آزمایشی' });
      if (pathname === '/v1/patients/me' || pathname === '/v1/me') return send({ firstName: 'آزمایشی', id: userId, roles: [role] });
      if (pathname === '/v1/admin/appointments') return send({ items: [visit, { ...visit, id: secondAppointmentId, patientDisplayName: 'بیمار دوم' }], page: 1, pageSize: 20, total: 2 });
      if (pathname === '/v1/admin/appointments/' + appointmentId) return send(visit);
      if (pathname.endsWith('/previous-conversations')) {
        archiveRequests.push('list');
        if (holdArchive) await holdArchive;
        return send({ items: [
          { conversationId: archiveId, appointmentId: userId, startsAt: '2025-11-18T15:00:00Z' },
          { conversationId: olderVisitId, appointmentId: olderVisitId, startsAt: '2025-11-16T15:00:00Z' },
        ], nextCursor: null });
      }
      if (pathname === '/v1/chat/conversations/' + archiveId + '/messages') {
        const older = searchParams.get('direction') === 'before';
        archiveRequests.push(older ? 'page' : 'recent');
        if (archiveRequests.length === 2) return send({ code: 'SERVICE_UNAVAILABLE' }, 503);
        return send({
          items: [older ? historical('archive-first', '1', 'ابتدای پیام ویزیت قبلی') : historical('archive-recent', '2', 'پیام نوبت قبلی')],
          nextCursor: older ? null : 'archive-cursor', checkpointCursor: 'archive-cursor',
        });
      }
      if (pathname === '/v1/chat/conversations/' + olderVisitId + '/messages') {
        archiveRequests.push('older-visit');
        return send({ items: [historical('archive-older-visit', '1', 'پیام ویزیت قدیمی‌تر')], nextCursor: null });
      }
      if (pathname.endsWith('/conversation')) return send(pathname.includes(secondAppointmentId)
        ? { ...conversation, id: secondConversationId, appointmentId: secondAppointmentId }
        : conversation);
      if (pathname.endsWith('/access')) return send({ conversation, senderKind: role, canSend: true, canClose: true });
      if (pathname.endsWith('/messages')) return send({ items: searchParams.get('direction') === 'latest' ? items : [], nextCursor: null, checkpointCursor: 'cursor' });
      if (pathname.endsWith('/video')) return send({ available: true });
      if (pathname.endsWith('/incoming') || pathname.endsWith('/current')) return send({ call: null });
      if (pathname.endsWith('/calls') && request.method() === 'POST') return send(active, 201);
      if (pathname.endsWith('/calls/' + active.id)) return send(active);
      if (pathname.endsWith('/calls/' + active.id + '/grant')) return send({ url: 'http://localhost:5444/mushroom-call.html?mode=AUDIO#synthetic' }, 201);
      if (pathname.endsWith('/calls/' + call.id)) return send(call);
      if (pathname.includes('/attachments/')) {
        if (request.method() === 'POST') {
          attempts.push(pathname);
          return attempts.length === 1 ? send({ code: 'SERVICE_UNAVAILABLE' }, 503) : send(outgoing, 201);
        }
        for (const [entry, bytes] of [[image, png], [pdf, pdfBytes], [video, mp4]]) {
          if (entry && pathname.endsWith('/' + entry.id)) return route.fulfill({ status: 200, headers, body: bytes, contentType: entry.attachment.mime });
        }
      }
      return send({ items: [] });
    });

    await page.goto(patient ? base + '/chat?appointmentId=' + appointmentId : embedded ? base + '/appointments/' + appointmentId : base + '/messages');
    if (!patient && !embedded) await page.getByRole('button', { name: /بیمار آزمایشی/ }).click();
    const log = page.getByRole('log');
    await log.getByText('بی‌پاسخ').waitFor();
    const send = page.getByRole('button', { name: 'ارسال پیام', exact: true });
    const input = page.getByRole('textbox', { name: 'متن پیام' });
    const attach = page.getByRole('button', { name: 'افزودن پیوست' });
    const [right, middle, left] = await Promise.all([send.boundingBox(), input.boundingBox(), attach.boundingBox()]);
    assert.ok(right.x > middle.x && middle.x > left.x, role + ' composer must place send on the right');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    if (patient) assert.equal(await page.getByText('گزارش پیام', { exact: true }).count(), 0);
    else {
      await page.getByRole('button', { name: 'تماس صوتی', exact: true }).waitFor();
      await page.getByRole('button', { name: 'تماس تصویری', exact: true }).waitFor();
    }

    await log.getByText('sample.png', { exact: true }).scrollIntoViewIfNeeded();
    await log.getByRole('button', { name: 'بازکردن تصویر' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('img').waitFor();
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    if (video) {
      await log.getByText('sample.mp4', { exact: true }).scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('[role="log"] video')?.videoWidth > 0);
    }
    const downloadPromise = page.waitForEvent('download');
    await log.getByRole('button', { name: 'دانلود sample.pdf' }).click();
    assert.equal((await downloadPromise).suggestedFilename(), 'sample.pdf');

    await attach.click();
    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'سند', exact: true }).click();
    await (await chooserPromise).setFiles({ name: 'test.pdf', mimeType: 'application/pdf', buffer: pdfBytes });
    await page.getByRole('button', { name: 'ارسال فایل' }).click();
    await page.getByRole('alert').filter({ hasText: 'سرویس پیوست موقتاً در دسترس نیست' }).waitFor();
    await page.getByRole('button', { name: 'تلاش دوباره' }).click();
    await log.getByText('test.pdf', { exact: true }).waitFor();
    assert.equal(attempts.length, 2);
    assert.equal(attempts[0], attempts[1]);
    assert.deepEqual(archiveRequests, []);
    assert.equal(await page.getByRole('button', { name: 'گفتگوهای قبلی', exact: true }).count(), 0);
    const showHistory = page.getByRole('button', { name: 'نمایش پیام‌های ویزیت قبلی', exact: true });
    assert.equal(await showHistory.count(), 1);
    await showHistory.click();
    await page.getByRole('alert').filter({ hasText: 'دریافت پیام‌های ویزیت قبلی ممکن نشد' }).waitFor();
    await page.getByRole('button', { name: 'تلاش دوباره', exact: true }).click();
    const archive = page.getByRole('region', { name: 'پیام‌های ویزیت قبلی', exact: true });
    await archive.getByText('پیام نوبت قبلی', { exact: true }).waitFor();
    assert.equal(await archive.getByRole('textbox').count(), 0);
    assert.equal(await page.getByRole('dialog').count(), 0);
    const moreHistory = page.getByRole('button', { name: 'نمایش پیام‌های قدیمی‌تر', exact: true });
    await moreHistory.click();
    await archive.getByText('ابتدای پیام ویزیت قبلی', { exact: true }).waitFor();
    assert.equal(await page.getByText('پیام نوبت قبلی', { exact: true }).count(), 1);
    await moreHistory.click();
    await archive.getByText('پیام ویزیت قدیمی‌تر', { exact: true }).waitFor();
    assert.deepEqual(archiveRequests, ['list', 'recent', 'recent', 'page', 'older-visit']);
    assert.deepEqual(keyWarnings, []);
    if (!patient && !embedded) {
      const firstVisit = page.getByRole('button', { name: /بیمار آزمایشی/ });
      const secondVisit = page.getByRole('button', { name: /بیمار دوم/ });
      await secondVisit.click();
      await showHistory.waitFor();
      assert.equal(await archive.count(), 0);
      await firstVisit.click();

      let release;
      holdArchive = new Promise(resolve => { release = resolve; });
      const pending = page.waitForRequest(request => request.url().includes('/' + appointmentId + '/previous-conversations'));
      await showHistory.click();
      await pending;
      try {
        await secondVisit.click();
        await showHistory.waitFor();
      } finally {
        release();
        holdArchive = undefined;
      }
      await firstVisit.click();
      await showHistory.waitFor();
      assert.equal(await archive.count(), 0);
      assert.equal(archiveRequests.at(-1), 'list');
    }
    if (!patient) {
      await page.getByRole('button', { name: 'تماس صوتی', exact: true }).click();
      const frame = page.frameLocator('iframe[title="تماس صوتی"]');
      await frame.locator('#connect').waitFor();
      assert.equal(await page.getByRole('button', { name: 'پایان تماس', exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'اتصال مجدد', exact: true }).count(), 0);
      await page.evaluate(() => window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'mushroom-call:recover' }, origin: window.location.origin, source: window,
      })));
      assert.equal(await page.getByRole('button', { name: 'اتصال مجدد', exact: true }).count(), 0);
      await frame.locator('body').evaluate((element, origin) => {
        element.ownerDocument.defaultView.parent.postMessage({ type: 'mushroom-call:recover' }, origin);
      }, new URL(base).origin);
      await page.getByRole('button', { name: 'اتصال مجدد', exact: true }).waitFor();
    }
    console.log(role + (embedded ? ' (visit workspace)' : '') + ' composer, attachments, and inline paginated history passed.');
    await page.close();
  }
} finally {
  await browser.close();
}
