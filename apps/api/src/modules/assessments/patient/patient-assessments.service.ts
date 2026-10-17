import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { AssessmentVersionStatus, PatientAssessmentState, Prisma, type PatientAssessmentSubmission } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { ASSESSMENT_AUDIT_ACTIONS } from '../application/assessment-audit';
import { AssessmentAnswerError, ASSESSMENT_SCORING_IDENTITY, scoreAssessment } from '../domain/assessment-scoring';
import type { PatientAssessmentHistoryQueryDto } from './patient-assessments.dto';
import { accessibleAssessmentWhere, processableAssessmentGrants } from '../access/assessment-access.policy';
import { AssessmentAccessService } from '../access/assessment-access.service';

interface AuditContext { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string }
const notFound = () => new NotFoundException({ code: 'ASSESSMENT_NOT_FOUND', message: 'Assessment was not found.', details: {} });
const submissionNotFound = () => new NotFoundException({ code: 'ASSESSMENT_SUBMISSION_NOT_FOUND', message: 'Assessment submission was not found.', details: {} });
const immutable = () => new ConflictException({ code: 'ASSESSMENT_SUBMISSION_IMMUTABLE', message: 'Only an in-progress assessment submission can be changed.', details: {} });
const keyReused = () => new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'Idempotency key was already used for another submission.', details: {} });

@Injectable()
export class PatientAssessmentsService {
  constructor(private readonly prisma: PrismaService, private readonly access: AssessmentAccessService) {}

  async history(userId: string, query: PatientAssessmentHistoryQueryDto, context: AuditContext) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(userId, tx);
      const where = { ...accessibleAssessmentWhere, patientId: patient.id, assessmentVersion: { clinicId: patient.clinicId }, ...(query.state ? { state: query.state } : {}) };
      const [rows, total] = await Promise.all([
        tx.patientAssessmentSubmission.findMany({ where, orderBy: [{ startedAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize,
          select: { id: true, accessGrantId: true, assessmentVersionId: true, attemptNumber: true, revision: true, state: true, startedAt: true, updatedAt: true, completedAt: true, invalidatedAt: true,
            assessmentVersion: { select: { assessmentKey: true, versionNumber: true, locale: true, title: true, status: true } } } }),
        tx.patientAssessmentSubmission.count({ where }),
      ]);
      const processable = await processableAssessmentGrants(tx, rows.flatMap(row => row.accessGrantId ? [row.accessGrantId] : []));
      await this.audit(tx, ASSESSMENT_AUDIT_ACTIONS.HISTORY_READ, patient.id, context, 'PATIENT_ASSESSMENT_HISTORY');
      return { items: rows.map(({ assessmentVersion: version, invalidatedAt, accessGrantId, ...row }) => ({ ...row, assessmentKey: version.assessmentKey,
        versionNumber: version.versionNumber, locale: version.locale, title: version.title,
        resumeAvailable: row.state === 'IN_PROGRESS' && invalidatedAt === null && version.status !== 'DRAFT' && (!accessGrantId || processable.has(accessGrantId)),
      })), page: query.page, pageSize: query.pageSize, total };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async questionnaire(id: string, userId: string, context: AuditContext) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(userId, tx);
      const submission = await tx.patientAssessmentSubmission.findFirst({
        where: { ...accessibleAssessmentWhere, id, patientId: patient.id, state: { in: ['IN_PROGRESS', 'COMPLETE'] }, invalidatedAt: null,
          assessmentVersion: { clinicId: patient.clinicId, status: { in: ['PUBLISHED', 'RETIRED'] } } },
        select: { id: true, accessGrantId: true, state: true, assessmentVersion: { select: { id: true, assessmentKey: true, versionNumber: true, locale: true, title: true, status: true, contentHash: true, structure: true } } },
      });
      if (!submission) throw submissionNotFound();
      await this.audit(tx, ASSESSMENT_AUDIT_ACTIONS.QUESTIONNAIRE_READ, id, context);
      const { id: assessmentVersionId, ...version } = submission.assessmentVersion;
      const canProcess = !submission.accessGrantId || (await processableAssessmentGrants(tx, [submission.accessGrantId])).has(submission.accessGrantId);
      return { submissionId: id, assessmentVersionId, ...version, resumeAvailable: submission.state === 'IN_PROGRESS' && canProcess };
    });
  }

  async provenance(id: string, userId: string, context: AuditContext) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(userId, tx);
      const submission = await tx.patientAssessmentSubmission.findFirst({
        where: { ...accessibleAssessmentWhere, id, patientId: patient.id, state: 'COMPLETE', invalidatedAt: null, assessmentVersion: { clinicId: patient.clinicId } },
        select: { assessmentVersionId: true, completedAt: true, resultSnapshot: true, assessmentVersion: { select: { contentHash: true } } },
      });
      if (!submission) throw submissionNotFound();
      const snapshot = submission.resultSnapshot as Record<string, unknown> | null;
      const algorithmId = typeof snapshot?.algorithmId === 'string' ? snapshot.algorithmId : null;
      const algorithmVersion = typeof snapshot?.algorithmVersion === 'number' && Number.isInteger(snapshot.algorithmVersion) && snapshot.algorithmVersion > 0 ? snapshot.algorithmVersion : null;
      const answerPayloadHash = typeof snapshot?.answerPayloadHash === 'string' ? snapshot.answerPayloadHash : null;
      await this.audit(tx, ASSESSMENT_AUDIT_ACTIONS.PROVENANCE_READ, id, context);
      return { submissionId: id, assessmentVersionId: submission.assessmentVersionId, questionnaireContentHash: submission.assessmentVersion.contentHash,
        provenanceStatus: algorithmId && algorithmVersion && answerPayloadHash ? 'RECORDED' : 'LEGACY_UNRECORDED',
        algorithmId, algorithmVersion, answerPayloadHash, completedAt: submission.completedAt };
    });
  }

  async list(userId: string) {
    const patient = await this.patient(userId, this.prisma);
    const items = await this.prisma.assessmentVersion.findMany({
      where: { clinicId: patient.clinicId, status: AssessmentVersionStatus.PUBLISHED, offeringVersions: { none: { commercialPublications: { some: {} } } } },
      orderBy: [{ assessmentKey: 'asc' }, { versionNumber: 'desc' }],
    });
    return { items: items.map(item => ({ id: item.id, assessmentKey: item.assessmentKey, versionNumber: item.versionNumber, locale: item.locale, title: item.title, structure: item.structure as Record<string, unknown> })) };
  }

  async start(versionId: string, userId: string, context: AuditContext) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(userId, tx);
      await this.lock(tx, `assessment:start:${patient.id}:${versionId}`);
      // Publication takes protocol before the commercial boundary; paid legacy resume must agree.
      await this.lock(tx, `assessment-protocol:${versionId.toLowerCase()}`);
      await this.lock(tx, `assessment-commercial-start:${versionId.toLowerCase()}`);
      // Share-lock publication until the new attempt commits; retiring a version cannot race start.
      const versions = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT id FROM assessment_versions
        WHERE id = ${versionId}::uuid AND clinic_id = ${patient.clinicId}::uuid AND status = 'PUBLISHED'
        FOR SHARE
      `);
      if (!versions.length) throw notFound();
      const active = await tx.patientAssessmentSubmission.findFirst({
        where: { ...accessibleAssessmentWhere, patientId: patient.id, assessmentVersionId: versionId, state: PatientAssessmentState.IN_PROGRESS },
        orderBy: { attemptNumber: 'desc' },
      });
      if (active) {
        await this.access.processingSubmission(tx, active, patient, context);
        await this.audit(tx, ASSESSMENT_AUDIT_ACTIONS.SUBMISSION_READ, active.id, context);
        return this.response(active);
      }
      if (await tx.assessmentOfferingPublication.count({ where: { offeringVersion: { assessmentVersionId: versionId } } })) throw new ConflictException({ code: 'ASSESSMENT_PAYMENT_REQUIRED', message: 'Start this assessment through its owned paid access.', details: {} });
      const max = await tx.patientAssessmentSubmission.aggregate({
        where: { patientId: patient.id, assessmentVersionId: versionId }, _max: { attemptNumber: true },
      });
      const submission = await tx.patientAssessmentSubmission.create({
        data: { patientId: patient.id, assessmentVersionId: versionId, attemptNumber: (max._max.attemptNumber ?? 0) + 1, answers: {} },
      });
      await this.audit(tx, ASSESSMENT_AUDIT_ACTIONS.SUBMISSION_STARTED, submission.id, context);
      return this.response(submission);
    });
  }

  async startPaid(grantId: string, userId: string, context: AuditContext) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(userId, tx);
      const pointer = await tx.assessmentAccessGrant.findFirst({ where: { id: grantId, patientId: patient.id, clinicId: patient.clinicId, processingConsent: { withdrawnAt: null }, purchase: { intent: { status: 'PAID', purpose: 'ASSESSMENT' } } }, select: { assessmentVersionId: true } });
      if (!pointer) throw submissionNotFound();
      await this.lock(tx, `assessment:start:${patient.id}:${pointer.assessmentVersionId}`);
      const existing = await tx.patientAssessmentSubmission.findFirst({ where: { ...accessibleAssessmentWhere, accessGrantId: grantId, patientId: patient.id, invalidatedAt: null } });
      if (existing?.state === 'COMPLETE') { await this.access.self(tx, patient, context); await this.audit(tx, ASSESSMENT_AUDIT_ACTIONS.SUBMISSION_READ, existing.id, context); return this.response(existing); }
      await this.access.processingGrant(tx, grantId, patient, context);
      if (existing) { if (existing.state !== 'IN_PROGRESS') throw immutable(); await this.audit(tx, ASSESSMENT_AUDIT_ACTIONS.SUBMISSION_READ, existing.id, context); return this.response(existing); }
      const active = await tx.patientAssessmentSubmission.count({ where: { patientId: patient.id, assessmentVersionId: pointer.assessmentVersionId, state: 'IN_PROGRESS' } });
      if (active) throw new ConflictException({ code: 'ASSESSMENT_PURCHASE_CONFLICT', message: 'Finish the existing owned attempt first.', details: {} });
      const max = await tx.patientAssessmentSubmission.aggregate({ where: { patientId: patient.id, assessmentVersionId: pointer.assessmentVersionId }, _max: { attemptNumber: true } });
      const submission = await tx.patientAssessmentSubmission.create({ data: { patientId: patient.id, assessmentVersionId: pointer.assessmentVersionId, accessGrantId: grantId, attemptNumber: (max._max.attemptNumber ?? 0) + 1, answers: {} } });
      await this.audit(tx, ASSESSMENT_AUDIT_ACTIONS.SUBMISSION_STARTED, submission.id, context); return this.response(submission);
    }, { maxWait: 30_000, timeout: 15_000 });
  }

  async get(id: string, userId: string, context: AuditContext) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(userId, tx);
      const submission = await tx.patientAssessmentSubmission.findFirst({
        where: { ...accessibleAssessmentWhere, id, patientId: patient.id, assessmentVersion: { clinicId: patient.clinicId } },
      });
      if (!submission) throw submissionNotFound();
      await this.audit(tx, ASSESSMENT_AUDIT_ACTIONS.SUBMISSION_READ, id, context);
      return this.response(submission);
    });
  }

  async save(id: string, answers: Record<string, unknown>, userId: string, context: AuditContext, expectedRevision?: number) {
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      throw new UnprocessableEntityException({ code: 'ASSESSMENT_ANSWERS_INVALID', message: 'Answers must be an object.', details: {} });
    }
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(userId, tx);
      const submission = await this.ownedForUpdate(tx, id, patient);
      if (submission.state !== PatientAssessmentState.IN_PROGRESS) throw immutable();
      await this.access.processingSubmission(tx, submission, patient, context);
      // A retry of an already-persisted snapshot is safe even if its old revision was supplied.
      if (isDeepStrictEqual(submission.answers, answers)) {
        await this.audit(tx, ASSESSMENT_AUDIT_ACTIONS.SUBMISSION_READ, id, context);
        return this.response(submission);
      }
      this.assertRevision(submission, expectedRevision);
      const saved = await tx.patientAssessmentSubmission.update({
        where: { id }, data: { answers: answers as Prisma.InputJsonValue, revision: { increment: 1 } },
      });
      await this.audit(tx, ASSESSMENT_AUDIT_ACTIONS.SUBMISSION_SAVED, id, context);
      return this.response(saved);
    });
  }

  async submit(id: string, idempotencyKey: string | undefined, userId: string, context: AuditContext, expectedRevision?: number) {
    if (!idempotencyKey || idempotencyKey.length > 255) {
      throw new BadRequestException({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'A valid Idempotency-Key is required.', details: {} });
    }
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(userId, tx);
      // Key lock precedes row lock everywhere: equal keys on different attempts must not race.
      await this.lock(tx, `assessment:complete:${patient.id}:${idempotencyKey}`);
      const submission = await this.ownedForUpdate(tx, id, patient);
      const payloadHash = this.hash(submission.answers);
      const replay = await tx.patientAssessmentSubmission.findFirst({
        where: { patientId: patient.id, completionIdempotencyKey: idempotencyKey }, select: { id: true },
      });
      if (replay && replay.id !== id) throw keyReused();
      if (submission.state === PatientAssessmentState.COMPLETE) {
        if (submission.completionIdempotencyKey !== idempotencyKey || submission.completionPayloadHash !== payloadHash) throw immutable();
        await this.audit(tx, ASSESSMENT_AUDIT_ACTIONS.SUBMISSION_RESULT_READ, id, context);
        return this.response(submission);
      }
      if (submission.state !== PatientAssessmentState.IN_PROGRESS) throw immutable();
      await this.access.processingSubmission(tx, submission, patient, context);
      this.assertRevision(submission, expectedRevision);
      let evaluation: ReturnType<typeof scoreAssessment>;
      try { evaluation = scoreAssessment(submission.assessmentVersion.structure, submission.answers); }
      catch (error) {
        if (error instanceof AssessmentAnswerError) throw new UnprocessableEntityException({ code: error.code, message: error.message, details: {} });
        throw error;
      }
      const completed = await tx.patientAssessmentSubmission.update({
        where: { id },
        data: {
          state: PatientAssessmentState.COMPLETE, completedAt: new Date(), revision: { increment: 1 },
          completionIdempotencyKey: idempotencyKey, completionPayloadHash: payloadHash, score: evaluation.score,
          resultSnapshot: { snapshotVersion: 1, answers: evaluation.answers, score: evaluation.score, resultBand: evaluation.resultBand,
            ...ASSESSMENT_SCORING_IDENTITY, questionnaireContentHash: submission.assessmentVersion.contentHash, answerPayloadHash: payloadHash },
        },
      });
      if (submission.assessmentVersion.assessmentKey === 'MEZAJ') {
        await tx.mezajResult.create({ data: {
          patientId: patient.id, assessmentVersionId: completed.assessmentVersionId, assessmentSubmissionId: completed.id,
          resultBandSnapshot: evaluation.resultBand === null ? Prisma.JsonNull : evaluation.resultBand as Prisma.InputJsonValue,
          assessedAt: completed.completedAt!,
        } });
      }
      await this.audit(tx, ASSESSMENT_AUDIT_ACTIONS.SUBMISSION_COMPLETED, id, context);
      return this.response(completed);
    });
  }

  async result(id: string, userId: string, context: AuditContext) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(userId, tx);
      const submission = await tx.patientAssessmentSubmission.findFirst({
        where: { ...accessibleAssessmentWhere, id, patientId: patient.id, state: PatientAssessmentState.COMPLETE, invalidatedAt: null, assessmentVersion: { clinicId: patient.clinicId } },
      });
      if (!submission) throw submissionNotFound();
      await this.audit(tx, ASSESSMENT_AUDIT_ACTIONS.SUBMISSION_RESULT_READ, id, context);
      return this.response(submission);
    });
  }

  async mezaj(userId: string, context: AuditContext) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(userId, tx);
      const result = await tx.mezajResult.findFirst({
        where: { patientId: patient.id, assessmentSubmission: { ...accessibleAssessmentWhere, state: 'COMPLETE', invalidatedAt: null }, assessmentVersion: { clinicId: patient.clinicId } },
        orderBy: [{ assessedAt: 'desc' }, { id: 'desc' }],
      });
      if (!result) throw new NotFoundException({ code: 'MEZAJ_RESULT_NOT_FOUND', message: 'A completed Mezaj assessment result was not found.', details: {} });
      await this.audit(tx, ASSESSMENT_AUDIT_ACTIONS.MEZAJ_RESULT_READ, result.id, context);
      return { id: result.id, assessmentVersionId: result.assessmentVersionId, assessmentSubmissionId: result.assessmentSubmissionId, resultBand: result.resultBandSnapshot as Record<string, unknown>, assessedAt: result.assessedAt };
    });
  }

  private async patient(userId: string, tx: Prisma.TransactionClient) {
    const patient = await tx.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } });
    if (!patient) throw new NotFoundException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'Patient profile was not found.', details: {} });
    return patient;
  }

  private async ownedForUpdate(tx: Prisma.TransactionClient, id: string, patient: { id: string; clinicId: string }) {
    const [context] = await tx.$queryRaw<{ accessGrantId: string | null }[]>(Prisma.sql`SELECT access_grant_id AS "accessGrantId" FROM patient_assessment_submissions WHERE id=${id}::uuid AND patient_id=${patient.id}::uuid`);
    if (context?.accessGrantId) await this.lock(tx, `assessment-consent:${patient.id}`);
    const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM patient_assessment_submissions WHERE id = ${id}::uuid AND patient_id = ${patient.id}::uuid FOR UPDATE
    `);
    if (!rows.length) throw submissionNotFound();
    const submission = await tx.patientAssessmentSubmission.findFirst({
      where: { ...accessibleAssessmentWhere, id, patientId: patient.id, assessmentVersion: { clinicId: patient.clinicId } }, include: { assessmentVersion: true },
    });
    if (!submission) throw submissionNotFound();
    return submission;
  }

  private async lock(tx: Prisma.TransactionClient, resource: string) {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${resource}, 0))`);
  }

  private assertRevision(submission: { revision: number }, expected?: number) {
    if (expected !== undefined && expected !== submission.revision) {
      throw new ConflictException({ code: 'ASSESSMENT_SUBMISSION_REVISION_CONFLICT', message: 'Assessment answers have changed. Reload before saving.', details: { currentRevision: submission.revision } });
    }
  }

  private response(submission: PatientAssessmentSubmission) {
    return { id: submission.id, assessmentVersionId: submission.assessmentVersionId, attemptNumber: submission.attemptNumber,
      revision: submission.revision, state: submission.state, answers: submission.answers as Record<string, unknown>,
      resultSnapshot: submission.resultSnapshot as Record<string, unknown> | null, score: submission.score?.toString() ?? null,
      startedAt: submission.startedAt, completedAt: submission.completedAt };
  }

  private hash(value: Prisma.JsonValue) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

  private async audit(tx: Prisma.TransactionClient, action: string, subjectId: string, context: AuditContext, subjectType = 'PATIENT_ASSESSMENT_SUBMISSION') {
    await tx.auditEvent.create({ data: { action, actorUserId: context.actorUserId, actorSessionId: context.actorSessionId,
      subjectType, subjectId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: {} } });
  }
}
