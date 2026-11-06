import { describe, expect, it } from 'vitest';
import { analyticsDeadline, measurementPayload, parseAnalyticsContext, retryDelay } from '../src/modules/analytics/analytics.protocol';

describe('server analytics protocol', () => {
  const now = 1800000000000;
  const context = { consent: 'granted', measurement_id: 'G-TEST123', client_id: '123.456', session_id: String(now / 1000 - 3600), at: now - 1000, source: 'instagram' };
  it('validates actual context and drops unexpected/private attributes', () => {
    expect(parseAnalyticsContext(JSON.stringify({ ...context, phone: 'private', answers: {} }), 'G-TEST123', now)).toEqual(context);
    for (const bad of [null, 'bad', 'x'.repeat(1025), { ...context, consent: 'denied' }, { ...context, client_id: 'account-id' }, { ...context, measurement_id: 'G-OTHER' }, { ...context, at: now - 1800001 }]) expect(parseAnalyticsContext(bad, 'G-TEST123', now)).toBeNull();
  });
  it('uses session-start deadline separately from queue age and never rewrites event time', () => {
    expect(analyticsDeadline(context as never, now)).toBe(Number(context.session_id) * 1000 + 86400000);
    const event = { context, event: 'purchase', occurredAt: now, transactionId: '11111111-1111-4111-8111-111111111111', amountRial: '450000' };
    const payload = measurementPayload(event, 'G-TEST123', now)!;
    expect(payload.timestamp_micros).toBe(now * 1000);
    expect(payload.events[0].params).toMatchObject({ amount_rial: 450000, transaction_id: event.transactionId });
    expect(payload.events[0].params).not.toHaveProperty('currency');
    expect(payload).not.toHaveProperty('user_id');
    expect(measurementPayload(event, 'G-TEST123', now + 86400000)).toBeNull();
    expect(measurementPayload({ ...event, occurredAt: now - 7200000 }, 'G-TEST123', now)).toBeNull();
  });
  it('bounds retries and does not round large financial integers', () => {
    expect(retryDelay(1)).toBe(60000); expect(retryDelay(99)).toBe(3600000);
    const payload = measurementPayload({ context, event: 'refund', occurredAt: now, transactionId: '11111111-1111-4111-8111-111111111111', amountRial: '9000000000000000000' }, 'G-TEST123', now)!;
    expect(payload.events[0].params).not.toHaveProperty('amount_rial');
    expect(payload.events[0].params.amount_rial_text).toBe('9000000000000000000');
  });
});
