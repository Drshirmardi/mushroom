import { createHash } from 'node:crypto';

import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AssessmentVersionStatus, Prisma } from '../../../generated/prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { ASSESSMENT_AUDIT_ACTIONS, type AssessmentAuditAction } from '../application/assessment-audit';
import type { AssessmentListQueryDto, CreateAssessmentDto, UpdateAssessmentDto } from './admin-assessments.dto';
import { AssessmentStructureError, validateAssessmentStructure } from '../domain/assessment-structure-validation';

interface AuditContext { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string }
type Structure = Record<string, unknown>;

const unavailable = () => new BadRequestException({ code: 'ASSESSMENT_CLINIC_UNAVAILABLE', message: 'No active clinic is configured.', details: {} });
const absent = () => new NotFoundException({ code: 'ASSESSMENT_VERSION_NOT_FOUND', message: 'Assessment version was not found.', details: {} });
const immutable = () => new ConflictException({ code: 'ASSESSMENT_VERSION_IMMUTABLE', message: 'Published or retired assessment versions cannot be changed.', details: {} });

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value);
};

const cleanText = (value: string) => value.trim().replace(/\s+/g, ' ');

@Injectable()
export class AdminAssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AssessmentListQueryDto) {
    const clinic = await this.clinic();
    const where: Prisma.AssessmentVersionWhereInput = {
      clinicId: clinic.id,
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
      const current = await this.version(id, tx, true);
      if (current.status === AssessmentVersionStatus.PUBLISHED) return this.response(current);
      if (current.status === AssessmentVersionStatus.RETIRED) throw immutable();
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
    }, { maxWait: 30_000 });
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

  private async clinic(db: Prisma.TransactionClient = this.prisma) { const clinic = await db.clinic.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } }); if (!clinic) throw unavailable(); return clinic; }
  private async version(id: string, db: Prisma.TransactionClient = this.prisma, lock = false) {
    const clinic = await this.clinic(db);
    if (lock) {
      const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM assessment_versions WHERE id = ${id}::uuid AND clinic_id = ${clinic.id}::uuid FOR UPDATE`);
      if (!rows.length) throw absent();
    }
    const version = await db.assessmentVersion.findFirst({ where: { id, clinicId: clinic.id } }); if (!version) throw absent(); return version;
  }
  private async lock(tx: Prisma.TransactionClient, clinicId: string, key: string, locale: string) { await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`assessment-version:${clinicId}:${key}:${locale}`}, 0))`); }
  private hash(value: Structure) { return createHash('sha256').update(canonicalJson(value)).digest('hex'); }
  private response(version: { id: string; assessmentKey: string; versionNumber: number; locale: string; title: string; structure: Prisma.JsonValue; contentHash: string; status: AssessmentVersionStatus; publishedAt: Date | null; retiredAt: Date | null; publishedByUserId: string | null; createdAt: Date; updatedAt: Date }) { return { ...version, structure: version.structure as Structure }; }
  private async audit(action: AssessmentAuditAction, subjectId: string, context: AuditContext, metadata: Record<string, unknown>, db: Prisma.TransactionClient = this.prisma) { await db.auditEvent.create({ data: { action, actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'ASSESSMENT_VERSION', subjectId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: metadata as Prisma.InputJsonValue } }); }
  private validate(key: string, title: string, structure: Structure, forPublication = false) {
    try { if (!key || !title) throw new AssessmentStructureError('Assessment key and title are required.'); validateAssessmentStructure(structure, forPublication); }
    catch (error) { if (error instanceof AssessmentStructureError) throw new UnprocessableEntityException({ code: 'ASSESSMENT_STRUCTURE_INVALID', message: error.message, details: {} }); throw error; }
  }
}
