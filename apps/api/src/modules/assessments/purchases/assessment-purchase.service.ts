import { createHash, randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type AssessmentOfferingPublication, type AssessmentOfferingVersion, type PatientConsentRecord, type PatientProfile } from '../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { BillingService } from '../../billing/billing.service';
import { financialKey, lockFinancial } from '../../billing/billing.policy';
import type { PreparedTarget } from '../../billing/billing-target.registry';
import { ASSESSMENT_COMMERCIAL_POLICY, AssessmentPublicationService } from '../publication/assessment-publication.service';
import { AssessmentProtocolService } from '../protocol/assessment-protocol.service';
import type { AssessmentConsentAcceptDto, AssessmentPurchasePageQueryDto } from './assessment-purchase.dto';
import { AssessmentAdminPurchaseService } from './assessment-admin-purchase.service';

export const purchaseMissing = () => new NotFoundException({ code: 'ASSESSMENT_PURCHASE_NOT_FOUND', message: 'Owned assessment purchase or available offering was not found.', details: {} });
export const purchaseConflict = () => new ConflictException({ code: 'ASSESSMENT_PURCHASE_CONFLICT', message: 'The exact assessment tariff, consent or purchase state changed.', details: {} });
const invalid = () => new UnprocessableEntityException({ code: 'ASSESSMENT_PURCHASE_INVALID', message: 'An adult patient and exact supported individual assessment configuration are required.', details: {} });
const policies = ['ASSESSMENT_PROCESSING', 'ASSESSMENT_PURCHASE_TERMS'];
type Publication = AssessmentOfferingPublication & { offeringVersion: AssessmentOfferingVersion };
type Snapshot = { schemaVersion: 1; purchaseId: string; publicationId: string; publicationHash: string; assessmentVersionId: string; processingConsentRecordId: string; termsConsentRecordId: string; title: string; amountRial: string; currency: 'IRR' };

@Injectable()
export class AssessmentPurchaseService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService, private readonly publications: AssessmentPublicationService, private readonly protocols: AssessmentProtocolService, private readonly billing: BillingService, private readonly adminPurchases: AssessmentAdminPurchaseService) {}

  async catalog(query: AssessmentPurchasePageQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx);
      const where: Prisma.AssessmentOfferingPublicationWhereInput = { clinicId: patient.clinicId, status: 'ACTIVE', offeringVersion: { priceMode:'PAID',assessmentVersion: { OR: [{ distribution: { is: null } }, { distribution: { publiclyAvailable: true } }] } }, ...(query.offeringKey ? { offeringKey: query.offeringKey } : {}), ...(query.kind ? { offeringVersion: { priceMode:'PAID',kind: query.kind, assessmentVersion: { OR: [{ distribution: { is: null } }, { distribution: { publiclyAvailable: true } }] } } } : {}) };
      const [rows, total] = await Promise.all([tx.assessmentOfferingPublication.findMany({ where, include: { offeringVersion: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.pageSize, skip: (query.page - 1) * query.pageSize }), tx.assessmentOfferingPublication.count({ where })]);
      await this.audit(tx, 'ASSESSMENT_CATALOG_READ', patient.id, ctx); return { items: rows.map(row => this.tariff(row)), total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async offering(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx); const row = await this.publications.currentPublication(tx, patient.clinicId, id); if (!row) throw purchaseMissing();
      const review = await tx.assessmentProtocolReview.findUniqueOrThrow({ where: { id: row.protocolReviewId } });
      const [processing, terms, accepted, source, adult] = await Promise.all([
        tx.consentPolicyVersion.findUniqueOrThrow({ where: { id: review.consentPolicyVersionId } }), tx.consentPolicyVersion.findUniqueOrThrow({ where: { id: row.termsPolicyVersionId } }),
        tx.patientConsentRecord.findMany({ where: { patientId: patient.id, policyVersionId: { in: [review.consentPolicyVersionId, row.termsPolicyVersionId] }, withdrawnAt: null } }),
        tx.assessmentVersion.findUniqueOrThrow({ where: { id: row.offeringVersion.assessmentVersionId }, select: { structure: true } }), this.adult(tx, patient.id),
      ]);
      const blockers = this.supportBlockers(row, source.structure); if (!adult) blockers.push('ADULT_BIRTH_DATE_REQUIRED');
      const consent = (id: string) => { const r = accepted.find(c => c.policyVersionId === id); return r ? this.consent(r) : null; };
      const policy = (r: typeof processing) => ({ id: r.id, versionNumber: r.versionNumber, policyKey: r.policyKey, locale: r.locale, title: r.title, body: r.body, contentHash: r.contentHash, status: r.status });
      await this.audit(tx, 'ASSESSMENT_OFFERING_READ', row.id, ctx);
      return { ...this.tariff(row), policy: ASSESSMENT_COMMERCIAL_POLICY, processingPolicy: policy(processing), termsPolicy: policy(terms), processingConsent: consent(processing.id), termsConsent: consent(terms.id), purchaseSupported: blockers.length === 0, blockers };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async accept(body: AssessmentConsentAcceptDto, rawKey: string | undefined, ctx: Context) {
    const key = financialKey(rawKey); if (body.accepted !== true) throw invalid();
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx); await lockFinancial(tx, `assessment-consent:${patient.id}`);
      const prior = await tx.patientConsentRecord.findFirst({ where: { patientId: patient.id, acceptanceIdempotencyKey: key } });
      if (prior) {
        if (prior.policyVersionId !== body.policyVersionId.toLowerCase() || prior.contentHash !== body.contentHash || !await tx.consentPolicyVersion.count({ where: { id: prior.policyVersionId, clinicId: patient.clinicId, policyKey: { in: policies } } })) throw purchaseConflict();
        await this.audit(tx, 'ASSESSMENT_CONSENT_READ', prior.id, ctx); return this.consent(prior);
      }
      await tx.$queryRaw(Prisma.sql`SELECT id FROM consent_policy_versions WHERE id=${body.policyVersionId}::uuid FOR SHARE`);
      const policy = await tx.consentPolicyVersion.findFirst({ where: { id: body.policyVersionId, clinicId: patient.clinicId, policyKey: { in: policies }, status: 'ACTIVE' } });
      if (!policy || policy.contentHash !== body.contentHash || createHash('sha256').update(policy.body, 'utf8').digest('hex') !== policy.contentHash) throw purchaseConflict();
      const current = await tx.patientConsentRecord.findFirst({ where: { patientId: patient.id, policyVersionId: policy.id, withdrawnAt: null } });
      const record = current ?? await tx.patientConsentRecord.create({ data: { patientId: patient.id, policyVersionId: policy.id, contentHash: policy.contentHash, acceptedByUserId: ctx.actorUserId, acceptedBySessionId: ctx.actorSessionId, acceptanceIdempotencyKey: key, acceptanceRequestId: ctx.requestId.slice(0, 128) } });
      await this.audit(tx, current ? 'ASSESSMENT_CONSENT_READ' : 'ASSESSMENT_CONSENT_ACCEPTED', record.id, ctx); return this.consent(record);
    });
  }
  async withdraw(id: string, rawKey: string | undefined, ctx: Context) {
    const key = financialKey(rawKey);
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx); await lockFinancial(tx, `assessment-consent:${patient.id}`);
      const replay = await tx.patientConsentRecord.findFirst({ where: { patientId: patient.id, withdrawalIdempotencyKey: key } }); if (replay && replay.id !== id.toLowerCase()) throw purchaseConflict();
      await tx.$queryRaw(Prisma.sql`SELECT id FROM patient_consent_records WHERE id=${id}::uuid AND patient_id=${patient.id}::uuid FOR UPDATE`);
      const record = await tx.patientConsentRecord.findFirst({ where: { id, patientId: patient.id, policyVersion: { clinicId: patient.clinicId, policyKey: 'ASSESSMENT_PROCESSING' } } }); if (!record) throw purchaseMissing();
      const [time] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${record.acceptedAt}::timestamptz) AS now`);
      const next = record.withdrawnAt ? record : await tx.patientConsentRecord.update({ where: { id }, data: { withdrawnAt: time!.now, withdrawnByUserId: ctx.actorUserId, withdrawnBySessionId: ctx.actorSessionId, withdrawalIdempotencyKey: key, withdrawalRequestId: ctx.requestId.slice(0, 128) } });
      await tx.$executeRaw(Prisma.sql`UPDATE patient_assessment_submissions s SET state='INVALIDATED',revision=s.revision+1,invalidated_at=GREATEST(CURRENT_TIMESTAMP,${next.withdrawnAt}::timestamptz,s.started_at),updated_at=GREATEST(CURRENT_TIMESTAMP,${next.withdrawnAt}::timestamptz,s.started_at) WHERE s.patient_id=${patient.id}::uuid AND s.state='IN_PROGRESS' AND EXISTS(SELECT 1 FROM assessment_access_grants g WHERE g.id=s.access_grant_id AND g.processing_consent_record_id=${record.id}::uuid)`);
      await this.audit(tx, record.withdrawnAt ? 'ASSESSMENT_CONSENT_READ' : 'ASSESSMENT_CONSENT_WITHDRAWN', id, ctx); return this.consent(next);
    });
  }

  async prepare(patient: PatientProfile, input: Record<string, string>): Promise<PreparedTarget> {
    if (input.educationalCoupleSessionId) return this.adminPurchases.prepare(patient, input);
    if (await this.adminPurchases.hasPublication(input.publicationId!, patient.clinicId)) return this.adminPurchases.prepare(patient, input);
    return this.prisma.$transaction(async tx => {
      const row = await this.publications.currentPublication(tx, patient.clinicId, input.publicationId!); if (!row) throw purchaseMissing(); if (row.publicationHash !== input.publicationHash) throw purchaseConflict();
      const source = await tx.assessmentVersion.findUniqueOrThrow({ where: { id: row.offeringVersion.assessmentVersionId }, select: { structure: true } }); if (this.supportBlockers(row, source.structure).length) throw invalid();
      const ttl = (row.offeringVersion.policyDraft as { quoteTtlSeconds?: number }).quoteTtlSeconds ?? 900;
      const [time] = await tx.$queryRaw<{ expiry: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP+${ttl}*INTERVAL '1 second' AS expiry`);
      const snapshot: Snapshot = { schemaVersion: 1, purchaseId: randomUUID(), publicationId: row.id, publicationHash: row.publicationHash, assessmentVersionId: row.offeringVersion.assessmentVersionId,
        processingConsentRecordId: input.processingConsentRecordId!, termsConsentRecordId: input.termsConsentRecordId!, title: row.offeringVersion.title, amountRial: row.offeringVersion.amountRial!.toString(), currency: 'IRR' };
      return { amountRial: row.offeringVersion.amountRial!, snapshot, expiresAt: time!.expiry };
    });
  }
  async reserve(tx: Prisma.TransactionClient, patient: PatientProfile, prepared: PreparedTarget) {
    if ((prepared.snapshot as { publicationAuthority?: string }).publicationAuthority === 'ADMIN_PUBLISHED') return this.adminPurchases.reserve(tx, patient, prepared);
    const snapshot = prepared.snapshot as unknown as Snapshot;
    await lockFinancial(tx, `assessment-purchase:${patient.id}:${snapshot.assessmentVersionId}`);
    const row = await this.lockedPublication(tx, patient.clinicId, snapshot.publicationId, false); if (!row || row.publicationHash !== snapshot.publicationHash || row.offeringVersion.assessmentVersionId !== snapshot.assessmentVersionId || row.offeringVersion.amountRial !== prepared.amountRial) throw purchaseConflict();
    await this.patientProof(tx, patient); await this.consents(tx, patient, row, snapshot);
    if (!await this.adult(tx, patient.id)) throw invalid();
    const source = await tx.assessmentVersion.findUniqueOrThrow({ where: { id: snapshot.assessmentVersionId }, select: { structure: true } }); if (this.supportBlockers(row, source.structure).length) throw invalid();
    const [pending, unused, active] = await Promise.all([
      tx.$queryRaw<{ count: number }[]>(Prisma.sql`SELECT assessment_has_pending_purchase(${patient.id}::uuid,${snapshot.assessmentVersionId}::uuid)::int AS count`),
      tx.assessmentAccessGrant.count({ where: { patientId: patient.id, assessmentVersionId: snapshot.assessmentVersionId, submission: null, processingConsent: { withdrawnAt: null }, purchase: { intent: { status: 'PAID' } } } }),
      tx.patientAssessmentSubmission.count({ where: { patientId: patient.id, assessmentVersionId: snapshot.assessmentVersionId, state: 'IN_PROGRESS', invalidatedAt: null } }),
    ]); if (pending[0]!.count || unused || active) throw purchaseConflict();
    await tx.assessmentPurchase.create({ data: { id: snapshot.purchaseId, clinicId: patient.clinicId, patientId: patient.id, publicationId: row.id, publicationHash: row.publicationHash, processingConsentRecordId: snapshot.processingConsentRecordId, termsConsentRecordId: snapshot.termsConsentRecordId, amountRial: prepared.amountRial, snapshot } });
    return { kind: 'ASSESSMENT_PURCHASE' as const, purchaseId: snapshot.purchaseId };
  }

  async canSettle(tx: Prisma.TransactionClient, intent: { assessmentPurchaseId: string | null; patientId: string; clinicId: string; expiresAt: Date | null; amountRial: bigint }) {
    if (!intent.assessmentPurchaseId) return false;
    const [time] = await tx.$queryRaw<{ expired: boolean }[]>(Prisma.sql`SELECT ${intent.expiresAt}::timestamptz IS NULL OR ${intent.expiresAt}::timestamptz<=CURRENT_TIMESTAMP AS expired`); if (time!.expired) return false;
    const purchase = await tx.assessmentPurchase.findFirst({ where: { id: intent.assessmentPurchaseId, patientId: intent.patientId, clinicId: intent.clinicId } }); if (!purchase || purchase.amountRial !== intent.amountRial) return false;
    if (purchase.adminPublicationId) return this.adminPurchases.canSettle(tx, intent, purchase);
    if (!purchase.publicationId) return false;
    const row = await this.lockedPublication(tx, intent.clinicId, purchase.publicationId, true); if (!row || row.publicationHash !== purchase.publicationHash) return false;
    const patient = await tx.patientProfile.findUniqueOrThrow({ where: { id: intent.patientId } });
    if (!await this.patientProof(tx, patient, false) || !await this.consents(tx, patient, row, purchase, false) || !await this.adult(tx, patient.id)) return false;
    const source = await tx.assessmentVersion.findUniqueOrThrow({ where: { id: row.offeringVersion.assessmentVersionId }, select: { structure: true } }); if (this.supportBlockers(row, source.structure).length) return false;
    const unused = await tx.assessmentAccessGrant.count({ where: { patientId: patient.id, assessmentVersionId: sourceId(row), submission: null, processingConsent: { withdrawnAt: null } } }); return unused === 0;
  }

  async list(query: AssessmentPurchasePageQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx); const where: Prisma.AssessmentPurchaseWhereInput = { patientId: patient.id, clinicId: patient.clinicId, ...((query.offeringKey || query.kind) ? { OR: [{ publication: { ...(query.offeringKey ? { offeringKey: query.offeringKey } : {}), ...(query.kind ? { offeringVersion: { priceMode:'PAID',kind: query.kind, assessmentVersion: { OR: [{ distribution: { is: null } }, { distribution: { publiclyAvailable: true } }] } } } : {}) } }, { adminPublication: { offeringVersion: { ...(query.offeringKey ? { offeringKey: query.offeringKey } : {}), ...(query.kind ? { kind: query.kind } : {}) } } }] } : {}) };
      const [rows, total] = await Promise.all([tx.assessmentPurchase.findMany({ where, include: purchaseRead, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.pageSize, skip: (query.page - 1) * query.pageSize }), tx.assessmentPurchase.count({ where })]);
      await this.audit(tx, 'ASSESSMENT_PURCHASE_HISTORY_READ', patient.id, ctx); return { items: rows.map(row => this.purchase(row)), total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async get(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => { const patient = await this.patient(tx, ctx); const row = await tx.assessmentPurchase.findFirst({ where: { id, patientId: patient.id, clinicId: patient.clinicId }, include: purchaseRead }); if (!row) throw purchaseMissing(); await this.audit(tx, 'ASSESSMENT_PURCHASE_READ', id, ctx); return this.purchase(row); }, { isolationLevel: 'RepeatableRead' });
  }
  private purchase(row: Prisma.AssessmentPurchaseGetPayload<{ include: typeof purchaseRead }>) { return { managementHref: row.educationalCoupleSessionId ? `/assessment/couples/educational/${row.educationalCoupleSessionId}` : row.adminPublicationId ? `/assessment/educational/${row.adminPublicationId}` : `/assessment/offerings/${row.publicationId}`, accessMode: 'PAID' as const, id: row.id, publicationId: (row.publicationId ?? row.adminPublicationId)!, title: (row.snapshot as unknown as Snapshot).title, amountRial: row.amountRial.toString(), currency: row.currency, createdAt: row.createdAt,
    intent: row.intent ? this.billing.view(row.intent) : null, grants: row.grants.filter(g => g.patientId === row.patientId).map(g => ({ id: g.id, submissionId: g.submission?.id ?? null, accessAvailable: g.processingConsent.withdrawnAt === null && row.intent?.status === 'PAID', grantedAt: g.grantedAt })) }; }
  private async patient(tx: Prisma.TransactionClient, ctx: Context) { const clinicId = await this.authority.scope(tx, 'patient', ctx); const patient = await tx.patientProfile.findUniqueOrThrow({ where: { userId: ctx.actorUserId } }); if (patient.clinicId !== clinicId) throw purchaseMissing(); await this.patientProof(tx, patient); return patient; }
  private async patientProof(tx: Prisma.TransactionClient, patient: PatientProfile, strict = true) {
    const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE p.id=${patient.id}::uuid AND p.clinic_id=${patient.clinicId}::uuid AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF p,u,c,ur,r`);
    if (!rows.length && strict) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Active patient self access required.', details: {} }); return rows.length > 0;
  }
  private async adult(tx: Prisma.TransactionClient, patientId: string) { await tx.$queryRaw(Prisma.sql`SELECT i.id FROM patient_medical_intakes i JOIN patient_medical_intake_revisions r ON r.intake_id=i.id AND r.revision_number=i.current_revision_number WHERE i.patient_id=${patientId}::uuid FOR SHARE OF i,r`); const [row] = await tx.$queryRaw<{ adult: boolean }[]>(Prisma.sql`SELECT couple_patient_is_adult(${patientId}::uuid) AS adult`); return row!.adult; }
  private async lockedPublication(tx: Prisma.TransactionClient, clinicId: string, id: string, quoted: boolean) {
    const pointer = await tx.assessmentOfferingPublication.findFirst({ where: { id, clinicId }, include: { offeringVersion: true } }); if (!pointer) return null;
    if (!quoted && pointer && !(await tx.$queryRaw<{ visible: boolean }[]>(Prisma.sql`SELECT assessment_publicly_available(${pointer.offeringVersion.assessmentVersionId}::uuid) AS visible`))[0]?.visible) return null;
    await lockFinancial(tx, `assessment-publication:${clinicId}:${pointer.offeringKey}`); await lockFinancial(tx, `assessment-protocol:${sourceId(pointer)}`);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM assessment_offering_versions WHERE id=${pointer.offeringVersionId}::uuid FOR SHARE`); await tx.$queryRaw(Prisma.sql`SELECT id FROM assessment_versions WHERE id=${sourceId(pointer)}::uuid FOR SHARE`);
    const review = await tx.assessmentProtocolReview.findUniqueOrThrow({ where: { id: pointer.protocolReviewId } });
    await tx.$queryRaw(Prisma.sql`SELECT id FROM consent_policy_versions WHERE id IN (${pointer.termsPolicyVersionId}::uuid,${review.consentPolicyVersionId}::uuid) ORDER BY id FOR SHARE`);
    const row = quoted ? await this.publications.quotedPublication(tx, clinicId, id) : await this.publications.currentPublication(tx, clinicId, id); if (row) await this.protocols.lockApprovalAuthority(tx, review); return row;
  }
  private async consents(tx: Prisma.TransactionClient, patient: PatientProfile, row: Publication, input: { processingConsentRecordId: string; termsConsentRecordId: string }, strict = true) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM patient_consent_records WHERE id IN (${input.processingConsentRecordId}::uuid,${input.termsConsentRecordId}::uuid) ORDER BY id FOR SHARE`);
    const review = await tx.assessmentProtocolReview.findUniqueOrThrow({ where: { id: row.protocolReviewId } });
    const records = await tx.patientConsentRecord.findMany({ where: { id: { in: [input.processingConsentRecordId, input.termsConsentRecordId] }, patientId: patient.id, withdrawnAt: null, policyVersion: { clinicId: patient.clinicId, status: 'ACTIVE' } }, include: { policyVersion: { select: { contentHash: true } } } });
    const valid = records.some(c => c.id === input.processingConsentRecordId && c.policyVersionId === review.consentPolicyVersionId && c.contentHash === review.consentContentHash && c.policyVersion.contentHash === c.contentHash) && records.some(c => c.id === input.termsConsentRecordId && c.policyVersionId === row.termsPolicyVersionId && c.contentHash === row.termsContentHash && c.policyVersion.contentHash === c.contentHash);
    if (!valid && strict) throw purchaseConflict(); return valid;
  }
  private supportBlockers(row: Publication, structure: Prisma.JsonValue) { const bands = (structure as { resultBands?: { requiresReview?: boolean }[] }).resultBands; return [...(row.offeringVersion.kind !== 'INDIVIDUAL' ? ['COUPLES_CHECKOUT_NOT_RELEASED'] : []), ...(!bands?.length || bands.some(b => b.requiresReview === true) ? ['RESULT_REVIEW_WORKFLOW_REQUIRED'] : [])]; }
  private tariff(row: Publication) { return { id: row.id, title: row.offeringVersion.title, offeringKey: row.offeringKey, publicationNumber: row.publicationNumber, kind: row.offeringVersion.kind, locale: row.offeringVersion.locale, amountRial: row.offeringVersion.amountRial!.toString(), currency: 'IRR', publicationHash: row.publicationHash, availabilityCheckRequired: true as const }; }
  private consent(row: PatientConsentRecord) { return { id: row.id, policyVersionId: row.policyVersionId, contentHash: row.contentHash, acceptedAt: row.acceptedAt, withdrawnAt: row.withdrawnAt }; }
  private async audit(tx: Prisma.TransactionClient, action: string, id: string, ctx: Context) { await tx.auditEvent.create({ data: { action, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, subjectType: 'ASSESSMENT_PURCHASE', subjectId: id, requestId: ctx.requestId.slice(0, 128), ipAddress: ctx.ipAddress, metadata: {} } }); }
}
const sourceId = (row: Publication) => row.offeringVersion.assessmentVersionId;
const purchaseRead = { intent: true, grants: { include: { submission: { select: { id: true } }, processingConsent: { select: { withdrawnAt: true } } } } } satisfies Prisma.AssessmentPurchaseInclude;
