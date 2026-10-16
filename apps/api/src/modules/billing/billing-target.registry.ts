import { Injectable } from '@nestjs/common';
import type { BillingIntent, PatientProfile, Prisma } from '../../generated/prisma/client';
import { financialConflict, type FinancialContext, type Tx } from './billing.policy';

export type PreparedTarget = { amountRial: bigint; orderId?: string; snapshot: Prisma.InputJsonValue; expiresAt?: Date };
export interface BillingTarget {
  validateSettlement?(intent: BillingIntent): Promise<boolean>;
  prepare(patient: PatientProfile, input: Record<string, string>): Promise<PreparedTarget>;
  reserve(tx: Tx, patient: PatientProfile, prepared: PreparedTarget): Promise<string | undefined>;
  lock(tx: Tx, intent: BillingIntent): Promise<void>;
  canSettle(tx: Tx, intent: BillingIntent): Promise<boolean>;
  settle(tx: Tx, intent: BillingIntent, context: FinancialContext, journalId?: string, gatewayAttemptId?: string): Promise<string | undefined>;
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
