import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureContext, appendContext } from './analytics-context.ts';
import { analyticsOperation, observeOperation } from './analytics-operations.ts';

test('only campaign slugs and explicit handoff fields survive; expired context is discarded', () => {
  const now = 1700000000000;
  const context = captureContext(new URL('https://web.test/?utm_source=instagram&utm_medium=social&utm_campaign=launch&phone=private'), null, now);
  assert.equal(context.source, 'instagram');
  assert.ok(!JSON.stringify(context).includes('private'));
  const handoff = appendContext(new URL('https://app.test/store?next=keep'), { ...context, entry_cta: 'hero' });
  assert.equal(handoff.searchParams.get('next'), 'keep');
  assert.equal(captureContext(handoff, null, now).entry_cta, 'hero');
  assert.equal(captureContext(handoff, null, now + 1800001).entry_cta, undefined);
  assert.equal(captureContext(new URL('https://web.test/?utm_source=patient@example.com'), null, now).source, undefined);
});
test('operation names never contain resource IDs, searches or form data', () => {
  assert.equal(analyticsOperation('PUT', '/v1/patients/me/cart'), 'cart_update');
  assert.equal(analyticsOperation('POST', '/v1/assessment-submissions/private/submit'), 'assessment_submit');
  assert.equal(analyticsOperation('GET', '/v1/patients/me/cart'), undefined);
  assert.equal(analyticsOperation('POST', '/v1/unknown/private'), undefined);
  for (const [path, expected] of [
    ['/v1/auth/otp/challenges/test/verify', 'otp_verify'],
    ['/v1/patients/me/billing/intents/test/wallet-payment', 'payment_start'],
    ['/v1/patients/me/billing/order-intents', 'billing_start'],
    ['/v1/patients/me/assessment-access-grants/test/submission', 'assessment_start'],
    ['/v1/patients/me/entry/defer', 'entry_defer'],
  ]) assert.equal(analyticsOperation('POST', path), expected);
});

test('malformed stored identity/referrers and reserved handoff query cannot contaminate a fresh visit', () => {
  const now = Date.now();
  const context = captureContext(new URL('https://web.test/?utm_source=09123456789'), { at: now, client_id: 'patient-name', session_id: 'patient-name', referrer_origin: 'https://google.com/search?private=1' }, now);
  assert.deepEqual(context, { at: now });
  const outgoing = appendContext(new URL('https://app.test/?ma_client_id=forged&ma_unknown=private&next=original'), context);
  assert.equal(outgoing.searchParams.has('ma_client_id'), false);
  assert.equal(outgoing.searchParams.has('ma_unknown'), false);
  assert.equal(outgoing.searchParams.get('next'), 'original');
});

test('request success/server-error/unregistered outcomes do not create conversions', async () => {
  const events = [];
  const emit = (...args) => events.push(args);
  await observeOperation('checkout', async () => new Response(null, { status: 201 }), emit);
  await observeOperation('checkout', async () => new Response(null, { status: 503 }), emit);
  await observeOperation(undefined, async () => new Response(null), emit);
  assert.deepEqual(events.map(event => event[0]), ['action_attempt', 'action_result', 'action_attempt', 'action_result']);
  assert.equal(events[1][1].outcome, 'accepted');
  assert.equal(events[3][1].outcome, 'unavailable');
});
test('observing preserves response identity, errors and one request; no response body read', async () => {
  const events = []; let calls = 0;
  const response = new Response('not-json', { status: 422 });
  assert.equal(await observeOperation('cart_update', async () => { calls++; return response; }, (...args) => events.push(args)), response);
  assert.equal(calls, 1); assert.equal(response.bodyUsed, false);
  assert.equal(events[1][1].outcome, 'rejected');
  const error = new TypeError('offline private');
  await assert.rejects(observeOperation('cart_update', async () => { throw error; }, (...args) => events.push(args)), cause => cause === error);
  assert.ok(!JSON.stringify(events).includes('private'));
  assert.equal(await observeOperation('cart_update', async () => response, () => { throw Error('blocked'); }), response);
});
