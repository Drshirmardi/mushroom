import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { billingReservationFields, billingSettlementFields, type BillingReservationEffect, type BillingSettlementEffect } from '../src/modules/billing/billing-target.registry';

describe('explicit billing target effects', () => {
  it('requires the PROGRAM-owned reservation and prevents cross-target relation confusion', () => {
    const id = randomUUID(); expect(billingReservationFields('PROGRAM', { kind: 'PROGRAM_PURCHASE', purchaseId: id })).toEqual({ programPurchaseId: id });
    for (const purpose of ['ORDER', 'TOPUP', 'APPOINTMENT', 'ASSESSMENT']) expect(() => billingReservationFields(purpose, { kind: 'PROGRAM_PURCHASE', purchaseId: id })).toThrow();
    for (const effect of [{ kind: 'NONE' }, { kind: 'ASSESSMENT_PURCHASE', purchaseId: id }, { kind: 'PROGRAM_PURCHASE', purchaseId: 'bad' }]) expect(() => billingReservationFields('PROGRAM', effect as BillingReservationEffect)).toThrow();
    expect(billingSettlementFields('PROGRAM', { kind: 'NONE' })).toEqual({});
  });
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
  it('projects a paid assessment purchase only for its own purpose and requires that explicit reservation', () => {
    const id=randomUUID();expect(billingReservationFields('ASSESSMENT',{kind:'ASSESSMENT_PURCHASE',purchaseId:id})).toEqual({assessmentPurchaseId:id});expect(billingSettlementFields('ASSESSMENT',{kind:'NONE'})).toEqual({});
    for(const purpose of ['ORDER','TOPUP','APPOINTMENT'])expect(()=>billingReservationFields(purpose,{kind:'ASSESSMENT_PURCHASE',purchaseId:id})).toThrow();
    for(const effect of [{kind:'NONE'},{kind:'APPOINTMENT_HOLD',holdId:id},{kind:'ASSESSMENT_PURCHASE',purchaseId:'bad'}])expect(()=>billingReservationFields('ASSESSMENT',effect as BillingReservationEffect)).toThrow();
  });
  it.each(['', 'not-a-uuid', undefined, null])('rejects malformed appointment identifiers: %s', id => {
    expect(() => billingReservationFields('APPOINTMENT', { kind: 'APPOINTMENT_HOLD', holdId: id } as BillingReservationEffect)).toThrow();
    expect(() => billingSettlementFields('APPOINTMENT', { kind: 'APPOINTMENT', appointmentId: id } as BillingSettlementEffect)).toThrow();
  });
});
