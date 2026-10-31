import { createHash, randomUUID } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type AssessmentPurchase, type PatientProfile } from '../../../generated/prisma/client';
import { lockFinancial } from '../../billing/billing.policy';
import type { PreparedTarget } from '../../billing/billing-target.registry';

const conflict = () => new ConflictException({ code: 'ASSESSMENT_PURCHASE_CONFLICT', message: 'Exact ADMIN tariff, adult beneficiary and owned scoped acceptances required.', details: {} });
const include = { offeringVersion: { include: { assessmentVersion: true, consentPolicies: true } } } as const;
type Publication = Prisma.AssessmentAdminPublicationGetPayload<{ include: typeof include }>;
export const adminPublicationHash = (row: { id: string; questionnaireContentHash: string }) => createHash('sha256').update(`${row.id}:${row.questionnaireContentHash}`).digest('hex');
export type AdminPurchaseSnapshot = { schemaVersion: 1 | 3; publicationAuthority: 'ADMIN_PUBLISHED'; purchaseId: string; publicationId: string; publicationHash: string; assessmentVersionId: string; processingConsentRecordId: string; termsConsentRecordId: string; title: string; amountRial: string; currency: 'IRR'; educationalCoupleSessionId?: string; contextHash?: string; beneficiaries?: { participantId: string; patientId: string; slot: string; processingConsentRecordId: string }[] };
type Snapshot = AdminPurchaseSnapshot;

@Injectable()
export class AssessmentAdminPurchaseService {
  constructor(private readonly prisma: PrismaService) {}
  async hasPublication(id: string, clinicId: string) { return !!await this.prisma.assessmentAdminPublication.count({ where: { id, offeringVersion: { clinicId } } }); }
  async prepare(patient: PatientProfile, input: Record<string, string>): Promise<PreparedTarget> {
    return this.prisma.$transaction(async tx => {
      const couple = input.educationalCoupleSessionId ? await this.couple(tx, patient, input.educationalCoupleSessionId, input.contextHash!) : null;
      const row = await this.current(tx, patient.clinicId, couple?.publicationId ?? input.publicationId!, couple ? 'COUPLES' : 'INDIVIDUAL');
      if (!couple && adminPublicationHash(row) !== input.publicationHash) throw conflict();
      const self = couple?.participants.find(p => p.patientId === patient.id);
      const snapshot: Snapshot = { schemaVersion: couple ? 3 : 1, publicationAuthority: 'ADMIN_PUBLISHED', purchaseId: randomUUID(), publicationId: row.id, publicationHash: adminPublicationHash(row), assessmentVersionId: row.offeringVersion.assessmentVersionId, processingConsentRecordId: self?.processingConsentRecordId ?? input.processingConsentRecordId!, termsConsentRecordId: input.termsConsentRecordId!, title: row.offeringVersion.title, amountRial: row.offeringVersion.amountRial!.toString(), currency: 'IRR', ...(couple ? { educationalCoupleSessionId: couple.id, contextHash: couple.contextHash, beneficiaries: couple.participants.map(p => ({ participantId: p.id, patientId: p.patientId, slot: p.slot, processingConsentRecordId: p.processingConsentRecordId! })) } : {}) };
      const [time] = await tx.$queryRaw<{ expiry: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP+INTERVAL '900 seconds' AS expiry`);
      return { amountRial: row.offeringVersion.amountRial!, snapshot, expiresAt: time!.expiry };
    });
  }
  async reserve(tx: Prisma.TransactionClient, patient: PatientProfile, prepared: PreparedTarget) {
    const snapshot = prepared.snapshot as unknown as Snapshot;
    const couple = snapshot.educationalCoupleSessionId ? await this.couple(tx, patient, snapshot.educationalCoupleSessionId, snapshot.contextHash!) : null;
    const beneficiaries = snapshot.beneficiaries ?? [{ patientId: patient.id }];
    if (couple && (couple.publicationId !== snapshot.publicationId || canonicalBeneficiaries(couple.participants) !== canonicalBeneficiaries(snapshot.beneficiaries!))) throw conflict();
    for (const beneficiary of [...beneficiaries].sort((a,b) => a.patientId.localeCompare(b.patientId))) await lockFinancial(tx, `assessment-purchase:${beneficiary.patientId}:${snapshot.assessmentVersionId}`);
    const row = await this.current(tx, patient.clinicId, snapshot.publicationId, couple ? 'COUPLES' : 'INDIVIDUAL');
    if (adminPublicationHash(row) !== snapshot.publicationHash || row.offeringVersion.assessmentVersionId !== snapshot.assessmentVersionId || row.offeringVersion.title !== snapshot.title || row.offeringVersion.amountRial !== prepared.amountRial) throw conflict();
    await this.acceptances(tx, row, patient, snapshot);
    for (const beneficiary of beneficiaries) {
      const [pending] = await tx.$queryRaw<{ pending: boolean }[]>(Prisma.sql`SELECT assessment_has_pending_purchase(${beneficiary.patientId}::uuid,${snapshot.assessmentVersionId}::uuid) AS pending`);
      const [active, unused] = await Promise.all([tx.patientAssessmentSubmission.count({ where: { patientId: beneficiary.patientId, assessmentVersionId: snapshot.assessmentVersionId, state: 'IN_PROGRESS' } }), tx.assessmentAccessGrant.count({ where: { patientId: beneficiary.patientId, assessmentVersionId: snapshot.assessmentVersionId, processingConsent: { withdrawnAt: null }, submission: null } })]);
      if (pending?.pending || active || unused) throw conflict();
    }
    await tx.assessmentPurchase.create({ data: { id: snapshot.purchaseId, clinicId: patient.clinicId, patientId: patient.id, adminPublicationId: row.id, educationalCoupleSessionId: couple?.id, publicationHash: snapshot.publicationHash, processingConsentRecordId: snapshot.processingConsentRecordId, termsConsentRecordId: snapshot.termsConsentRecordId, amountRial: prepared.amountRial, snapshot } });
    return { kind: 'ASSESSMENT_PURCHASE' as const, purchaseId: snapshot.purchaseId };
  }
  async canSettle(tx: Prisma.TransactionClient, intent: { expiresAt: Date | null; patientId: string; clinicId: string; amountRial: bigint }, purchase: AssessmentPurchase) {
    if (purchase.patientId !== intent.patientId || purchase.clinicId !== intent.clinicId || purchase.amountRial !== intent.amountRial) return false;
    await tx.$executeRaw(Prisma.sql`SELECT assessment_admin_purchase_lock(p) FROM assessment_purchases p WHERE id=${purchase.id}::uuid`);
    const [proof] = await tx.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT assessment_admin_purchase_source_current(p) AND ${intent.expiresAt}::timestamptz>CURRENT_TIMESTAMP AS allowed FROM assessment_purchases p WHERE id=${purchase.id}::uuid`);
    if (!proof?.allowed) return false;
    const sourceId = (purchase.snapshot as unknown as Snapshot).assessmentVersionId;
    const beneficiaries = (purchase.snapshot as unknown as Snapshot).beneficiaries?.map(b => b.patientId) ?? [intent.patientId];
    return !await tx.assessmentAccessGrant.count({ where: { patientId: { in: beneficiaries }, assessmentVersionId: sourceId, processingConsent: { withdrawnAt: null }, submission: null } }) && !await tx.patientAssessmentSubmission.count({ where: { patientId: { in: beneficiaries }, assessmentVersionId: sourceId, state: 'IN_PROGRESS' } });
  }
  private async current(tx: Prisma.TransactionClient, clinicId: string, id: string, kind: 'INDIVIDUAL' | 'COUPLES' = 'INDIVIDUAL') {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM clinics WHERE id=${clinicId}::uuid FOR SHARE`);
    const pointer = await tx.assessmentAdminPublication.findFirst({ where: { id, offeringVersion: { clinicId } }, include });
    if (!pointer) throw conflict();
    await lockFinancial(tx, `assessment-protocol:${pointer.offeringVersion.assessmentVersionId}`);
    await tx.$queryRaw(Prisma.sql`SELECT pub.id FROM assessment_admin_publications pub JOIN assessment_offering_versions o ON o.id=pub.offering_version_id JOIN assessment_versions v ON v.id=o.assessment_version_id WHERE pub.id=${id}::uuid FOR SHARE OF pub,o,v`);
    const row = await tx.assessmentAdminPublication.findUniqueOrThrow({ where: { id }, include });
    const offer = row.offeringVersion;
    const [current] = await tx.$queryRaw<{ current: boolean }[]>(Prisma.sql`SELECT assessment_admin_offering_current(${offer.id}::uuid) AND assessment_publicly_available(${offer.assessmentVersionId}::uuid) AS current`);
    if (!current?.current) throw conflict();
    if (row.status !== 'ACTIVE' || offer.status !== 'DRAFT' || offer.kind !== kind || offer.priceMode !== 'PAID' || offer.paymentPoint !== 'PRE_START' || !offer.amountRial || offer.amountRial <= 0n || offer.assessmentVersion.status !== 'PUBLISHED' || offer.assessmentVersion.contentHash !== row.questionnaireContentHash) throw conflict();
    return row;
  }
  private async acceptances(tx: Prisma.TransactionClient, row: Publication, patient: PatientProfile, snapshot: Snapshot) {
    await tx.$queryRaw(Prisma.sql`SELECT c.id FROM patient_consent_records c JOIN consent_policy_versions p ON p.id=c.policy_version_id WHERE c.id IN(${snapshot.processingConsentRecordId}::uuid,${snapshot.termsConsentRecordId}::uuid) ORDER BY c.id FOR SHARE OF c,p`);
    await tx.$queryRaw(Prisma.sql`SELECT i.id FROM patient_medical_intakes i JOIN patient_medical_intake_revisions r ON r.intake_id=i.id AND r.revision_number=i.current_revision_number WHERE i.patient_id=${patient.id}::uuid FOR SHARE OF i,r`);
    const [live] = await tx.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT couple_assessment_patient_live(${patient.id}::uuid,${patient.clinicId}::uuid) AS allowed`);
    if (!live?.allowed) throw conflict();
    for (const [purpose, id] of [['ASSESSMENT_PROCESSING', snapshot.processingConsentRecordId], ['ASSESSMENT_PURCHASE_TERMS', snapshot.termsConsentRecordId]]) {
      const policy = row.offeringVersion.consentPolicies.find(p => p.policyKey === purpose);
      if (!policy || policy.status !== 'ACTIVE' || (row.documentHashes as Record<string, string>)[purpose!] !== policy.contentHash || createHash('sha256').update(policy.body, 'utf8').digest('hex') !== policy.contentHash || !await tx.patientConsentRecord.count({ where: { id, patientId: patient.id, policyVersionId: policy.id, contentHash: policy.contentHash, withdrawnAt: null } })) throw conflict();
    }
  }
  private async couple(tx: Prisma.TransactionClient, patient: PatientProfile, id: string, contextHash: string) {
    await tx.$queryRaw(Prisma.sql`SELECT s.id FROM educational_couple_sessions s JOIN educational_couple_participants p ON p.session_id=s.id WHERE s.id=${id}::uuid AND s.clinic_id=${patient.clinicId}::uuid AND p.patient_id=${patient.id}::uuid FOR UPDATE OF s`);
    const row = await tx.educationalCoupleSession.findFirst({ where: { id, clinicId: patient.clinicId, participants: { some: { patientId: patient.id } } }, include: { participants: true } });
    if (!row || row.contextHash !== contextHash || row.participants.length !== 2 || row.participants.some(p => !p.processingConsentRecordId)) throw conflict();
    const [proof] = await tx.$queryRaw<{ ready: boolean }[]>(Prisma.sql`SELECT educational_couple_mutual(${id}::uuid) AS ready`);
    if (!proof?.ready || await tx.assessmentPurchase.count({ where: { educationalCoupleSessionId: id, intent: { status: 'PAID' } } })) throw conflict();
    return row;
  }
}
const canonicalBeneficiaries = (rows: { id?: string; participantId?: string; patientId: string; slot: string; processingConsentRecordId: string | null }[]) => JSON.stringify(rows.map(row => [row.participantId ?? row.id, row.patientId, row.slot, row.processingConsentRecordId]).sort((a,b) => String(a[1]).localeCompare(String(b[1]))));
