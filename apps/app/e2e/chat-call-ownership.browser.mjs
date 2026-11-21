import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { chromium, expect } from '@playwright/test';

const userId = '11111111-1111-4111-8111-111111111111';
const appointmentId = '22222222-2222-4222-8222-222222222222';
const secondAppointmentId = '33333333-3333-4333-8333-333333333333';
const callerName = 'پزشک آزمایشی';
const patientName = 'بیمار آزمایشی';
const now = new Date().toISOString();
const videoOrigin = 'http://localhost:5444';
const streams = new Set();
let state = null;
const headers = origin => ({
  'access-control-allow-origin': origin,
  'access-control-allow-credentials': 'true',
  'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type',
});
const streamServer = createServer((request, response) => {
  const cors = headers(request.headers.origin ?? 'http://localhost:3002');
  if (request.method === 'OPTIONS') { response.writeHead(204, cors).end(); return; }
  response.writeHead(200, { ...cors, 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
  response.write('data: ' + JSON.stringify({ call: state }) + '\n\n');
  streams.add(response);
  response.on('close', () => streams.delete(response));
});
function publish(next) {
  state = next;
  for (const response of streams) response.write('data: ' + JSON.stringify({ call: next }) + '\n\n');
}
const browser = await chromium.launch();
const frame = page => page.locator('iframe[title="تماس صوتی"]');
const takeover = page => page.getByRole('button', { name: 'انتقال به این تب' });
const call = (id, visitId, status = 'RINGING') => ({
  id, appointmentId: visitId, patientId: visitId, patientName: visitId === appointmentId ? patientName : 'بیمار دوم',
  callerName, callerKind: 'DOCTOR', conversationId: userId, mode: 'AUDIO', status, connectedAt: null,
  endedAt: null, ringsUntil: new Date(Date.now() + 90_000).toISOString(),
});

try {
  await new Promise((resolve, reject) => streamServer.once('error', reject).listen(3003, resolve));
  for (const role of ['ADMIN', 'PATIENT']) {
    const patient = role === 'PATIENT';
    const base = patient ? process.env.APP_URL ?? 'http://localhost:3001' : process.env.DASHBOARD_URL ?? 'http://localhost:3002';
    const routePath = patient ? '/chat?appointmentId=' + appointmentId : '/messages';
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent = 'nextjs-portal { pointer-events: none !important; }';
      document.addEventListener('DOMContentLoaded', () => document.head.append(style), { once: true });
    });
    let failedVideo = false;
    let outgoingFails = false;
    let holdEnd;
    let requestEnd;
    let expireFirstGrant = !patient;
    const grants = [];
    const visits = [appointmentId, secondAppointmentId].map((id, index) => ({
      id, patientId: id, patientDisplayName: index ? 'بیمار دوم' : patientName, doctorId: userId,
      status: 'IN_PROGRESS', visitMode: 'ONLINE', startsAt: now, endsAt: now,
    }));
    const conversation = { id: userId, appointmentId, clinicId: userId, patientId: appointmentId, doctorId: userId, transport: 'mushroom', closedAt: null };
    const access = { conversation, senderKind: role, canSend: true };
    const token = 'header.' + Buffer.from(JSON.stringify({ sid: 'synthetic-session' })).toString('base64url') + '.signature';
    publish(patient ? call('patient-call', appointmentId) : null);
    await context.route(videoOrigin + '/mushroom-call.html*', route => route.fulfill({
      contentType: 'text/html', body: '<body>Mock call player</body>',
    }));
    await context.route('**/v1/**', async route => {
      const request = route.request();
      const { pathname } = new URL(request.url());
      const send = (json, status = 200) => route.fulfill({ status, headers: headers(base), json });
      if (/\/calls\/(incoming|outgoing)\/events$/.test(pathname)) return route.continue();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: headers(base) });
      if (pathname === '/v1/auth/refresh') return send({ accessToken: token, expiresIn: 3600, user: { id: userId, phone: '+989120001029', roles: [role] } });
      if (pathname === '/v1/patients/me/entry') return send({ required: false, firstName: 'آزمایشی' });
      if (pathname === '/v1/patients/me' || pathname === '/v1/me') return send({ firstName: 'آزمایشی', id: userId, roles: [role] });
      if (pathname.startsWith('/v1/directory/doctors/')) return send({ id: userId, displayName: callerName });
      if (pathname === '/v1/admin/appointments') return send({ items: visits, page: 1, pageSize: 20, total: visits.length });
      if (visits.some(visit => pathname.endsWith('/appointments/' + visit.id))) return send(visits.find(visit => pathname.endsWith(visit.id)));
      if (pathname.endsWith('/conversation')) return send(conversation);
      if (pathname.endsWith('/access')) return send(access);
      if (pathname.endsWith('/sync')) return send({ access });
      if (pathname.endsWith('/messages')) return send({ items: [], nextCursor: null, checkpointCursor: 'cursor' });
      if (pathname.endsWith('/video')) {
        if (!patient && !failedVideo) { failedVideo = true; return send({ code: 'SERVICE_UNAVAILABLE' }, 503); }
        return send({ available: true });
      }
      if (pathname.endsWith('/outgoing') && outgoingFails) return send({}, 503);
      if (/\/calls\/(incoming|current|outgoing)$/.test(pathname)) return send({ call: state?.endedAt ? null : state });
      if (pathname.endsWith('/calls') && request.method() === 'POST') {
        const visitId = pathname.split('/').at(-2);
        const next = call(visitId === appointmentId ? 'staff-call' : 'next-call', visitId);
        publish(next);
        return send(next, 201);
      }
      if (pathname.endsWith('/action')) {
        const payload = request.postDataJSON();
        if (payload.action === 'answer') {
          const next = { ...state, status: 'ACTIVE' };
          publish(next);
          return send(next, 201);
        }
        if (holdEnd) {
          requestEnd();
          await holdEnd;
          return send({}, 503);
        }
        const ended = { ...state, status: 'ENDED', endedAt: new Date().toISOString(), endReason: payload.reason };
        publish(ended);
        return send(ended, 201);
      }
      if (pathname.endsWith('/grant')) {
        grants.push(request.frame().page());
        if (expireFirstGrant) { expireFirstGrant = false; return send({ code: 'SERVICE_UNAVAILABLE' }, 503); }
        return send({ url: videoOrigin + '/mushroom-call.html#grant-' + grants.length }, 201);
      }
      if (pathname.endsWith('/calls/' + state?.id)) {
        if (outgoingFails) return send({ ...state, status: 'ACTIVE', endedAt: null });
        return send(state);
      }
      return send({ items: [] });
    });

    const first = await context.newPage();
    first.on('dialog', dialog => void dialog.accept());
    await first.goto(base + routePath);
    if (patient) {
      await first.getByRole('button', { name: 'پاسخ', exact: true }).click();
    } else {
      await first.getByRole('button', { name: new RegExp(patientName) }).click();
      await first.getByRole('button', { name: 'تماس صوتی', exact: true }).click();
      await expect.poll(() => state?.id).toBe('staff-call');
      publish({ ...state, status: 'ACTIVE' });
    }
    await expect(frame(first)).toBeVisible();
    if (!patient) assert.equal(grants.length, 2);

    if (!patient) {
      const panel = first.getByRole('region', { name: 'تماس صوتی', exact: true });
      const player = first.frameLocator('iframe[title="تماس صوتی"]').getByText('Mock call player');
      const beforeSpoof = grants.length;
      await first.evaluate(() => window.postMessage({ type: 'mushroom-call:recover' }, location.origin));
      await player.evaluate(element => {
        const child = element.ownerDocument.defaultView;
        const origin = new URL(child.location.href).searchParams.get('embedOrigin');
        child.parent.postMessage({ type: 'mushroom-call:ready' }, origin);
        child.parent.postMessage({ type: 'mushroom-call:connected' }, origin);
      });
      await first.getByRole('button', { name: 'کوچک‌کردن تماس' }).click();
      publish({ ...state, connectedAt: new Date(Date.now() - 10_000).toISOString() });
      await expect(panel.getByText(/^00:\d\d$/)).toBeVisible();
      assert.equal(grants.length, beforeSpoof);
      const src = await frame(first).getAttribute('src');
      await first.getByRole('link', { name: 'بازگشت به بیمار' }).click();
      await first.waitForURL('**/appointments/' + appointmentId);
      await expect(frame(first)).toHaveAttribute('src', src);
      assert.equal(grants.length, 2);
    }

    const second = await context.newPage();
    second.on('dialog', dialog => void dialog.accept());
    await second.goto(base + routePath);
    await expect(takeover(second)).toBeVisible();
    assert.equal(grants.includes(second), false);
    const beforeReload = grants.length;
    await first.reload();
    await expect(frame(first)).toBeAttached();
    assert.equal(grants.length, beforeReload + 1);
    assert.equal(grants.at(-1), first);

    await takeover(second).click();
    await expect(frame(second)).toBeAttached();
    await expect(frame(first)).toHaveCount(0);
    await first.reload();
    await expect(takeover(first)).toBeVisible();
    assert.equal(grants.at(-1), second);

    if (!patient) {
      await second.getByRole('button', { name: /بیمار دوم/ }).click();
      await second.getByRole('button', { name: 'تماس صوتی', exact: true }).click();
      const dialog = second.getByRole('dialog');
      await dialog.getByRole('button', { name: 'برگشت به تماس فعلی' }).click();
      assert.equal(state.id, 'staff-call');
      await second.getByRole('button', { name: 'تماس صوتی', exact: true }).click();
      await dialog.getByRole('button', { name: 'پایان و تماس با بیمار جدید' }).click();
      await expect.poll(() => state.id).toBe('next-call');
      publish({ ...state, status: 'ACTIVE' });
      await expect(frame(second)).toBeAttached();

      let finishEnd;
      const endRequested = new Promise(resolve => { requestEnd = resolve; });
      holdEnd = new Promise(resolve => { finishEnd = resolve; });
      await second.getByRole('button', { name: 'کوچک‌کردن تماس' }).click();
      await second.getByRole('button', { name: 'پایان تماس', exact: true }).click();
      await endRequested;
      outgoingFails = true;
      publish({ ...state, status: 'ENDED', endedAt: new Date().toISOString(), endReason: 'lease_expired' });
      await expect(frame(second)).toBeAttached();
      finishEnd();
      await expect(frame(second)).toHaveCount(0);
    }
    await context.close();
    console.log(role + ': reload, single-tab ownership and transfer passed.');
  }
} finally {
  await browser.close();
  streamServer.closeAllConnections();
  streamServer.close();
}
