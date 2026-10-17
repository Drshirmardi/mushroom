import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import type { BillingIntent, PatientProfile } from '../../../generated/prisma/client';
import { Prisma } from '../../../generated/prisma/client';
import { BillingTargetRegistry, type BillingTarget, type PreparedTarget } from '../../billing/billing-target.registry';
import { financialAudit, lockFinancial, type FinancialContext, type Tx } from '../../billing/billing.policy';
import { AssessmentPurchaseService, purchaseConflict } from './assessment-purchase.service';

@Injectable()
export class AssessmentBillingTarget implements BillingTarget, OnModuleInit {
  constructor(private readonly registry: BillingTargetRegistry, private readonly purchases: AssessmentPurchaseService) {}
  onModuleInit() { this.registry.register('ASSESSMENT', this); }
  prepare(patient: PatientProfile, input: Record<string, string>) { return this.purchases.prepare(patient, input); }
  reserve(tx: Tx, patient: PatientProfile, prepared: PreparedTarget) { return this.purchases.reserve(tx, patient, prepared); }
  async lock(tx: Tx, intent: BillingIntent) {
    const purchase = intent.assessmentPurchaseId ? await tx.assessmentPurchase.findFirst({ where: { id: intent.assessmentPurchaseId, patientId: intent.patientId, clinicId: intent.clinicId } }) : null;
    if (!purchase) throw purchaseConflict();
    const sourceId = (purchase.snapshot as { assessmentVersionId: string }).assessmentVersionId;
    await lockFinancial(tx, `assessment-purchase:${intent.patientId}:${sourceId}`);
  }
  canSettle(tx: Tx, intent: BillingIntent) { return this.purchases.canSettle(tx, intent); }
  async settle(tx: Tx, intent: BillingIntent, context: FinancialContext, journalId?: string, gatewayAttemptId?: string) {
    if (!intent.assessmentPurchaseId || !['WALLET', 'GATEWAY'].includes(intent.method ?? '')) throw purchaseConflict();
    const purchase = await tx.assessmentPurchase.findUniqueOrThrow({ where: { id: intent.assessmentPurchaseId } });
    const sourceId = (purchase.snapshot as { assessmentVersionId: string }).assessmentVersionId;
    const [time] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${purchase.createdAt}::timestamptz) AS now`);
    const grant = await tx.assessmentAccessGrant.create({ data: { clinicId: purchase.clinicId, patientId: purchase.patientId, purchaseId: purchase.id, assessmentVersionId: sourceId, processingConsentRecordId: purchase.processingConsentRecordId,
      method: intent.method!, walletJournalId: journalId, gatewayAttemptId, grantedAt: time!.now } });
    await financialAudit(tx, context, 'ASSESSMENT_ACCESS_GRANTED', grant.id, { purchaseId: purchase.id });
    return { kind: 'NONE' as const };
  }
  async refund() { throw new ConflictException({ code: 'ASSESSMENT_REFUND_NOT_ALLOWED', message: 'Successful assessment purchases have no ordinary refund.', details: {} }); }
}
