import { Injectable } from '@nestjs/common';
import type { BillingIntent, PatientProfile, Prisma } from '../../generated/prisma/client';
import { financialConflict, type FinancialContext, type Tx } from './billing.policy';

export type PreparedTarget = { amountRial: bigint; orderId?: string; snapshot: Prisma.InputJsonValue; expiresAt?: Date };
export type BillingReservationEffect = { kind: 'NONE' } | { kind: 'APPOINTMENT_HOLD'; holdId: string } | { kind: 'ASSESSMENT_PURCHASE'; purchaseId: string };
export type BillingSettlementEffect = { kind: 'NONE' } | { kind: 'APPOINTMENT'; appointmentId: string };
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);

export function billingReservationFields(purpose: string, effect: BillingReservationEffect) {
  if (purpose === 'APPOINTMENT' && effect?.kind === 'APPOINTMENT_HOLD' && uuid(effect.holdId)) return { holdId: effect.holdId };
  if (purpose === 'ASSESSMENT' && effect?.kind === 'ASSESSMENT_PURCHASE' && uuid(effect.purchaseId)) return { assessmentPurchaseId: effect.purchaseId };
  if (purpose !== 'APPOINTMENT' && purpose !== 'ASSESSMENT' && effect?.kind === 'NONE') return {};
  throw financialConflict();
}
export function billingSettlementFields(purpose: string, effect: BillingSettlementEffect) {
  if (purpose === 'APPOINTMENT' && effect?.kind === 'APPOINTMENT' && uuid(effect.appointmentId)) return { appointmentId: effect.appointmentId };
  if (purpose !== 'APPOINTMENT' && effect?.kind === 'NONE') return {};
  throw financialConflict();
}
export interface BillingTarget {
  validateSettlement?(intent: BillingIntent): Promise<boolean>;
  prepare(patient: PatientProfile, input: Record<string, string>): Promise<PreparedTarget>;
  reserve(tx: Tx, patient: PatientProfile, prepared: PreparedTarget): Promise<BillingReservationEffect>;
  lock(tx: Tx, intent: BillingIntent): Promise<void>;
  canSettle(tx: Tx, intent: BillingIntent): Promise<boolean>;
  settle(tx: Tx, intent: BillingIntent, context: FinancialContext, journalId?: string, gatewayAttemptId?: string): Promise<BillingSettlementEffect>;
  refund(tx: Tx, intent: BillingIntent, amountRial: bigint, refundId: string): Promise<void>;
}

@Injectable()
export class BillingTargetRegistry {
  private readonly handlers = new Map<string, BillingTarget>();
  register(purpose: string, target: BillingTarget) {
    if (this.handlers.has(purpose)) throw new Error(`Duplicate billing target ${purpose}`);
    this.handlers.set(purpose, target);
  }
  get(purpose: string) {
    const target = this.handlers.get(purpose);
    if (!target) throw financialConflict();
    return target;
  }
}
