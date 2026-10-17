import { createHash } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type AssessmentOfferingPublication, type AssessmentOfferingVersion, type ConsentPolicyVersion, type AssessmentProtocolReview } from '../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { canonicalAssessmentJson } from '../domain/assessment-canonical-json';
import { ASSESSMENT_SCORING_IDENTITY } from '../domain/assessment-scoring';
import type { OfferingPolicyDraftDto } from '../offerings/assessment-offerings.dto';
import { AssessmentProtocolService } from '../protocol/assessment-protocol.service';
import type { PublicationListQueryDto, PublicationPreviewQueryDto, PublishAssessmentOfferingDto } from './assessment-publication.dto';

export const ASSESSMENT_COMMERCIAL_POLICY = Object.freeze({ schemaVersion: 1, minimumAgeYears: 18, paymentPoint: 'PRE_START', ordinaryRefunds: false, patientCancellation: false, invitationAutomaticExpiry: false, entitlementAutomaticExpiry: false } as const);
const hash = (value: unknown) => createHash('sha256').update(canonicalAssessmentJson(value)).digest('hex');
const missing = () => new NotFoundException({ code: 'ASSESSMENT_PUBLICATION_NOT_FOUND', message: 'Assessment commercial configuration was not found.', details: {} });
const conflict = () => new ConflictException({ code: 'ASSESSMENT_PUBLICATION_CONFLICT', message: 'The tariff, protocol, terms or publication revision changed.', details: {} });
const invalid = () => new UnprocessableEntityException({ code: 'ASSESSMENT_PUBLICATION_INVALID', message: 'Complete supported commercial configuration and explicit review are required.', details: {} });
type RecordWithTariff = AssessmentOfferingPublication & { offeringVersion: AssessmentOfferingVersion };

@Injectable()
export class AssessmentPublicationService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService, private readonly protocols: AssessmentProtocolService) {}

  async preview(query: PublicationPreviewQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'admin', ctx);
      const offering = await this.offering(tx, clinicId, query.offeringVersionId);
      const sources = await this.sources(tx, offering, query.termsPolicyVersionId);
      const latest = await this.latest(tx, clinicId, offering.offeringKey);
      await this.audit(tx, 'ASSESSMENT_COMMERCIAL_PREVIEW_READ', offering.id, ctx);
      return { offering: this.tariff(offering), termsPolicy: this.terms(sources.terms), protocolReviewId: sources.review?.id ?? null, protocolHash: sources.review?.protocolHash ?? null,
        policy: ASSESSMENT_COMMERCIAL_POLICY, publicationHash: sources.hash, expectedPublicationNumber: latest?.publicationNumber ?? 0, configurationReady: sources.blockers.length === 0, blockers: sources.blockers };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async publish(body: PublishAssessmentOfferingDto, rawKey: string | undefined, ctx: Context) {
    const key = rawKey?.trim(); if (!key || !/^[\x21-\x7e]{8,200}$/u.test(key) || body.reviewedTermsAndRetention !== true) throw invalid();
    const payloadHash = hash({ ...body, offeringVersionId: body.offeringVersionId.toLowerCase(), termsPolicyVersionId: body.termsPolicyVersionId.toLowerCase() });
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'admin', ctx);
      await this.lock(tx, `assessment-publication-command:${ctx.actorUserId}:${key}`);
      const replay = await tx.assessmentOfferingPublication.findUnique({ where: { clinicId_publishedByUserId_idempotencyKey: { clinicId, publishedByUserId: ctx.actorUserId, idempotencyKey: key } }, include: { offeringVersion: true } });
      if (replay) {
        if (replay.payloadHash !== payloadHash) throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'The command key is already used.', details: {} });
        await this.audit(tx, 'ASSESSMENT_COMMERCIAL_READ', replay.id, ctx); return this.project(replay);
      }
      const initial = await this.offering(tx, clinicId, body.offeringVersionId);
      await this.lock(tx, `assessment-publication:${clinicId}:${initial.offeringKey}`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM assessment_offering_versions WHERE id=${initial.id}::uuid FOR SHARE`);
      const offering = await this.offering(tx, clinicId, initial.id);
      const latest = await this.latest(tx, clinicId, offering.offeringKey);
      if ((latest?.publicationNumber ?? 0) !== body.expectedPublicationNumber) throw conflict();
      // Stabilize exact clinical review, questionnaire, policy and professional authority through commit.
      await this.lock(tx, `assessment-protocol:${offering.assessmentVersionId}`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM assessment_versions WHERE id=${offering.assessmentVersionId}::uuid FOR SHARE`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM consent_policy_versions WHERE id=${body.termsPolicyVersionId}::uuid OR id=(SELECT consent_policy_version_id FROM assessment_protocol_reviews WHERE assessment_version_id=${offering.assessmentVersionId}::uuid ORDER BY review_number DESC LIMIT 1) ORDER BY id FOR SHARE`);
      const sources = await this.sources(tx, offering, body.termsPolicyVersionId);
      if (this.configurationBlockers(offering).length) throw invalid();
      if (sources.blockers.length || !sources.review || !sources.hash || sources.hash !== body.publicationHash) throw conflict();
      await this.authority.doctor(tx, clinicId, sources.review.actorUserId, true);
      await this.lock(tx, `assessment-commercial-start:${offering.assessmentVersionId}`);
      const now = await this.time(tx, latest?.retiredAt ?? latest?.createdAt);
      if (latest?.status === 'ACTIVE') await this.retireRow(tx, latest, 'REPLACED', now, ctx);
      const row = await tx.assessmentOfferingPublication.create({ data: { clinicId, offeringVersionId: offering.id, offeringKey: offering.offeringKey, publicationNumber: (latest?.publicationNumber ?? 0) + 1,
        protocolReviewId: sources.review.id, termsPolicyVersionId: sources.terms.id, termsContentHash: sources.terms.contentHash, policySnapshot: ASSESSMENT_COMMERCIAL_POLICY,
        publicationHash: sources.hash, publishedByUserId: ctx.actorUserId, publishedSessionId: ctx.actorSessionId, idempotencyKey: key, payloadHash, createdAt: now }, include: { offeringVersion: true } });
      await this.audit(tx, 'ASSESSMENT_COMMERCIAL_PUBLISHED', row.id, ctx); return this.project(row);
    }, { maxWait: 30_000, timeout: 15_000 });
  }

  async list(query: PublicationListQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'admin', ctx);
      const where: Prisma.AssessmentOfferingPublicationWhereInput = { clinicId, ...(query.offeringKey ? { offeringKey: query.offeringKey } : {}), ...(query.kind ? { offeringVersion: { kind: query.kind } } : {}) };
      const [rows, total] = await Promise.all([tx.assessmentOfferingPublication.findMany({ where, include: { offeringVersion: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.pageSize, skip: (query.page - 1) * query.pageSize }), tx.assessmentOfferingPublication.count({ where })]);
      await this.audit(tx, 'ASSESSMENT_COMMERCIAL_LIST_READ', clinicId, ctx); return { items: rows.map(row => this.project(row)), total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async get(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'admin', ctx); const row = await this.record(tx, clinicId, id);
      const blockers = await this.recordBlockers(tx, row);
      await this.audit(tx, 'ASSESSMENT_COMMERCIAL_READ', id, ctx); return { ...this.project(row), commercialUsable: blockers.length === 0, blockers };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async retire(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'admin', ctx); const initial = await this.record(tx, clinicId, id);
      await this.lock(tx, `assessment-publication:${clinicId}:${initial.offeringKey}`);
      const row = await this.record(tx, clinicId, id);
      const next = row.status === 'RETIRED' ? row : await this.retireRow(tx, row, 'WITHDRAWN', await this.time(tx, row.createdAt), ctx);
      await this.audit(tx, row.status === 'RETIRED' ? 'ASSESSMENT_COMMERCIAL_READ' : 'ASSESSMENT_COMMERCIAL_RETIRED', id, ctx);
      return this.project({ ...next, offeringVersion: row.offeringVersion });
    });
  }

  // Only a commercial prerequisite. Future callers must still enforce beneficiary/consent/payment access.
  async currentPublication(tx: Prisma.TransactionClient, clinicId: string, id: string) {
    const row = await tx.assessmentOfferingPublication.findFirst({ where: { id, clinicId, status: 'ACTIVE' }, include: { offeringVersion: true } });
    if (!row || (await this.recordBlockers(tx, row)).length) return null;
    return row;
  }

  // Existing unexpired quotes retain an exact tariff after a price replacement, never after withdrawal.
  async quotedPublication(tx: Prisma.TransactionClient, clinicId: string, id: string) {
    const row = await tx.assessmentOfferingPublication.findFirst({ where: { id, clinicId, OR: [{ status: 'ACTIVE' }, { status: 'RETIRED', retirementReason: 'REPLACED' }] }, include: { offeringVersion: true } });
    if (!row || (await this.recordBlockers(tx, row)).some(code => code !== 'PUBLICATION_RETIRED')) return null;
    return row;
  }

  private configurationBlockers(offering: AssessmentOfferingVersion) {
    const p = offering.policyDraft as OfferingPolicyDraftDto; const blockers: string[] = [];
    if (offering.status !== 'DRAFT') blockers.push('DRAFT_RETIRED');
    if (offering.priceMode !== 'PAID' || offering.currency !== 'IRR' || offering.amountRial === null || offering.amountRial <= 0n || offering.amountRial > 9_000_000_000_000_000_000n || offering.paymentPoint !== 'PRE_START') blockers.push('PAID_PRE_START_TARIFF_REQUIRED');
    if (offering.algorithmId !== ASSESSMENT_SCORING_IDENTITY.algorithmId || offering.algorithmVersion !== ASSESSMENT_SCORING_IDENTITY.algorithmVersion) blockers.push('SUPPORTED_ALGORITHM_REQUIRED');
    if (p.minimumAgeYears !== 18 || p.invitationTtlHours !== undefined || p.entitlementValidityDays !== undefined || p.refundPolicyRef !== undefined && p.refundPolicyRef !== 'NO_REFUNDS') blockers.push('OWNER_POLICY_CONFLICT');
    if (typeof p.consentPolicyVersionId !== 'string' || typeof p.retentionPolicyRef !== 'string' || !p.retentionPolicyRef.trim() || typeof p.resultVisibilityPolicyRef !== 'string' || !p.resultVisibilityPolicyRef.trim()) blockers.push('PROCESSING_RETENTION_VISIBILITY_POLICY_REQUIRED');
    return blockers;
  }
  private async sources(tx: Prisma.TransactionClient, offering: AssessmentOfferingVersion, termsId: string) {
    const terms = await tx.consentPolicyVersion.findFirst({ where: { id: termsId, clinicId: offering.clinicId, locale: offering.locale, policyKey: 'ASSESSMENT_PURCHASE_TERMS' } }); if (!terms) throw missing();
    const blockers = this.configurationBlockers(offering);
    if (terms.status !== 'ACTIVE' || !terms.activatedAt || createHash('sha256').update(terms.body, 'utf8').digest('hex') !== terms.contentHash) blockers.push('PURCHASE_TERMS_UNAVAILABLE');
    const review = await this.protocols.usableApproval(tx, offering.clinicId, offering.assessmentVersionId);
    const consentId = (offering.policyDraft as OfferingPolicyDraftDto).consentPolicyVersionId;
    if (!review || typeof consentId !== 'string' || review.consentPolicyVersionId !== consentId.toLowerCase()) blockers.push('EXACT_PROTOCOL_APPROVAL_UNAVAILABLE');
    return { terms, review, blockers, hash: review ? this.publicationHash(offering, review, terms) : null };
  }
  private async recordBlockers(tx: Prisma.TransactionClient, row: RecordWithTariff) {
    const sources = await this.sources(tx, row.offeringVersion, row.termsPolicyVersionId); const blockers = sources.blockers;
    if (row.status !== 'ACTIVE') blockers.push('PUBLICATION_RETIRED');
    if (sources.review?.id !== row.protocolReviewId || sources.hash !== row.publicationHash || sources.terms.contentHash !== row.termsContentHash || canonicalAssessmentJson(row.policySnapshot) !== canonicalAssessmentJson(ASSESSMENT_COMMERCIAL_POLICY)) blockers.push('PUBLICATION_SOURCE_CHANGED');
    return blockers;
  }
  private publicationHash(offering: AssessmentOfferingVersion, review: AssessmentProtocolReview, terms: ConsentPolicyVersion) { return hash({ schemaVersion: 1, offering: this.tariff(offering), protocolReviewId: review.id, protocolHash: review.protocolHash, termsPolicyVersionId: terms.id, termsContentHash: terms.contentHash, policy: ASSESSMENT_COMMERCIAL_POLICY }); }
  private async offering(tx: Prisma.TransactionClient, clinicId: string, id: string) { const row = await tx.assessmentOfferingVersion.findFirst({ where: { id, clinicId } }); if (!row) throw missing(); return row; }
  private async record(tx: Prisma.TransactionClient, clinicId: string, id: string) { const row = await tx.assessmentOfferingPublication.findFirst({ where: { id, clinicId }, include: { offeringVersion: true } }); if (!row) throw missing(); return row; }
  private latest(tx: Prisma.TransactionClient, clinicId: string, offeringKey: string) { return tx.assessmentOfferingPublication.findFirst({ where: { clinicId, offeringKey }, orderBy: { publicationNumber: 'desc' } }); }
  private retireRow(tx: Prisma.TransactionClient, row: AssessmentOfferingPublication, reason: string, now: Date, ctx: Context) { return tx.assessmentOfferingPublication.update({ where: { id: row.id }, data: { status: 'RETIRED', retiredAt: now, retiredByUserId: ctx.actorUserId, retiredSessionId: ctx.actorSessionId, retirementReason: reason } }); }
  private async lock(tx: Prisma.TransactionClient, key: string) { await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))`); }
  private async time(tx: Prisma.TransactionClient, since?: Date) { const [row] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${since ?? null}::timestamptz) AS now`); return row!.now; }
  private async audit(tx: Prisma.TransactionClient, action: string, id: string, ctx: Context) { await tx.auditEvent.create({ data: { action, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, subjectType: 'ASSESSMENT_COMMERCIAL', subjectId: id, requestId: ctx.requestId.slice(0, 128), ipAddress: ctx.ipAddress, metadata: {} } }); }
  private tariff(row: AssessmentOfferingVersion) { return { id: row.id, offeringKey: row.offeringKey, versionNumber: row.versionNumber, kind: row.kind, title: row.title, locale: row.locale, status: row.status, assessmentVersionId: row.assessmentVersionId, priceMode: row.priceMode, paymentPoint: row.paymentPoint, amountRial: row.amountRial?.toString() ?? null, currency: row.currency, algorithmId: row.algorithmId, algorithmVersion: row.algorithmVersion, policyDraft: row.policyDraft }; }
  private terms(row: ConsentPolicyVersion) { return { id: row.id, policyKey: row.policyKey, versionNumber: row.versionNumber, locale: row.locale, title: row.title, body: row.body, contentHash: row.contentHash, status: row.status }; }
  private project(row: RecordWithTariff) { return { id: row.id, offeringKey: row.offeringKey, publicationNumber: row.publicationNumber, offering: this.tariff(row.offeringVersion), protocolReviewId: row.protocolReviewId, termsPolicyVersionId: row.termsPolicyVersionId, termsContentHash: row.termsContentHash, policy: ASSESSMENT_COMMERCIAL_POLICY, publicationHash: row.publicationHash, status: row.status, createdAt: row.createdAt, retiredAt: row.retiredAt, retirementReason: row.retirementReason }; }
}
