import { createHash } from 'node:crypto';

import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AssessmentVersionStatus, Prisma } from '../../../generated/prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { ASSESSMENT_AUDIT_ACTIONS, type AssessmentAuditAction } from '../application/assessment-audit';
import type { AssessmentListQueryDto, AssessmentScoringPreviewInputDto, CreateAssessmentDto, UpdateAssessmentDto } from './admin-assessments.dto';
import { previewDimensionDraft, validateDimensionDraft } from '../domain/assessment-dimension-draft';
import { previewTieBreakDraft, validateTieBreakDraft, validateTieBreakPublication } from '../domain/assessment-tiebreak-draft';
import { AssessmentAnswerError } from '../domain/assessment-scoring';
import { MIZAJ_DRAFT_PRESET } from '../domain/mizaj-draft-preset';
import { AssessmentStructureError, validateAssessmentStructure } from '../domain/assessment-structure-validation';
import { canonicalAssessmentJson as canonicalJson } from '../domain/assessment-canonical-json';

interface AuditContext { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string }
type Structure = Record<string, unknown>;

const unavailable = () => new BadRequestException({ code: 'ASSESSMENT_CLINIC_UNAVAILABLE', message: 'No active clinic is configured.', details: {} });
const absent = () => new NotFoundException({ code: 'ASSESSMENT_VERSION_NOT_FOUND', message: 'Assessment version was not found.', details: {} });
const immutable = () => new ConflictException({ code: 'ASSESSMENT_VERSION_IMMUTABLE', message: 'Published or retired assessment versions cannot be changed.', details: {} });

const cleanText = (value: string) => value.trim().replace(/\s+/g, ' ');

@Injectable()
export class AdminAssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async distribution(id: string) {
    await this.version(id);
    const [row] = await this.prisma.$queryRaw<{ publiclyAvailable: boolean }[]>(Prisma.sql`SELECT assessment_publicly_available(${id}::uuid) AS "publiclyAvailable"`);
    return row!;
  }
  async updateDistribution(id: string, publiclyAvailable: boolean, context: AuditContext) {
    return this.prisma.$transaction(async tx => {
      await this.version(id, tx, true);
      await tx.$executeRaw(Prisma.sql`INSERT INTO assessment_distribution_settings(assessment_version_id,publicly_available) VALUES(${id}::uuid,${publiclyAvailable}) ON CONFLICT(assessment_version_id) DO UPDATE SET publicly_available=EXCLUDED.publicly_available,updated_at=CURRENT_TIMESTAMP`);
      await tx.auditEvent.create({ data: { action: 'ASSESSMENT_DISTRIBUTION_UPDATED', actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'ASSESSMENT_VERSION', subjectId: id, requestId: context.requestId, ipAddress: context.ipAddress, metadata: { publiclyAvailable } } });
      return { publiclyAvailable };
    });
  }

  async list(query: AssessmentListQueryDto) {
    const clinic = await this.clinic();
    const where: Prisma.AssessmentVersionWhereInput = {
      clinicId: clinic.id,
      NOT: { status: AssessmentVersionStatus.DELETED },
      ...(query.assessmentKey ? { assessmentKey: cleanText(query.assessmentKey).toUpperCase() } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.assessmentVersion.count({ where }),
      this.prisma.assessmentVersion.findMany({ where, orderBy: [{ assessmentKey: 'asc' }, { locale: 'asc' }, { versionNumber: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    ]);
    return { items: items.map((item) => this.response(item)), page: query.page, pageSize: query.pageSize, total };
  }

  async get(id: string) { return this.response(await this.version(id)); }

  draftPreset() { return structuredClone(MIZAJ_DRAFT_PRESET); }

  async scoringPreview(id: string, body: AssessmentScoringPreviewInputDto, context: AuditContext) {
    return this.prisma.$transaction(async tx => {
      const clinic = await this.clinic(tx);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM assessment_versions WHERE id=${id}::uuid AND clinic_id=${clinic.id}::uuid FOR SHARE`);
      const version = await tx.assessmentVersion.findFirst({ where: { id, clinicId: clinic.id } });
      if (!version) throw absent();
      if (version.status !== 'DRAFT' || version.contentHash !== body.expectedContentHash || this.hash(version.structure as Structure) !== version.contentHash) {
        throw new ConflictException({ code: 'ASSESSMENT_PREVIEW_CONFLICT', message: 'Preview requires the exact current draft.', details: {} });
      }
      try {
        const result = (version.structure as Structure).schemaVersion === 3
          ? previewTieBreakDraft(version.structure, body.answers)
          : previewDimensionDraft(version.structure, body.answers);
        await this.audit(ASSESSMENT_AUDIT_ACTIONS.DRAFT_PREVIEWED, id, context, {}, tx);
        return { assessmentVersionId: id, questionnaireContentHash: version.contentHash, ...result };
      } catch (error) {
        if (error instanceof AssessmentStructureError) throw new UnprocessableEntityException({ code: 'ASSESSMENT_STRUCTURE_INVALID', message: error.message, details: {} });
        if (error instanceof AssessmentAnswerError) throw new UnprocessableEntityException({ code: error.code, message: error.message, details: {} });
        throw error;
      }
    });
  }

  async create(body: CreateAssessmentDto, context: AuditContext) {
    const assessmentKey = cleanText(body.assessmentKey).toUpperCase();
    const title = cleanText(body.title);
    this.validate(assessmentKey, title, body.structure);
    return this.prisma.$transaction(async tx => {
      const clinic = await this.clinic(tx);
      await this.lock(tx, clinic.id, assessmentKey, body.locale);
      const versionNumber = (await tx.assessmentVersion.aggregate({ where: { clinicId: clinic.id, assessmentKey, locale: body.locale }, _max: { versionNumber: true } }))._max.versionNumber ?? 0;
      const created = await tx.assessmentVersion.create({ data: { clinicId: clinic.id, assessmentKey, versionNumber: versionNumber + 1, locale: body.locale, title, structure: body.structure as Prisma.InputJsonValue, contentHash: this.hash(body.structure) } });
      await this.audit(ASSESSMENT_AUDIT_ACTIONS.CREATED, created.id, context, { versionNumber: created.versionNumber }, tx);
      return this.response(created);
    }, { maxWait: 30_000 });
  }

  async update(id: string, body: UpdateAssessmentDto, context: AuditContext) {
    return this.prisma.$transaction(async tx => {
      const current = await this.version(id, tx, true);
      if (current.status !== AssessmentVersionStatus.DRAFT) throw immutable();
      const title = body.title === undefined ? current.title : cleanText(body.title);
      const structure = body.structure === undefined ? current.structure as Structure : body.structure;
      if ([2, 3].includes(Number((current.structure as Structure).schemaVersion)) && structure.schemaVersion !== (current.structure as Structure).schemaVersion) {
        throw new UnprocessableEntityException({ code: 'ASSESSMENT_STRUCTURE_INVALID', message: 'Keep the draft schema version; create a separate draft for another model.', details: {} });
      }
      this.validate(current.assessmentKey, title, structure);
      const updated = await tx.assessmentVersion.update({ where: { id }, data: { title, structure: structure as Prisma.InputJsonValue, contentHash: this.hash(structure) } });
      await this.audit(ASSESSMENT_AUDIT_ACTIONS.UPDATED, id, context, { changedFields: Object.keys(body) }, tx);
      return this.response(updated);
    });
  }

  async duplicate(id: string, context: AuditContext) {
    return this.prisma.$transaction(async tx => {
      const source = await this.version(id, tx, true);
      await this.lock(tx, source.clinicId, source.assessmentKey, source.locale);
      const versionNumber = (await tx.assessmentVersion.aggregate({ where: { clinicId: source.clinicId, assessmentKey: source.assessmentKey, locale: source.locale }, _max: { versionNumber: true } }))._max.versionNumber ?? 0;
      const created = await tx.assessmentVersion.create({ data: { clinicId: source.clinicId, assessmentKey: source.assessmentKey, versionNumber: versionNumber + 1, locale: source.locale, title: source.title, structure: source.structure as Prisma.InputJsonValue, contentHash: source.contentHash } });
      await this.audit(ASSESSMENT_AUDIT_ACTIONS.DUPLICATED, created.id, context, { sourceAssessmentVersionId: source.id, versionNumber: created.versionNumber }, tx);
      return this.response(created);
    }, { maxWait: 30_000 });
  }

  async publish(id: string, context: AuditContext) {
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'assessment-protocol:' + id.toLowerCase()},0))`);
      const current = await this.version(id, tx, true);
      if (current.status === AssessmentVersionStatus.PUBLISHED) return this.response(current);
      if (current.status === AssessmentVersionStatus.RETIRED || current.status === AssessmentVersionStatus.DELETED) throw immutable();
      this.validate(current.assessmentKey, current.title, current.structure as Structure, true);
      await this.lock(tx, current.clinicId, current.assessmentKey, current.locale);
      const existing = await tx.assessmentVersion.findFirst({ where: { clinicId: current.clinicId, assessmentKey: current.assessmentKey, locale: current.locale, status: 'PUBLISHED', id: { not: id } }, select: { id: true } });
      if (existing) throw new ConflictException({ code: 'ASSESSMENT_VERSION_ALREADY_PUBLISHED', message: 'Another published version already exists for this assessment.', details: {} });
      try {
        const published = await tx.assessmentVersion.update({ where: { id }, data: { status: AssessmentVersionStatus.PUBLISHED, publishedAt: new Date(), publishedByUserId: context.actorUserId } });
        await this.audit(ASSESSMENT_AUDIT_ACTIONS.PUBLISHED, id, context, { versionNumber: published.versionNumber }, tx);
        return this.response(published);
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') throw new ConflictException({ code: 'ASSESSMENT_VERSION_ALREADY_PUBLISHED', message: 'Another published version already exists for this assessment.', details: {} });
        throw error;
      }
    }, { maxWait: 30_000, timeout: 15_000 });
  }

  async archive(id: string, context: AuditContext) {
    return this.prisma.$transaction(async tx => {
      const current = await this.version(id, tx, true);
      if (current.status === AssessmentVersionStatus.RETIRED) return this.response(current);
      if (current.status !== AssessmentVersionStatus.PUBLISHED) throw new ConflictException({ code: 'ASSESSMENT_VERSION_NOT_PUBLISHED', message: 'Only published assessment versions can be archived.', details: {} });
      const retired = await tx.assessmentVersion.update({ where: { id }, data: { status: AssessmentVersionStatus.RETIRED, retiredAt: new Date() } });
      await this.audit(ASSESSMENT_AUDIT_ACTIONS.RETIRED, id, context, { versionNumber: retired.versionNumber }, tx);
      return this.response(retired);
    });
  }

  async remove(id: string, expectedContentHash: string, context: AuditContext) {
    return this.prisma.$transaction(async tx => {
      const current = await this.version(id, tx, true, true);
      if (current.contentHash !== expectedContentHash) throw new ConflictException({ code: 'ASSESSMENT_DELETE_CONFLICT', message: 'The assessment changed. Reload before deleting.', details: {} });
      if (current.status === AssessmentVersionStatus.DELETED) return { id };
      await this.lock(tx, current.clinicId, current.assessmentKey, current.locale);
      const policies = await tx.bookingEligibilityPolicy.updateMany({ where: { clinicId: current.clinicId, requiredAssessmentVersionId: id }, data: { assessmentRequirement: 'NOT_REQUIRED', requiredAssessmentVersionId: null } });
      await tx.assessmentVersion.update({ where: { id }, data: { status: AssessmentVersionStatus.DELETED } });
      await this.audit(ASSESSMENT_AUDIT_ACTIONS.DELETED, id, context, { versionNumber: current.versionNumber, assessmentKey: current.assessmentKey, locale: current.locale, contentHash: current.contentHash, previousStatus: current.status, retainedResults: true, detachedBookingPolicies: policies.count }, tx);
      return { id };
    });
  }

  private async clinic(db: Prisma.TransactionClient = this.prisma) { const clinic = await db.clinic.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } }); if (!clinic) throw unavailable(); return clinic; }
  private async version(id: string, db: Prisma.TransactionClient = this.prisma, lock = false, includeDeleted = false) {
    const clinic = await this.clinic(db);
    if (lock) {
      const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM assessment_versions WHERE id = ${id}::uuid AND clinic_id = ${clinic.id}::uuid FOR UPDATE`);
      if (!rows.length) throw absent();
    }
    const version = await db.assessmentVersion.findFirst({ where: { id, clinicId: clinic.id, ...(includeDeleted ? {} : { NOT: { status: AssessmentVersionStatus.DELETED } }) } }); if (!version) throw absent(); return version;
  }
  private async lock(tx: Prisma.TransactionClient, clinicId: string, key: string, locale: string) { await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`assessment-version:${clinicId}:${key}:${locale}`}, 0))`); }
  private hash(value: Structure) { return createHash('sha256').update(canonicalJson(value)).digest('hex'); }
  private response(version: { id: string; assessmentKey: string; versionNumber: number; locale: string; title: string; structure: Prisma.JsonValue; contentHash: string; status: AssessmentVersionStatus; publishedAt: Date | null; retiredAt: Date | null; publishedByUserId: string | null; createdAt: Date; updatedAt: Date }) { return { ...version, structure: version.structure as Structure }; }
  private async audit(action: AssessmentAuditAction, subjectId: string, context: AuditContext, metadata: Record<string, unknown>, db: Prisma.TransactionClient = this.prisma) { await db.auditEvent.create({ data: { action, actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'ASSESSMENT_VERSION', subjectId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: metadata as Prisma.InputJsonValue } }); }
  private validate(key: string, title: string, structure: Structure, forPublication = false) {
    try {
      if (!key || !title) throw new AssessmentStructureError('Assessment key and title are required.');
      if (structure.schemaVersion === 3) { if (forPublication) validateTieBreakPublication(structure); else validateTieBreakDraft(structure); }
      else if (!forPublication && structure.schemaVersion === 2) validateDimensionDraft(structure);
      else {
        if (['DIMENSION_RANK', 'DIMENSION_TIEBREAK'].includes(String((structure.scoring as { algorithmId?: unknown } | undefined)?.algorithmId))) throw new AssessmentStructureError('Dimension drafts cannot be relabeled as scalar questionnaires.');
        validateAssessmentStructure(structure, forPublication);
      }
    }
    catch (error) { if (error instanceof AssessmentStructureError) throw new UnprocessableEntityException({ code: 'ASSESSMENT_STRUCTURE_INVALID', message: error.message, details: {} }); throw error; }
  }
}
