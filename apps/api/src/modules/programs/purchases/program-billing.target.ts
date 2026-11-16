import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, type BillingIntent, type PatientProfile } from '../../../generated/prisma/client';
import { BillingTargetRegistry, type BillingTarget, type PreparedTarget } from '../../billing/billing-target.registry';
import { financialAudit, lockFinancial, type FinancialContext, type Tx } from '../../billing/billing.policy';
import { ProgramPurchaseService, programConflict } from './program-purchase.service';

@Injectable()
export class ProgramBillingTarget implements BillingTarget, OnModuleInit {
  constructor(private readonly registry: BillingTargetRegistry, private readonly purchases: ProgramPurchaseService) {}
  onModuleInit() { this.registry.register('PROGRAM', this); }
  prepare(patient: PatientProfile, input: Record<string, string>) { return this.purchases.prepare(patient, input); }
  reserve(tx: Tx, patient: PatientProfile, prepared: PreparedTarget) { return this.purchases.reserve(tx, patient, prepared); }
  async lock(tx: Tx, intent: BillingIntent) {
    const p = intent.programPurchaseId ? await tx.programPurchase.findFirst({ where: { id: intent.programPurchaseId, clinicId: intent.clinicId, patientId: intent.patientId } }) : null;
    if (!p) throw programConflict(); await tx.$executeRaw(Prisma.sql`SELECT program_lock_service_purchase(${p.patientId}::uuid,${p.programDefinitionId}::uuid)`);
  }
  canSettle(tx: Tx, intent: BillingIntent) { return this.purchases.canSettle(tx, intent); }
  async settle(tx: Tx, intent: BillingIntent, context: FinancialContext, journalId?: string, gatewayAttemptId?: string) {
    if (!intent.programPurchaseId || !await this.canSettle(tx, intent)) throw programConflict();
    const purchase = await tx.programPurchase.findUniqueOrThrow({ where: { id: intent.programPurchaseId } }), pub = await tx.programOfferingPublication.findUniqueOrThrow({ where: { id: purchase.publicationId } });
    const [time] = await tx.$queryRaw<{ now: Date; end: Date | null }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now,CASE WHEN ${pub.accessDurationDays}::int IS NULL THEN NULL ELSE CURRENT_TIMESTAMP+${pub.accessDurationDays}::int*INTERVAL '24 hours' END AS end`);
    const method = intent.amountRial === 0n ? 'FREE' : intent.method;
    if (!method || !['FREE', 'WALLET', 'GATEWAY'].includes(method)) throw programConflict();
    const grant = await tx.programAccessGrant.create({ data: { clinicId: purchase.clinicId, patientId: purchase.patientId, purchaseId: purchase.id, method, walletJournalId: journalId, gatewayAttemptId, grantedAt: time!.now, endsAt: time!.end } });
    await financialAudit(tx, context, 'PROGRAM_ACCESS_GRANTED', grant.id, { purchaseId: purchase.id }); return { kind: 'NONE' as const };
  }
  async refund() { throw new ConflictException({ code: 'PROGRAM_REFUND_NOT_ALLOWED', message: 'Successful program purchases have no ordinary refund.', details: {} }); }
}
