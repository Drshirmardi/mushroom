import { createHash } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type AssessmentProtocolReview, type AssessmentVersion, type ConsentPolicyVersion } from '../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { ASSESSMENT_SCORING_IDENTITY } from '../domain/assessment-scoring';
import { canonicalAssessmentJson } from '../domain/assessment-canonical-json';
import { validateAssessmentStructure } from '../domain/assessment-structure-validation';
import type { ProtocolApproveDto, ProtocolPageQueryDto, ProtocolPreviewQueryDto, ProtocolQueueQueryDto, ProtocolWithdrawalDto } from './assessment-protocol.dto';

type Mode = 'admin' | 'doctor';
const digest = (value: unknown) => createHash('sha256').update(canonicalAssessmentJson(value)).digest('hex');
const missing = () => new NotFoundException({ code: 'ASSESSMENT_PROTOCOL_NOT_FOUND', message: 'Assessment protocol was not found.', details: {} });
const conflict = () => new ConflictException({ code: 'ASSESSMENT_PROTOCOL_CONFLICT', message: 'The protocol hash, revision, consent or decision changed.', details: {} });
const invalid = () => new UnprocessableEntityException({ code: 'ASSESSMENT_PROTOCOL_INVALID', message: 'An exact supported source and explicit review are required.', details: {} });

@Injectable()
export class AssessmentProtocolService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService) {}

  async queue(query: ProtocolQueueQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'doctor', ctx);
      const where: Prisma.AssessmentVersionWhereInput = { clinicId, status: { in: ['PUBLISHED', 'RETIRED'] }, ...(query.assessmentKey ? { assessmentKey: query.assessmentKey.trim() } : {}) };
      const [items, total] = await Promise.all([
        tx.assessmentVersion.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.pageSize, skip: (query.page - 1) * query.pageSize,
          select: { id: true, assessmentKey: true, versionNumber: true, title: true, locale: true, contentHash: true, status: true, protocolReviews: { orderBy: { reviewNumber: 'desc' }, take: 1, select: { reviewNumber: true, decision: true } } } }),
        tx.assessmentVersion.count({ where }),
      ]);
      await this.audit(tx, 'ASSESSMENT_PROTOCOL_QUEUE_READ', clinicId, ctx);
      return { items: items.map(({ protocolReviews, ...item }) => ({ ...item, currentReviewNumber: protocolReviews[0]?.reviewNumber ?? 0, latestRecordedDecision: protocolReviews[0]?.decision ?? null })), total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async preview(id: string, query: ProtocolPreviewQueryDto, mode: Mode, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, mode, ctx); const source = await this.source(tx, clinicId, id);
      const policy = await this.policy(tx, source, query.consentPolicyVersionId); const latest = await this.latest(tx, id);
      const blockers = this.sourceBlockers(source, policy);
      if (!latest) blockers.push('PHYSICIAN_REVIEW_MISSING');
      else if (latest.decision !== 'APPROVED') blockers.push('PHYSICIAN_REVIEW_WITHDRAWN');
      else {
        if (!policy || this.protocolHash(source, policy) !== latest.protocolHash) blockers.push('REVIEW_SOURCE_OR_CONSENT_CHANGED');
        if (!await this.reviewerUsable(tx, latest)) blockers.push('REVIEWER_AUTHORITY_UNAVAILABLE');
      }
      await this.audit(tx, 'ASSESSMENT_PROTOCOL_PREVIEW_READ', source.id, ctx);
      return { questionnaire: { id: source.id, assessmentKey: source.assessmentKey, versionNumber: source.versionNumber, title: source.title, locale: source.locale, contentHash: source.contentHash, status: source.status, structure: source.structure },
        consentPolicy: policy ? { id: policy.id, policyKey: policy.policyKey, versionNumber: policy.versionNumber, locale: policy.locale, title: policy.title, body: policy.body, contentHash: policy.contentHash, status: policy.status } : null,
        ...ASSESSMENT_SCORING_IDENTITY, educationalOnly: true as const, protocolHash: policy ? this.protocolHash(source, policy) : null, currentReviewNumber: latest?.reviewNumber ?? 0,
        latestReview: latest ? this.project(latest) : null, approvalUsable: blockers.length === 0, blockers };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async history(id: string, query: ProtocolPageQueryDto, mode: Mode, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, mode, ctx); await this.source(tx, clinicId, id);
      const where = { clinicId, assessmentVersionId: id };
      const [rows, total] = await Promise.all([tx.assessmentProtocolReview.findMany({ where, orderBy: { reviewNumber: 'desc' }, take: query.pageSize, skip: (query.page - 1) * query.pageSize }), tx.assessmentProtocolReview.count({ where })]);
      await this.audit(tx, 'ASSESSMENT_PROTOCOL_HISTORY_READ', id, ctx); return { items: rows.map(row => this.project(row)), total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async approve(id: string, body: ProtocolApproveDto, rawKey: string | undefined, ctx: Context) {
    if (body.reviewedQuestionnaireAndScoring !== true || body.educationalOnly !== true || body.noDiagnosisOrTherapeuticDiet !== true) throw invalid();
    const key = this.key(rawKey); const payloadHash = digest({ assessmentVersionId: id.toLowerCase(), decision: 'APPROVED', ...body, consentPolicyVersionId: body.consentPolicyVersionId.toLowerCase() });
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'doctor', ctx); const doctorProfileId = await this.authority.doctor(tx, clinicId, ctx.actorUserId, true);
      await this.commandLock(tx, ctx.actorUserId, key); const replay = await this.replay(tx, clinicId, key, payloadHash, ctx); if (replay) return replay;
      await this.sourceLock(tx, clinicId, id); const source = await this.source(tx, clinicId, id); const previous = await this.latest(tx, id);
      if ((previous?.reviewNumber ?? 0) !== body.expectedReviewNumber) throw conflict();
      await tx.$queryRaw(Prisma.sql`SELECT id FROM consent_policy_versions WHERE id=${body.consentPolicyVersionId}::uuid AND clinic_id=${clinicId}::uuid FOR SHARE`);
      const policy = await this.policy(tx, source, body.consentPolicyVersionId); if (!policy) throw conflict();
      const blockers = this.sourceBlockers(source, policy); if (blockers.includes('QUESTIONNAIRE_HASH_OR_STRUCTURE_INVALID')) throw invalid(); if (blockers.length) throw conflict();
      const protocolHash = this.protocolHash(source, policy); if (protocolHash !== body.protocolHash) throw conflict();
      const row = await tx.assessmentProtocolReview.create({ data: { clinicId, assessmentVersionId: source.id, reviewNumber: (previous?.reviewNumber ?? 0) + 1, decision: 'APPROVED', questionnaireContentHash: source.contentHash,
        ...ASSESSMENT_SCORING_IDENTITY, consentPolicyVersionId: policy.id, consentContentHash: policy.contentHash, protocolHash,
        actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, doctorProfileId, idempotencyKey: key, payloadHash, createdAt: await this.time(tx, previous?.createdAt) } });
      await this.audit(tx, 'ASSESSMENT_PROTOCOL_APPROVED', row.id, ctx); return this.project(row);
    }, { maxWait: 30_000, timeout: 15_000 });
  }

  async withdraw(id: string, reviewId: string, body: ProtocolWithdrawalDto, rawKey: string | undefined, ctx: Context) {
    const key = this.key(rawKey); const withdrawalReason = body.withdrawalReason.trim(); if (!withdrawalReason) throw invalid();
    const payloadHash = digest({ assessmentVersionId: id.toLowerCase(), reviewId: reviewId.toLowerCase(), decision: 'WITHDRAWN', ...body, withdrawalReason });
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'doctor', ctx); const doctorProfileId = await this.authority.doctor(tx, clinicId, ctx.actorUserId, true);
      await this.commandLock(tx, ctx.actorUserId, key); const replay = await this.replay(tx, clinicId, key, payloadHash, ctx); if (replay) return replay;
      await this.sourceLock(tx, clinicId, id); await this.source(tx, clinicId, id); const previous = await this.latest(tx, id);
      if (!previous || previous.id !== reviewId.toLowerCase() || previous.reviewNumber !== body.expectedReviewNumber || previous.decision !== 'APPROVED' || previous.protocolHash !== body.protocolHash) throw conflict();
      const row = await tx.assessmentProtocolReview.create({ data: { clinicId, assessmentVersionId: previous.assessmentVersionId, reviewNumber: previous.reviewNumber + 1, decision: 'WITHDRAWN',
        questionnaireContentHash: previous.questionnaireContentHash, algorithmId: previous.algorithmId, algorithmVersion: previous.algorithmVersion, consentPolicyVersionId: previous.consentPolicyVersionId, consentContentHash: previous.consentContentHash, protocolHash: previous.protocolHash,
        withdrawalOfId: previous.id, withdrawalReason, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, doctorProfileId, idempotencyKey: key, payloadHash, createdAt: await this.time(tx, previous.createdAt) } });
      await this.audit(tx, 'ASSESSMENT_PROTOCOL_WITHDRAWN', row.id, ctx); return this.project(row);
    }, { maxWait: 30_000, timeout: 15_000 });
  }

  // Composable prerequisite for later publication/purchases; this alone grants no patient entitlement.
  async lockApprovalAuthority(tx: Prisma.TransactionClient, review: AssessmentProtocolReview) {
    const policies = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM consent_policy_versions WHERE id=${review.consentPolicyVersionId}::uuid AND status='ACTIVE' FOR SHARE`);
    if (!policies.length) throw conflict();
    await this.authority.doctor(tx, review.clinicId, review.actorUserId, true);
  }
  async usableApproval(tx: Prisma.TransactionClient, clinicId: string, assessmentVersionId: string) {
    const source = await tx.assessmentVersion.findFirst({ where: { id: assessmentVersionId, clinicId, status: 'PUBLISHED' } }); if (!source) return null;
    const latest = await this.latest(tx, source.id); if (!latest || latest.decision !== 'APPROVED') return null;
    const policy = await this.policy(tx, source, latest.consentPolicyVersionId);
    if (!policy || this.sourceBlockers(source, policy).length || latest.protocolHash !== this.protocolHash(source, policy) || latest.questionnaireContentHash !== source.contentHash || latest.consentContentHash !== policy.contentHash || latest.algorithmId !== ASSESSMENT_SCORING_IDENTITY.algorithmId || latest.algorithmVersion !== ASSESSMENT_SCORING_IDENTITY.algorithmVersion || !await this.reviewerUsable(tx, latest)) return null;
    return latest;
  }

  private async source(tx: Prisma.TransactionClient, clinicId: string, id: string) { const source = await tx.assessmentVersion.findFirst({ where: { id, clinicId, status: { in: ['PUBLISHED', 'RETIRED'] } } }); if (!source) throw missing(); return source; }
  private async policy(tx: Prisma.TransactionClient, source: AssessmentVersion, id?: string) {
    const where = { clinicId: source.clinicId, policyKey: 'ASSESSMENT_PROCESSING', locale: source.locale, ...(id ? { id } : { status: 'ACTIVE' as const }) };
    const policy = await tx.consentPolicyVersion.findFirst({ where }); if (id && !policy) throw missing(); return policy;
  }
  private sourceBlockers(source: AssessmentVersion, policy: ConsentPolicyVersion | null) {
    const blockers: string[] = []; if (source.status !== 'PUBLISHED') blockers.push('QUESTIONNAIRE_NOT_PUBLISHED');
    try { validateAssessmentStructure(source.structure, true); if (digest(source.structure) !== source.contentHash) blockers.push('QUESTIONNAIRE_HASH_OR_STRUCTURE_INVALID'); } catch { blockers.push('QUESTIONNAIRE_HASH_OR_STRUCTURE_INVALID'); }
    if (!policy) blockers.push('ASSESSMENT_PROCESSING_CONSENT_MISSING');
    else if (policy.status !== 'ACTIVE' || !policy.activatedAt || createHash('sha256').update(policy.body, 'utf8').digest('hex') !== policy.contentHash) blockers.push('ASSESSMENT_PROCESSING_CONSENT_UNAVAILABLE');
    return blockers;
  }
  private protocolHash(source: AssessmentVersion, policy: ConsentPolicyVersion) { return digest({ schemaVersion: 1, assessmentVersionId: source.id, questionnaireContentHash: source.contentHash, ...ASSESSMENT_SCORING_IDENTITY, consentPolicyVersionId: policy.id, consentContentHash: policy.contentHash, educationalOnly: true }); }
  private async reviewerUsable(tx: Prisma.TransactionClient, review: AssessmentProtocolReview) { const [row] = await tx.$queryRaw<{ id: string | null }[]>(Prisma.sql`SELECT guidance_doctor_id(${review.actorUserId}::uuid,${review.clinicId}::uuid) AS id`); return !!row?.id && row.id === review.doctorProfileId; }
  private latest(tx: Prisma.TransactionClient, id: string) { return tx.assessmentProtocolReview.findFirst({ where: { assessmentVersionId: id }, orderBy: { reviewNumber: 'desc' } }); }
  private async commandLock(tx: Prisma.TransactionClient, actor: string, key: string) { await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'assessment-protocol-command:' + actor + ':' + key},0))`); }
  private async sourceLock(tx: Prisma.TransactionClient, clinicId: string, id: string) {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'assessment-protocol:' + id.toLowerCase()},0))`);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM assessment_versions WHERE id=${id}::uuid AND clinic_id=${clinicId}::uuid FOR SHARE`);
  }
  private key(raw: string | undefined) { const key = raw?.trim(); if (!key || !/^[\x21-\x7e]{8,200}$/u.test(key)) throw invalid(); return key; }
  private async time(tx: Prisma.TransactionClient, since?: Date) { const [row] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${since ?? null}::timestamptz) AS now`); return row!.now; }
  private async replay(tx: Prisma.TransactionClient, clinicId: string, key: string, hash: string, ctx: Context) {
    const row = await tx.assessmentProtocolReview.findUnique({ where: { clinicId_actorUserId_idempotencyKey: { clinicId, actorUserId: ctx.actorUserId, idempotencyKey: key } } }); if (!row) return null;
    if (row.payloadHash !== hash) throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'The command key is already used.', details: {} });
    await this.audit(tx, 'ASSESSMENT_PROTOCOL_REVIEW_READ', row.id, ctx); return this.project(row);
  }
  private async audit(tx: Prisma.TransactionClient, action: string, id: string, ctx: Context) { await tx.auditEvent.create({ data: { action, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, subjectType: 'ASSESSMENT_PROTOCOL', subjectId: id, requestId: ctx.requestId.slice(0, 128), ipAddress: ctx.ipAddress, metadata: {} } }); }
  private project(row: AssessmentProtocolReview) { return { id: row.id, assessmentVersionId: row.assessmentVersionId, reviewNumber: row.reviewNumber, decision: row.decision, questionnaireContentHash: row.questionnaireContentHash, algorithmId: row.algorithmId, algorithmVersion: row.algorithmVersion,
    consentPolicyVersionId: row.consentPolicyVersionId, consentContentHash: row.consentContentHash, protocolHash: row.protocolHash, withdrawalOfId: row.withdrawalOfId, withdrawalReason: row.withdrawalReason, createdAt: row.createdAt }; }
}
