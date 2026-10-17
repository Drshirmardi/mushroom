import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { billingReservationFields, billingSettlementFields, type BillingReservationEffect, type BillingSettlementEffect } from '../src/modules/billing/billing-target.registry';

describe('explicit billing target effects', () => {
  it('projects only a typed appointment hold or appointment ID for its own purpose', () => {
    const id = randomUUID(); expect(billingReservationFields('APPOINTMENT', { kind: 'APPOINTMENT_HOLD', holdId: id })).toEqual({ holdId: id });
    expect(billingSettlementFields('APPOINTMENT', { kind: 'APPOINTMENT', appointmentId: id })).toEqual({ appointmentId: id });
  });
  it.each(['ORDER', 'TOPUP', 'FUTURE_DIGITAL_TARGET'])('keeps %s effects domain-owned and rejects appointment relation confusion', purpose => {
    const id = randomUUID(); expect(billingReservationFields(purpose, { kind: 'NONE' })).toEqual({}); expect(billingSettlementFields(purpose, { kind: 'NONE' })).toEqual({});
    expect(() => billingReservationFields(purpose, { kind: 'APPOINTMENT_HOLD', holdId: id })).toThrow(); expect(() => billingSettlementFields(purpose, { kind: 'APPOINTMENT', appointmentId: id })).toThrow();
  });
  it('requires an actual appointment/hold effect for successful appointment fulfillment', () => {
    for (const effect of [{ kind: 'NONE' }, { kind: 'UNKNOWN' }, undefined, randomUUID()]) {
      expect(() => billingReservationFields('APPOINTMENT', effect as BillingReservationEffect)).toThrow(); expect(() => billingSettlementFields('APPOINTMENT', effect as BillingSettlementEffect)).toThrow();
    }
  });
  it.each(['', 'not-a-uuid', undefined, null])('rejects malformed appointment identifiers: %s', id => {
    expect(() => billingReservationFields('APPOINTMENT', { kind: 'APPOINTMENT_HOLD', holdId: id } as BillingReservationEffect)).toThrow();
    expect(() => billingSettlementFields('APPOINTMENT', { kind: 'APPOINTMENT', appointmentId: id } as BillingSettlementEffect)).toThrow();
  });
});
