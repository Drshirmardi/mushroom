import { createHash } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type AssessmentOfferingVersion } from '../../../generated/prisma/client';
import type { AssessmentOfferingListQueryDto, CreateAssessmentOfferingVersionDto, OfferingPolicyDraftDto } from './assessment-offerings.dto';

type Context = { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string };
const missing = () => new NotFoundException({ code: 'ASSESSMENT_OFFERING_NOT_FOUND', message: 'Assessment offering was not found.', details: {} });
const invalid = () => new UnprocessableEntityException({ code: 'ASSESSMENT_OFFERING_INVALID', message: 'Offering configuration is inconsistent.', details: {} });
const conflict = () => new ConflictException({ code: 'ASSESSMENT_OFFERING_CONFLICT', message: 'Offering identity conflicts with the existing versions.', details: {} });
const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object'
  ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}` : JSON.stringify(value);

@Injectable()
export class AssessmentOfferingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(body: CreateAssessmentOfferingVersionDto, rawKey: string | undefined, context: Context) {
    const key = rawKey?.trim();
    if (!key || key.length > 200 || !/^[\x21-\x7e]+$/u.test(key)) throw new UnprocessableEntityException({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'A valid Idempotency-Key is required.', details: {} });
    const amountRial = body.amountRial == null ? null : BigInt(body.amountRial);
    if (amountRial !== null && (amountRial > 9_000_000_000_000_000_000n || amountRial < 0n)) throw invalid();
    if (body.priceMode === 'FREE' && (amountRial !== null && amountRial !== 0n || body.paymentPoint != null)) throw invalid();
    if (body.priceMode === 'PAID' && amountRial === 0n) throw invalid();
    if ((body.algorithmId == null) !== (body.algorithmVersion == null)) throw invalid();
    const policyDraft = Object.fromEntries(Object.entries(body.policyDraft ?? {}).filter(([, value]) => value != null)
      .map(([field, value]) => [field, typeof value === 'string' ? value.trim() : value])) as OfferingPolicyDraftDto;
    const definition = { offeringKey: body.offeringKey, kind: body.kind, title: body.title.trim(), assessmentVersionId: body.assessmentVersionId,
      priceMode: body.priceMode, currency: body.currency, paymentPoint: body.paymentPoint ?? null,
      amountRial: body.priceMode === 'FREE' ? '0' : amountRial?.toString() ?? null,
      algorithmId: body.algorithmId ?? null, algorithmVersion: body.algorithmVersion ?? null, policyDraft };
    const payloadHash = createHash('sha256').update(canonical(definition)).digest('hex');
    return this.prisma.$transaction(async tx => {
      const clinic = await this.clinic(tx, context.actorUserId);
      await this.lock(tx, `offering-command:${context.actorUserId}:${key}`);
      const previous = await tx.assessmentOfferingVersion.findUnique({ where: { createdByUserId_idempotencyKey: { createdByUserId: context.actorUserId, idempotencyKey: key } } });
      if (previous) {
        if (previous.payloadHash !== payloadHash || previous.clinicId !== clinic.id) throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'Idempotency key was used for another definition.', details: {} });
        await this.audit(tx, 'ASSESSMENT_OFFERING_READ', previous.id, context);
        return this.response(previous, await this.questionnaireStatus(tx, previous.assessmentVersionId));
      }
      await this.lock(tx, `offering-version:${clinic.id}:${body.offeringKey}`);
      const source = await tx.assessmentVersion.findFirst({ where: { id: body.assessmentVersionId, clinicId: clinic.id, status: { in: ['PUBLISHED', 'RETIRED'] } }, select: { id: true, locale: true, assessmentKey: true, status: true } });
      if (!source) throw missing();
      const latest = await tx.assessmentOfferingVersion.findFirst({ where: { clinicId: clinic.id, offeringKey: body.offeringKey }, orderBy: { versionNumber: 'desc' }, include: { assessmentVersion: { select: { assessmentKey: true } } } });
      if (latest && (latest.kind !== body.kind || latest.locale !== source.locale || latest.assessmentVersion.assessmentKey !== source.assessmentKey)) throw conflict();
      if (policyDraft.consentPolicyVersionId && !await tx.consentPolicyVersion.findFirst({ where: { id: policyDraft.consentPolicyVersionId, clinicId: clinic.id }, select: { id: true } })) throw invalid();
      const created = await tx.assessmentOfferingVersion.create({ data: { ...definition, amountRial: definition.amountRial === null ? null : BigInt(definition.amountRial),
        policyDraft: policyDraft as Prisma.InputJsonObject, clinicId: clinic.id, locale: source.locale, versionNumber: (latest?.versionNumber ?? 0) + 1,
        createdByUserId: context.actorUserId, idempotencyKey: key, payloadHash } });
      await this.audit(tx, 'ASSESSMENT_OFFERING_VERSION_CREATED', created.id, context);
      return this.response(created, source.status);
    }, { maxWait: 30_000, timeout: 15_000 });
  }

  async list(query: AssessmentOfferingListQueryDto, context: Context) {
    return this.prisma.$transaction(async tx => {
      const clinic = await this.clinic(tx, context.actorUserId);
      const where = { clinicId: clinic.id, ...(query.offeringKey ? { offeringKey: query.offeringKey } : {}), ...(query.kind ? { kind: query.kind } : {}) };
      const [rows, total] = await Promise.all([
        tx.assessmentOfferingVersion.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.pageSize, skip: (query.page - 1) * query.pageSize, include: { assessmentVersion: { select: { status: true } } } }),
        tx.assessmentOfferingVersion.count({ where }),
      ]);
      await this.audit(tx, 'ASSESSMENT_OFFERING_LIST_READ', clinic.id, context);
      return { items: rows.map(row => this.response(row, row.assessmentVersion.status)), page: query.page, pageSize: query.pageSize, total };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async get(id: string, context: Context) {
    return this.prisma.$transaction(async tx => {
      const clinic = await this.clinic(tx, context.actorUserId);
      const row = await tx.assessmentOfferingVersion.findFirst({ where: { id, clinicId: clinic.id }, include: { assessmentVersion: { select: { status: true } } } });
      if (!row) throw missing();
      await this.audit(tx, 'ASSESSMENT_OFFERING_READ', row.id, context);
      return this.response(row, row.assessmentVersion.status);
    });
  }

  async retire(id: string, context: Context) {
    return this.prisma.$transaction(async tx => {
      const clinic = await this.clinic(tx, context.actorUserId);
      const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM assessment_offering_versions WHERE id = ${id}::uuid AND clinic_id = ${clinic.id}::uuid FOR UPDATE`);
      if (!locked.length) throw missing();
      const row = await tx.assessmentOfferingVersion.findUniqueOrThrow({ where: { id } });
      const retired = row.status === 'RETIRED' ? row : await tx.assessmentOfferingVersion.update({ where: { id }, data: { status: 'RETIRED', retiredAt: new Date() } });
      await this.audit(tx, row.status === 'RETIRED' ? 'ASSESSMENT_OFFERING_READ' : 'ASSESSMENT_OFFERING_RETIRED', id, context);
      return this.response(retired, await this.questionnaireStatus(tx, row.assessmentVersionId));
    });
  }

  private async clinic(tx: Prisma.TransactionClient, actorUserId: string) {
    const clinic = await tx.clinic.findFirst({ where: { status: 'ACTIVE', clinicalClinicAccesses: { some: { userId: actorUserId } } }, select: { id: true } });
    if (!clinic) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Active clinic membership is required.', details: {} });
    return clinic;
  }
  private async questionnaireStatus(tx: Prisma.TransactionClient, id: string) {
    return (await tx.assessmentVersion.findUniqueOrThrow({ where: { id }, select: { status: true } })).status;
  }
  private async lock(tx: Prisma.TransactionClient, key: string) { await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`); }
  private async audit(tx: Prisma.TransactionClient, action: string, subjectId: string, context: Context) {
    await tx.auditEvent.create({ data: { action, actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'ASSESSMENT_OFFERING', subjectId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: {} } });
  }
  private response(row: AssessmentOfferingVersion, questionnaireStatus: string) {
    const policyDraft = row.policyDraft as OfferingPolicyDraftDto;
    const blockers = ['OWNER_POLICY_APPROVAL_REQUIRED', 'CLINICAL_RELEASE_APPROVAL_REQUIRED', 'DIGITAL_ACCESS_INTEGRATION_REQUIRED'];
    if (row.status === 'RETIRED') blockers.push('OFFERING_RETIRED');
    if (questionnaireStatus !== 'PUBLISHED') blockers.push('QUESTIONNAIRE_NOT_PUBLISHED');
    if (row.priceMode === 'PAID' && (row.amountRial === null || row.paymentPoint === null)) blockers.push('PRICE_CONFIGURATION_INCOMPLETE');
    if (row.algorithmId === null || row.algorithmVersion === null) blockers.push('ALGORITHM_REFERENCE_MISSING');
    if (policyDraft.minimumAgeYears === undefined || !policyDraft.consentPolicyVersionId || !policyDraft.retentionPolicyRef || !policyDraft.resultVisibilityPolicyRef) blockers.push('DRAFT_POLICY_INCOMPLETE');
    if (row.kind === 'COUPLES') blockers.push('COUPLES_SESSION_AND_ALGORITHM_APPROVAL_REQUIRED');
    return { id: row.id, offeringKey: row.offeringKey, versionNumber: row.versionNumber, kind: row.kind, title: row.title, locale: row.locale,
      status: row.status, assessmentVersionId: row.assessmentVersionId, priceMode: row.priceMode, paymentPoint: row.paymentPoint, amountRial: row.amountRial?.toString() ?? null,
      currency: row.currency, algorithmId: row.algorithmId, algorithmVersion: row.algorithmVersion, policyDraft, createdAt: row.createdAt, retiredAt: row.retiredAt,
      releaseReadiness: { ready: false as const, blockers } };
  }
}
