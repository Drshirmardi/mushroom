import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import type { BillingIntent, PatientProfile } from '../../../generated/prisma/client';
import { Prisma } from '../../../generated/prisma/client';
import { BillingTargetRegistry, type BillingTarget, type PreparedTarget } from '../../billing/billing-target.registry';
import { financialAudit, lockFinancial, type FinancialContext, type Tx } from '../../billing/billing.policy';
import { AssessmentPurchaseService, purchaseConflict } from './assessment-purchase.service';
import { CoupleAssessmentBillingService } from '../couples/paid/couple-assessment-billing.service';
import type { AdminPurchaseSnapshot } from './assessment-admin-purchase.service';

@Injectable()
export class AssessmentBillingTarget implements BillingTarget, OnModuleInit {
  constructor(private readonly registry: BillingTargetRegistry, private readonly purchases: AssessmentPurchaseService, private readonly couples: CoupleAssessmentBillingService) {}
  onModuleInit() { this.registry.register('ASSESSMENT', this); }
  prepare(patient: PatientProfile, input: Record<string, string>) { return input.coupleAssessmentSessionId ? this.couples.prepare(patient, input) : this.purchases.prepare(patient, input); }
  reserve(tx: Tx, patient: PatientProfile, prepared: PreparedTarget) { return (prepared.snapshot as { schemaVersion?: number }).schemaVersion === 2 ? this.couples.reserve(tx, patient, prepared) : this.purchases.reserve(tx, patient, prepared); }
  async lock(tx: Tx, intent: BillingIntent) {
    const purchase = intent.assessmentPurchaseId ? await tx.assessmentPurchase.findFirst({ where: { id: intent.assessmentPurchaseId, patientId: intent.patientId, clinicId: intent.clinicId } }) : null;
    if (!purchase) throw purchaseConflict();
    if (purchase.educationalCoupleSessionId) {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM educational_couple_sessions WHERE id=${purchase.educationalCoupleSessionId}::uuid FOR UPDATE`);
      const snapshot = purchase.snapshot as unknown as AdminPurchaseSnapshot;
      if (!snapshot.beneficiaries || snapshot.beneficiaries.length !== 2) throw purchaseConflict();
      for (const beneficiary of [...snapshot.beneficiaries].sort((a,b) => a.patientId.localeCompare(b.patientId))) await lockFinancial(tx, `assessment-purchase:${beneficiary.patientId}:${snapshot.assessmentVersionId}`);
      return;
    }
    if (purchase.coupleAssessmentSessionId) { await this.couples.lock(tx, purchase); return; }
    const sourceId = (purchase.snapshot as { assessmentVersionId: string }).assessmentVersionId;
    await lockFinancial(tx, `assessment-purchase:${intent.patientId}:${sourceId}`);
  }
  async canSettle(tx: Tx, intent: BillingIntent) {
    const purchase = intent.assessmentPurchaseId ? await tx.assessmentPurchase.findUnique({ where: { id: intent.assessmentPurchaseId } }) : null;
    return purchase?.coupleAssessmentSessionId ? this.couples.canSettle(tx, intent, purchase) : this.purchases.canSettle(tx, intent);
  }
  async settle(tx: Tx, intent: BillingIntent, context: FinancialContext, journalId?: string, gatewayAttemptId?: string) {
    if (!intent.assessmentPurchaseId || !['WALLET', 'GATEWAY'].includes(intent.method ?? '')) throw purchaseConflict();
    const purchase = await tx.assessmentPurchase.findUniqueOrThrow({ where: { id: intent.assessmentPurchaseId } });
    if (purchase.coupleAssessmentSessionId) return this.couples.settle(tx, intent, purchase, context, journalId, gatewayAttemptId);
    if (purchase.educationalCoupleSessionId) {
      const snapshot = purchase.snapshot as unknown as AdminPurchaseSnapshot;
      if (!snapshot.beneficiaries || snapshot.beneficiaries.length !== 2) throw purchaseConflict();
      for (const beneficiary of snapshot.beneficiaries) await tx.assessmentAccessGrant.create({ data: { clinicId: purchase.clinicId, patientId: beneficiary.patientId, purchaseId: purchase.id, educationalCoupleParticipantId: beneficiary.participantId, slot: beneficiary.slot, assessmentVersionId: snapshot.assessmentVersionId, processingConsentRecordId: beneficiary.processingConsentRecordId, method: intent.method!, walletJournalId: journalId, gatewayAttemptId } });
      await financialAudit(tx, context, 'COUPLE_ASSESSMENT_ACCESS_GRANTED', purchase.id, { beneficiaryCount: 2 });
      return { kind: 'NONE' as const };
    }
    const sourceId = (purchase.snapshot as { assessmentVersionId: string }).assessmentVersionId;
    const [time] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${purchase.createdAt}::timestamptz) AS now`);
    const grant = await tx.assessmentAccessGrant.create({ data: { clinicId: purchase.clinicId, patientId: purchase.patientId, purchaseId: purchase.id, assessmentVersionId: sourceId, processingConsentRecordId: purchase.processingConsentRecordId,
      method: intent.method!, walletJournalId: journalId, gatewayAttemptId, grantedAt: time!.now } });
    await financialAudit(tx, context, 'ASSESSMENT_ACCESS_GRANTED', grant.id, { purchaseId: purchase.id });
    return { kind: 'NONE' as const };
  }
  async refund() { throw new ConflictException({ code: 'ASSESSMENT_REFUND_NOT_ALLOWED', message: 'Successful assessment purchases have no ordinary refund.', details: {} }); }
}
