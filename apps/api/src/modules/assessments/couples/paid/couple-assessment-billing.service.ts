import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { Prisma, type AssessmentPurchase, type BillingIntent, type PatientProfile } from '../../../../generated/prisma/client';
import { financialAudit, lockFinancial, type FinancialContext, type Tx } from '../../../billing/billing.policy';
import type { PreparedTarget } from '../../../billing/billing-target.registry';
import { CoupleAssessmentService } from '../participation/couple-assessment.service';

export type CouplePurchaseSnapshot = { schemaVersion: 2; kind: 'COUPLES'; purchaseId: string; coupleAssessmentSessionId: string; contextHash: string; publicationId: string; publicationHash: string; assessmentVersionId: string; jointProtocolId: string; jointProtocolHash: string; processingConsentRecordId: string; termsConsentRecordId: string; title: string; amountRial: string; currency: 'IRR'; beneficiaries: { patientId: string; participantId: string; slot: string; processingConsentRecordId: string }[] };
const conflict = () => new ConflictException({ code: 'COUPLE_ASSESSMENT_CONFLICT', message: 'Exact coupled purchase, source or access changed.', details: {} });
const missing = () => new NotFoundException({ code: 'COUPLE_ASSESSMENT_NOT_FOUND', message: 'Owned coupled purchase context unavailable.', details: {} });

@Injectable()
export class CoupleAssessmentBillingService {
  constructor(private readonly prisma: PrismaService, private readonly participation: CoupleAssessmentService) {}
  async prepare(patient: PatientProfile, input: Record<string, string>): Promise<PreparedTarget> {
    return this.prisma.$transaction(async tx => {
      const owned = await tx.coupleAssessmentSession.findFirst({ where: { id: input.coupleAssessmentSessionId, clinicId: patient.clinicId, participants: { some: { patientId: patient.id } } }, select: { id: true } }); if (!owned) throw missing();
      const context = await this.participation.mutualReady(tx, owned.id); if (!context || context.contextHash !== input.contextHash) throw conflict();
      const payer = context.participants.find(p => p.patientId === patient.id)!; if (!payer.processingConsentRecordId) throw conflict();
      const amount = context.publication.offeringVersion.amountRial!; const ttl = (context.publication.offeringVersion.policyDraft as { quoteTtlSeconds?: number }).quoteTtlSeconds ?? 900;
      const [time] = await tx.$queryRaw<{ expiry: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP+${ttl}*INTERVAL '1 second' AS expiry`);
      const original = context.contextSnapshot as { publicationHash: string; jointProtocolHash: string };
      const snapshot: CouplePurchaseSnapshot = { schemaVersion: 2, kind: 'COUPLES', purchaseId: randomUUID(), coupleAssessmentSessionId: context.id, contextHash: context.contextHash, publicationId: context.publicationId, publicationHash: original.publicationHash, assessmentVersionId: context.assessmentVersionId, jointProtocolId: context.jointProtocolId, jointProtocolHash: original.jointProtocolHash, processingConsentRecordId: payer.processingConsentRecordId, termsConsentRecordId: input.termsConsentRecordId!, title: context.publication.offeringVersion.title, amountRial: amount.toString(), currency: 'IRR', beneficiaries: context.participants.map(p => ({ patientId: p.patientId, participantId: p.id, slot: p.slot, processingConsentRecordId: p.processingConsentRecordId! })) };
      return { amountRial: amount, snapshot, expiresAt: time!.expiry };
    });
  }
  async reserve(tx: Tx, patient: PatientProfile, prepared: PreparedTarget) {
    const snapshot = prepared.snapshot as unknown as CouplePurchaseSnapshot;
    await this.lockContext(tx, snapshot.coupleAssessmentSessionId, snapshot.beneficiaries.map(b => b.patientId), snapshot.assessmentVersionId);
    const context = await this.participation.mutualReady(tx, snapshot.coupleAssessmentSessionId, true);
    if (!context || context.clinicId !== patient.clinicId || context.contextHash !== snapshot.contextHash || !context.participants.some(p => p.patientId === patient.id) || context.publicationId !== snapshot.publicationId || context.publication.offeringVersion.amountRial !== prepared.amountRial) throw conflict();
    await this.terms(tx, patient.id, context.publication.termsPolicyVersionId, context.publication.termsContentHash, snapshot.termsConsentRecordId);
    if (await tx.assessmentPurchase.count({ where: { coupleAssessmentSessionId: context.id, intent: { status: 'PAID' } } })) throw conflict();
    for (const beneficiary of snapshot.beneficiaries) {
      if (!context.participants.some(p => p.id === beneficiary.participantId && p.patientId === beneficiary.patientId && p.slot === beneficiary.slot && p.processingConsentRecordId === beneficiary.processingConsentRecordId)) throw conflict();
      const [pending] = await tx.$queryRaw<{ pending: boolean }[]>(Prisma.sql`SELECT assessment_has_pending_purchase(${beneficiary.patientId}::uuid,${snapshot.assessmentVersionId}::uuid) AS pending`);
      const active = await tx.patientAssessmentSubmission.count({ where: { patientId: beneficiary.patientId, assessmentVersionId: snapshot.assessmentVersionId, state: 'IN_PROGRESS' } });
      const unused = await tx.assessmentAccessGrant.count({ where: { patientId: beneficiary.patientId, assessmentVersionId: snapshot.assessmentVersionId, submission: null, processingConsent: { withdrawnAt: null }, purchase: { intent: { status: 'PAID' } } } });
      if (pending!.pending || active || unused) throw conflict();
    }
    const row = await tx.assessmentPurchase.create({ data: { id: snapshot.purchaseId, clinicId: patient.clinicId, patientId: patient.id, coupleAssessmentSessionId: context.id, publicationId: snapshot.publicationId, publicationHash: snapshot.publicationHash, processingConsentRecordId: snapshot.processingConsentRecordId, termsConsentRecordId: snapshot.termsConsentRecordId, amountRial: prepared.amountRial, snapshot } });
    return { kind: 'ASSESSMENT_PURCHASE' as const, purchaseId: row.id };
  }
  async lock(tx: Tx, purchase: AssessmentPurchase) { const snapshot = purchase.snapshot as unknown as CouplePurchaseSnapshot; await this.lockContext(tx, purchase.coupleAssessmentSessionId!, snapshot.beneficiaries.map(b => b.patientId), snapshot.assessmentVersionId); }
  async canSettle(tx: Tx, intent: BillingIntent, purchase: AssessmentPurchase) {
    if (!purchase.coupleAssessmentSessionId || purchase.patientId !== intent.patientId || purchase.amountRial !== intent.amountRial) return false;
    const context = await this.participation.quotedMutualReady(tx, purchase.coupleAssessmentSessionId, intent.expiresAt, true); if (!context || context.contextHash !== (purchase.snapshot as unknown as CouplePurchaseSnapshot).contextHash) return false;
    if (!await this.terms(tx, purchase.patientId, context.publication.termsPolicyVersionId, context.publication.termsContentHash, purchase.termsConsentRecordId, false)) return false;
    if (await tx.assessmentPurchase.count({ where: { coupleAssessmentSessionId: context.id, id: { not: purchase.id }, intent: { status: 'PAID' } } })) return false;
    for (const p of context.participants) {
      if (await tx.assessmentAccessGrant.count({ where: { patientId: p.patientId, assessmentVersionId: context.assessmentVersionId, submission: null, processingConsent: { withdrawnAt: null } } })) return false;
      if (await tx.patientAssessmentSubmission.count({ where: { patientId: p.patientId, assessmentVersionId: context.assessmentVersionId, state: 'IN_PROGRESS' } })) return false;
    }
    return true;
  }
  async settle(tx: Tx, intent: BillingIntent, purchase: AssessmentPurchase, context: FinancialContext, journalId?: string, gatewayAttemptId?: string) {
    if (!['WALLET', 'GATEWAY'].includes(intent.method ?? '')) throw conflict();
    const snapshot = purchase.snapshot as unknown as CouplePurchaseSnapshot;
    const [time] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${purchase.createdAt}::timestamptz) AS now`);
    for (const b of snapshot.beneficiaries) {
      await tx.assessmentAccessGrant.create({ data: { clinicId: purchase.clinicId, patientId: b.patientId, purchaseId: purchase.id, assessmentVersionId: snapshot.assessmentVersionId, processingConsentRecordId: b.processingConsentRecordId, slot: b.slot, coupleAssessmentParticipantId: b.participantId, method: intent.method!, walletJournalId: journalId, gatewayAttemptId, grantedAt: time!.now } });
    }
    await financialAudit(tx, context, 'COUPLE_ASSESSMENT_ACCESS_GRANTED', purchase.id, { beneficiaryCount: 2 });
    return { kind: 'NONE' as const };
  }
  private async lockContext(tx: Tx, id: string, patientIds: string[], sourceId: string) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM couple_assessment_sessions WHERE id=${id}::uuid FOR UPDATE`);
    for (const patientId of [...patientIds].sort()) await lockFinancial(tx, `assessment-purchase:${patientId}:${sourceId}`);
  }
  private async terms(tx: Tx, patientId: string, policyId: string, hash: string, id: string, strict = true) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM patient_consent_records WHERE id=${id}::uuid AND patient_id=${patientId}::uuid FOR SHARE`);
    const valid = !!await tx.patientConsentRecord.count({ where: { id, patientId, policyVersionId: policyId, contentHash: hash, withdrawnAt: null, policyVersion: { policyKey: 'ASSESSMENT_PURCHASE_TERMS', status: 'ACTIVE', contentHash: hash } } });
    if (!valid && strict) throw conflict(); return valid;
  }
}
