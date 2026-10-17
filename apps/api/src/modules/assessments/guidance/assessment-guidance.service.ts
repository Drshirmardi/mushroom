import { createHash } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type AssessmentGuidanceVersion } from '../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { GuidanceContentService } from '../../content/guidance/guidance-content.service';
import type { GuidanceApprovalDto } from '../../content/guidance/guidance-content.dto';
import { ClinicalAccessAuditService } from '../../clinical/clinical-access-audit.service';
import { patientServiceScope } from '../../directory/patient-directory.visibility';
import { ASSESSMENT_SCORING_IDENTITY } from '../domain/assessment-scoring';
import { validateAssessmentStructure } from '../domain/assessment-structure-validation';
import type { AssessmentGuidanceCreateDto, AssessmentGuidanceQueryDto, PatientAssessmentGuidanceDto } from './assessment-guidance.dto';

type Mode = 'admin' | 'doctor';
type Reference = { id: string; contentHash: string };
type ServiceReference = { id: string; name: string; description: string | null };
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object'
  ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}` : JSON.stringify(value);
const hash = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
const missing = () => new NotFoundException({ code: 'ASSESSMENT_GUIDANCE_NOT_FOUND', message: 'Assessment guidance was not found.', details: {} });
const invalid = () => new UnprocessableEntityException({ code: 'ASSESSMENT_GUIDANCE_INVALID', message: 'Exact source and available guidance references are required.', details: {} });
const conflict = () => new ConflictException({ code: 'ASSESSMENT_GUIDANCE_CONFLICT', message: 'The mapping hash, lifecycle or dependencies conflict.', details: {} });
const band = (structure: unknown, id: string) => {
  try { validateAssessmentStructure(structure, true); } catch { throw invalid(); }
  const bands = object(structure).resultBands;
  const matches = Array.isArray(bands) ? bands.map(object).filter(b => b.id === id) : [];
  if (matches.length !== 1) throw invalid();
  return matches[0]!;
};

@Injectable()
export class AssessmentGuidanceService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService,
    private readonly content: GuidanceContentService, private readonly clinicalAudit: ClinicalAccessAuditService) {}

  async create(body: AssessmentGuidanceCreateDto, rawKey: string | undefined, ctx: Context) {
    const key = rawKey?.trim(); if (!key || !/^[\x21-\x7e]{8,200}$/u.test(key)) throw invalid();
    const definition = { assessmentVersionId: body.assessmentVersionId.toLowerCase(), resultBandId: body.resultBandId,
      guidanceContentIds: body.guidanceContentIds.map(id => id.toLowerCase()), serviceIds: body.serviceIds.map(id => id.toLowerCase()), recommendConsultation: body.recommendConsultation };
    if (new Set(definition.guidanceContentIds).size !== definition.guidanceContentIds.length || new Set(definition.serviceIds).size !== definition.serviceIds.length) throw invalid();
    const payloadHash = hash(definition);
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'admin', ctx);
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'assessment-guidance-command:' + ctx.actorUserId + ':' + key},0))`);
      const prior = await tx.assessmentGuidanceVersion.findUnique({ where: { clinicId_createdByUserId_idempotencyKey: { clinicId, createdByUserId: ctx.actorUserId, idempotencyKey: key } } });
      if (prior) {
        if (prior.payloadHash !== payloadHash) throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'The command key is already used.', details: {} });
        await this.audit(tx, 'ASSESSMENT_GUIDANCE_READ', prior.id, ctx); return this.project(prior);
      }
      const source = await tx.assessmentVersion.findFirst({ where: { id: definition.assessmentVersionId, clinicId, status: { in: ['PUBLISHED', 'RETIRED'] } } });
      if (!source) throw missing();
      const resultBandSnapshot = band(source.structure, body.resultBandId);
      await this.lockReferences(tx, definition.guidanceContentIds, definition.serviceIds);
      const contents = await this.content.approvedVersions(tx, clinicId, definition.guidanceContentIds);
      const services = await this.services(tx, clinicId, definition.serviceIds);
      if (contents.length !== definition.guidanceContentIds.length || contents.some(c => c.locale !== source.locale) || services.length !== definition.serviceIds.length) throw invalid();
      const snapshot = { assessmentVersionId: source.id, resultBandId: body.resultBandId, questionnaireContentHash: source.contentHash,
        ...ASSESSMENT_SCORING_IDENTITY, resultBandSnapshot, contentReferences: contents.map(c => ({ id: c.id, contentHash: c.contentHash })), serviceReferences: services, recommendConsultation: body.recommendConsultation };
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'assessment-guidance:' + source.id + ':' + body.resultBandId},0))`);
      const latest = await tx.assessmentGuidanceVersion.findFirst({ where: { assessmentVersionId: source.id, resultBandId: body.resultBandId }, orderBy: { versionNumber: 'desc' }, select: { versionNumber: true } });
      const row = await tx.assessmentGuidanceVersion.create({ data: { ...snapshot, resultBandSnapshot: resultBandSnapshot as Prisma.InputJsonObject, clinicId, versionNumber: (latest?.versionNumber ?? 0) + 1,
        contentHash: hash(snapshot), createdByUserId: ctx.actorUserId, idempotencyKey: key, payloadHash } });
      await this.audit(tx, 'ASSESSMENT_GUIDANCE_CREATED', row.id, ctx); return this.project(row);
    }, { maxWait: 30_000, timeout: 15_000 });
  }

  async list(query: AssessmentGuidanceQueryDto, mode: Mode, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, mode, ctx);
      const where = { clinicId, ...(query.assessmentVersionId ? { assessmentVersionId: query.assessmentVersionId } : {}), ...(query.status ? { status: query.status } : {}) };
      const [rows, total] = await Promise.all([tx.assessmentGuidanceVersion.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.pageSize, skip: (query.page - 1) * query.pageSize }), tx.assessmentGuidanceVersion.count({ where })]);
      await this.audit(tx, 'ASSESSMENT_GUIDANCE_LIST_READ', clinicId, ctx);
      return { items: rows.map(row => this.project(row)), total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async get(id: string, mode: Mode, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, mode, ctx); const row = await tx.assessmentGuidanceVersion.findFirst({ where: { id, clinicId } }); if (!row) throw missing();
      await this.audit(tx, 'ASSESSMENT_GUIDANCE_READ', row.id, ctx); return this.project(row);
    });
  }
  async approve(id: string, body: GuidanceApprovalDto, ctx: Context) {
    if (body.educationalOnly !== true || body.noDiagnosisOrTherapeuticDiet !== true) throw invalid();
    return this.change(id, 'doctor', ctx, async (tx, row, doctorId) => {
      if (row.status === 'REVOKED' || row.contentHash !== body.contentHash) throw conflict();
      if (row.status === 'APPROVED') return row;
      if (!await this.dependencies(tx, row, true)) throw conflict();
      const approvedAt = await this.time(tx, row.createdAt);
      const next = await tx.assessmentGuidanceVersion.update({ where: { id }, data: { status: 'APPROVED', approvedAt, approvedByUserId: ctx.actorUserId, approvedDoctorId: doctorId!, approvedSessionId: ctx.actorSessionId } });
      await this.audit(tx, 'ASSESSMENT_GUIDANCE_APPROVED', id, ctx); return next;
    });
  }
  async revoke(id: string, mode: Mode, ctx: Context) {
    return this.change(id, mode, ctx, async (tx, row) => {
      if (mode === 'admin' && row.approvedAt !== null) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Physician authority is required.', details: {} });
      if (row.status === 'REVOKED') return row;
      const next = await tx.assessmentGuidanceVersion.update({ where: { id }, data: { status: 'REVOKED', revokedAt: await this.time(tx, row.approvedAt ?? row.createdAt), revokedByUserId: ctx.actorUserId, revokedSessionId: ctx.actorSessionId } });
      await this.audit(tx, 'ASSESSMENT_GUIDANCE_REVOKED', id, ctx); return next;
    });
  }

  async patient(id: string, ctx: Context): Promise<PatientAssessmentGuidanceDto> {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'patient', ctx);
      const patient = await tx.patientProfile.findUniqueOrThrow({ where: { userId: ctx.actorUserId }, select: { id: true } });
      // Exclude private answers and score at the database boundary; only provenance/band metadata is needed.
      const [submission] = await tx.$queryRaw<{ assessmentVersionId: string; snapshot: Prisma.JsonValue; completionPayloadHash: string | null }[]>(Prisma.sql`SELECT s.assessment_version_id AS "assessmentVersionId",s.result_snapshot-ARRAY['answers','score'] AS snapshot,s.completion_payload_hash AS "completionPayloadHash" FROM patient_assessment_submissions s JOIN assessment_versions v ON v.id=s.assessment_version_id WHERE s.id=${id}::uuid AND s.patient_id=${patient.id}::uuid AND s.state='COMPLETE' AND s.invalidated_at IS NULL AND v.clinic_id=${clinicId}::uuid AND v.status IN ('PUBLISHED','RETIRED')`);
      if (!submission) throw missing();
      const response: PatientAssessmentGuidanceDto = { submissionId: id, assessmentVersionId: submission.assessmentVersionId, status: 'NO_APPROVED_MAPPING', mappingId: null, mappingVersion: null, contentHash: null, content: [], services: [], recommendConsultation: false };
      const snapshot = object(submission.snapshot);
      const source = await tx.assessmentVersion.findUniqueOrThrow({ where: { id: submission.assessmentVersionId } });
      if (snapshot.algorithmId == null || snapshot.algorithmVersion == null || snapshot.questionnaireContentHash == null || snapshot.answerPayloadHash == null) response.status = 'PROVENANCE_UNRECORDED';
      else if (snapshot.algorithmId !== ASSESSMENT_SCORING_IDENTITY.algorithmId || snapshot.algorithmVersion !== ASSESSMENT_SCORING_IDENTITY.algorithmVersion || snapshot.questionnaireContentHash !== source.contentHash || typeof snapshot.answerPayloadHash !== 'string' || !/^[a-f0-9]{64}$/u.test(snapshot.answerPayloadHash) || snapshot.answerPayloadHash !== submission.completionPayloadHash) response.status = 'PROVENANCE_UNSUPPORTED';
      else {
        let actualBand: Record<string, unknown> | null = null;
        try { actualBand = band(source.structure, String(object(snapshot.resultBand).id)); } catch { response.status = 'PROVENANCE_UNSUPPORTED'; }
        if (actualBand) {
          const expected = { id: actualBand.id, title: actualBand.title, riskLevel: actualBand.riskLevel ?? 'NONE', requiresReview: actualBand.requiresReview ?? false };
          if (canonical(expected) !== canonical(snapshot.resultBand)) response.status = 'PROVENANCE_UNSUPPORTED';
          else if (expected.requiresReview === true) response.status = 'CLINICAL_REVIEW_REQUIRED';
          else {
            const row = await tx.assessmentGuidanceVersion.findFirst({ where: { assessmentVersionId: source.id, resultBandId: String(actualBand.id), approvedAt: { not: null } }, orderBy: { versionNumber: 'desc' } });
            if (row) {
              response.mappingId = row.id; response.mappingVersion = row.versionNumber; response.contentHash = row.contentHash;
              if (row.status === 'REVOKED') response.status = 'MAPPING_REVOKED';
              else if (row.questionnaireContentHash !== source.contentHash || row.algorithmId !== snapshot.algorithmId || row.algorithmVersion !== snapshot.algorithmVersion || canonical(row.resultBandSnapshot) !== canonical(actualBand)) response.status = 'PROVENANCE_UNSUPPORTED';
              else {
                const [reviewer] = await tx.$queryRaw<{ id: string | null }[]>(Prisma.sql`SELECT guidance_doctor_id(${row.approvedByUserId}::uuid,${clinicId}::uuid) AS id`);
                const deps = reviewer?.id === row.approvedDoctorId ? await this.dependencies(tx, row) : null;
                if (!deps) response.status = 'DEPENDENCIES_UNAVAILABLE';
                else { response.status = 'READY'; response.content = deps.contents.map(c => this.content.project(c)); response.services = deps.services; response.recommendConsultation = row.recommendConsultation; }
              }
            }
          }
        }
      }
      await this.clinicalAudit.record({ clinicId, patientId: patient.id, action: 'READ', resourceType: 'ASSESSMENT_EDUCATIONAL_GUIDANCE', resourceId: id, resourceRevisionId: response.mappingId ?? undefined, metadata: { status: response.status } }, ctx, tx);
      return response;
    }, { isolationLevel: 'RepeatableRead' });
  }

  private async change(id: string, mode: Mode, ctx: Context, action: (tx: Prisma.TransactionClient, row: AssessmentGuidanceVersion, doctorId: string | null) => Promise<AssessmentGuidanceVersion>) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, mode, ctx); const doctorId = mode === 'doctor' ? await this.authority.doctor(tx, clinicId, ctx.actorUserId, true) : null;
      const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM assessment_guidance_versions WHERE id=${id}::uuid AND clinic_id=${clinicId}::uuid FOR UPDATE`); if (!rows.length) throw missing();
      const row = await tx.assessmentGuidanceVersion.findUniqueOrThrow({ where: { id } }); const next = await action(tx, row, doctorId);
      if (next.status === row.status) await this.audit(tx, 'ASSESSMENT_GUIDANCE_READ', id, ctx); return this.project(next);
    }, { maxWait: 30_000, timeout: 15_000 });
  }
  private async dependencies(tx: Prisma.TransactionClient, row: AssessmentGuidanceVersion, lock = false) {
    const refs = row.contentReferences as Reference[]; const serviceRefs = row.serviceReferences as ServiceReference[];
    if (lock) await this.lockReferences(tx, refs.map(r => r.id), serviceRefs.map(r => r.id));
    const [contents, services, source] = await Promise.all([this.content.approvedVersions(tx, row.clinicId, refs.map(r => r.id)), this.services(tx, row.clinicId, serviceRefs.map(r => r.id)), tx.assessmentVersion.findUniqueOrThrow({ where: { id: row.assessmentVersionId }, select: { locale: true } })]);
    if (contents.length !== refs.length || contents.some((c, i) => c.contentHash !== refs[i]!.contentHash || c.locale !== source.locale) || canonical(services) !== canonical(serviceRefs)) return null;
    return { contents, services };
  }
  private async services(tx: Prisma.TransactionClient, clinicId: string, ids: string[]) {
    const rows = ids.length ? await tx.service.findMany({ where: { ...patientServiceScope(clinicId), id: { in: ids } }, select: { id: true, name: true, description: true } }) : [];
    return ids.flatMap(id => { const row = rows.find(r => r.id === id); return row ? [row] : []; });
  }
  private async lockReferences(tx: Prisma.TransactionClient, contentIds: string[], serviceIds: string[]) {
    if (contentIds.length) await tx.$queryRaw(Prisma.sql`SELECT id FROM guidance_content_versions WHERE id IN (${Prisma.join(contentIds.map(id => Prisma.sql`${id}::uuid`))}) ORDER BY id FOR SHARE`);
    if (serviceIds.length) {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM services WHERE id IN (${Prisma.join(serviceIds.map(id => Prisma.sql`${id}::uuid`))}) ORDER BY id FOR SHARE`);
      await tx.$queryRaw(Prisma.sql`SELECT ds.id FROM doctor_services ds JOIN doctor_profiles d ON d.id=ds.doctor_id WHERE ds.service_id IN (${Prisma.join(serviceIds.map(id => Prisma.sql`${id}::uuid`))}) ORDER BY ds.id FOR SHARE OF ds,d`);
    }
  }
  private async time(tx: Prisma.TransactionClient, since: Date) { const [row] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${since}::timestamptz) AS now`); return row!.now; }
  private async audit(tx: Prisma.TransactionClient, action: string, id: string, ctx: Context) { await tx.auditEvent.create({ data: { action, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, subjectType: 'ASSESSMENT_GUIDANCE', subjectId: id, requestId: ctx.requestId.slice(0, 128), ipAddress: ctx.ipAddress, metadata: {} } }); }
  private project(row: AssessmentGuidanceVersion) { return { id: row.id, assessmentVersionId: row.assessmentVersionId, resultBandId: row.resultBandId, versionNumber: row.versionNumber, questionnaireContentHash: row.questionnaireContentHash, algorithmId: row.algorithmId, algorithmVersion: row.algorithmVersion,
    resultBandSnapshot: row.resultBandSnapshot, contentReferences: row.contentReferences, serviceReferences: row.serviceReferences, recommendConsultation: row.recommendConsultation, status: row.status, contentHash: row.contentHash, createdAt: row.createdAt, approvedAt: row.approvedAt, revokedAt: row.revokedAt }; }
}
