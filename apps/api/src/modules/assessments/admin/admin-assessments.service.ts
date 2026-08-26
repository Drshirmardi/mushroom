import { createHash } from 'node:crypto';

import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AssessmentVersionStatus, Prisma } from '../../../generated/prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { ASSESSMENT_AUDIT_ACTIONS, type AssessmentAuditAction } from '../application/assessment-audit';
import type { AssessmentListQueryDto, CreateAssessmentDto, UpdateAssessmentDto } from './admin-assessments.dto';

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
    const clinic = await this.clinic();
    const assessmentKey = cleanText(body.assessmentKey).toUpperCase();
    const title = cleanText(body.title);
    this.validate(assessmentKey, title, body.structure);
    const versionNumber = (await this.prisma.assessmentVersion.aggregate({ where: { clinicId: clinic.id, assessmentKey, locale: body.locale }, _max: { versionNumber: true } }))._max.versionNumber ?? 0;
    const created = await this.prisma.assessmentVersion.create({ data: { clinicId: clinic.id, assessmentKey, versionNumber: versionNumber + 1, locale: body.locale, title, structure: body.structure as Prisma.InputJsonValue, contentHash: this.hash(body.structure) } });
    await this.audit(ASSESSMENT_AUDIT_ACTIONS.CREATED, created.id, context, { versionNumber: created.versionNumber });
    return this.response(created);
  }

  async update(id: string, body: UpdateAssessmentDto, context: AuditContext) {
    const current = await this.version(id);
    if (current.status !== AssessmentVersionStatus.DRAFT) throw immutable();
    const title = body.title === undefined ? current.title : cleanText(body.title);
    const structure = body.structure === undefined ? current.structure as Structure : body.structure;
    this.validate(current.assessmentKey, title, structure);
    const updated = await this.prisma.assessmentVersion.update({ where: { id }, data: { title, structure: structure as Prisma.InputJsonValue, contentHash: this.hash(structure) } });
    await this.audit(ASSESSMENT_AUDIT_ACTIONS.UPDATED, id, context, { changedFields: Object.keys(body) });
    return this.response(updated);
  }

  async duplicate(id: string, context: AuditContext) {
    const source = await this.version(id);
    const versionNumber = (await this.prisma.assessmentVersion.aggregate({ where: { clinicId: source.clinicId, assessmentKey: source.assessmentKey, locale: source.locale }, _max: { versionNumber: true } }))._max.versionNumber ?? 0;
    const created = await this.prisma.assessmentVersion.create({ data: { clinicId: source.clinicId, assessmentKey: source.assessmentKey, versionNumber: versionNumber + 1, locale: source.locale, title: source.title, structure: source.structure as Prisma.InputJsonValue, contentHash: source.contentHash } });
    await this.audit(ASSESSMENT_AUDIT_ACTIONS.DUPLICATED, created.id, context, { sourceAssessmentVersionId: source.id, versionNumber: created.versionNumber });
    return this.response(created);
  }

  async publish(id: string, context: AuditContext) {
    const current = await this.version(id);
    if (current.status === AssessmentVersionStatus.PUBLISHED) return this.response(current);
    if (current.status === AssessmentVersionStatus.RETIRED) throw immutable();
    try {
      const published = await this.prisma.assessmentVersion.update({ where: { id }, data: { status: AssessmentVersionStatus.PUBLISHED, publishedAt: new Date(), publishedByUserId: context.actorUserId } });
      await this.audit(ASSESSMENT_AUDIT_ACTIONS.PUBLISHED, id, context, { versionNumber: published.versionNumber });
      return this.response(published);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException({ code: 'ASSESSMENT_VERSION_ALREADY_PUBLISHED', message: 'Another published version already exists for this assessment.', details: {} });
      throw error;
    }
  }

  async archive(id: string, context: AuditContext) {
    const current = await this.version(id);
    if (current.status === AssessmentVersionStatus.RETIRED) return this.response(current);
    if (current.status !== AssessmentVersionStatus.PUBLISHED) throw new ConflictException({ code: 'ASSESSMENT_VERSION_NOT_PUBLISHED', message: 'Only published assessment versions can be archived.', details: {} });
    const retired = await this.prisma.assessmentVersion.update({ where: { id }, data: { status: AssessmentVersionStatus.RETIRED, retiredAt: new Date() } });
    await this.audit(ASSESSMENT_AUDIT_ACTIONS.RETIRED, id, context, { versionNumber: retired.versionNumber });
    return this.response(retired);
  }

  private async clinic() { const clinic = await this.prisma.clinic.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } }); if (!clinic) throw unavailable(); return clinic; }
  private async version(id: string) { const clinic = await this.clinic(); const version = await this.prisma.assessmentVersion.findFirst({ where: { id, clinicId: clinic.id } }); if (!version) throw absent(); return version; }
  private hash(value: Structure) { return createHash('sha256').update(canonicalJson(value)).digest('hex'); }
  private response(version: { id: string; assessmentKey: string; versionNumber: number; locale: string; title: string; structure: Prisma.JsonValue; contentHash: string; status: AssessmentVersionStatus; publishedAt: Date | null; retiredAt: Date | null; publishedByUserId: string | null; createdAt: Date; updatedAt: Date }) { return { ...version, structure: version.structure as Structure }; }
  private async audit(action: AssessmentAuditAction, subjectId: string, context: AuditContext, metadata: Record<string, unknown>) { await this.prisma.auditEvent.create({ data: { action, actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'ASSESSMENT_VERSION', subjectId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: metadata as Prisma.InputJsonValue } }); }
  private validate(key: string, title: string, structure: Structure) {
    if (!key || !title || !structure || structure.schemaVersion !== 1 || !Array.isArray(structure.sections)) throw new UnprocessableEntityException({ code: 'ASSESSMENT_STRUCTURE_INVALID', message: 'Assessment key, title, schemaVersion, and sections are required.', details: {} });
    const ids = new Set<string>();
    for (const section of structure.sections) {
      if (!section || typeof section !== 'object' || typeof (section as Structure).id !== 'string' || !cleanText((section as Structure).id as string) || !Array.isArray((section as Structure).questions)) throw new UnprocessableEntityException({ code: 'ASSESSMENT_STRUCTURE_INVALID', message: 'Every section needs an id and questions.', details: {} });
      const sectionId = cleanText((section as Structure).id as string); if (ids.has(sectionId)) throw new UnprocessableEntityException({ code: 'ASSESSMENT_STRUCTURE_INVALID', message: 'Section and question ids must be unique.', details: {} }); ids.add(sectionId);
      for (const question of (section as Structure).questions as unknown[]) { if (!question || typeof question !== 'object' || typeof (question as Structure).id !== 'string' || !cleanText((question as Structure).id as string)) throw new UnprocessableEntityException({ code: 'ASSESSMENT_STRUCTURE_INVALID', message: 'Every question needs an id.', details: {} }); const questionId = cleanText((question as Structure).id as string); if (ids.has(questionId)) throw new UnprocessableEntityException({ code: 'ASSESSMENT_STRUCTURE_INVALID', message: 'Section and question ids must be unique.', details: {} }); ids.add(questionId); }
    }
  }
}
