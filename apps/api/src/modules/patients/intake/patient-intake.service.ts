import { createHash } from 'node:crypto';
import { intakeSnapshot } from './intake-snapshot';

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  canonicalizeBirthDate,
  canonicalizeMedicalDeclaration,
  type MedicalDeclaration,
  PatientDomainError,
} from '../domain/onboarding';
import { PATIENT_AUDIT_ACTIONS } from '../application/patient-audit';
import type {
  AcceptConsentDto,
  CompleteIntakeDto,
  IntakeSnapshotDto,
  SaveIntakeDraftDto,
} from './presentation/http/dto/intake.dto';

type AuditContext = { requestId: string; ipAddress: string; actorUserId: string; actorSessionId: string };
type Tx = Prisma.TransactionClient;

const policyKey = 'MEDICAL_INTAKE_PROCESSING';
const locale = 'fa-IR';
const idempotencyHeader = (value: string | string[] | undefined): string => {
  const key = Array.isArray(value) ? value[0] : value;
  if (!key || key.length > 255 || key.trim() === '') {
    throw new UnprocessableEntityException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'A valid Idempotency-Key is required.', details: {} });
  }
  return key;
};
const error = (status: typeof ConflictException, code: string, message: string, details: Record<string, unknown> = {}) => new status({ code, message, details });
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

@Injectable()
export class PatientIntakeService {
  constructor(private readonly prisma: PrismaService) {}

  async getPolicy(userId: string, audit: AuditContext) {
    return this.prisma.$transaction(async (tx) => {
      const patient = await this.patient(tx, userId);
      const policy = await tx.consentPolicyVersion.findFirst({
        where: { clinicId: patient.clinicId, policyKey, locale, status: 'ACTIVE' },
        orderBy: { versionNumber: 'desc' },
      });
      if (!policy) throw error(ServiceUnavailableException, 'CONSENT_POLICY_NOT_AVAILABLE', 'No current consent policy is available.');
      const activeConsent = await tx.patientConsentRecord.findFirst({
        where: { patientId: patient.id, policyVersionId: policy.id, withdrawnAt: null },
        select: { id: true, acceptedAt: true },
      });
      await this.audit(tx, audit, PATIENT_AUDIT_ACTIONS.CONSENT_READ, 'PATIENT', patient.id, { policyVersionId: policy.id });
      return { id: policy.id, policyKey: policy.policyKey, versionNumber: policy.versionNumber, locale: policy.locale, title: policy.title, body: policy.body, contentHash: policy.contentHash, acceptedConsentRecordId: activeConsent?.id ?? null, acceptedAt: activeConsent?.acceptedAt ?? null };
    });
  }

  async accept(userId: string, body: AcceptConsentDto, keyValue: string | string[] | undefined, audit: AuditContext) {
    const key = idempotencyHeader(keyValue);
    return this.prisma.$transaction(async (tx) => {
      const patient = await this.patient(tx, userId);
      await this.lockActivePolicy(tx, patient.clinicId);
      const policy = await tx.consentPolicyVersion.findFirst({ where: { clinicId: patient.clinicId, policyKey, locale, status: 'ACTIVE' }, orderBy: { versionNumber: 'desc' } });
      if (!policy) throw error(ServiceUnavailableException, 'CONSENT_POLICY_NOT_AVAILABLE', 'No current consent policy is available.');
      if (policy.id !== body.policyVersionId || policy.contentHash !== body.contentHash) throw error(ConflictException, 'CONSENT_POLICY_STALE', 'Consent policy is no longer current.');
      const prior = await tx.patientConsentRecord.findFirst({ where: { patientId: patient.id, acceptanceIdempotencyKey: key } });
      if (prior) {
        if (prior.policyVersionId !== policy.id || prior.contentHash !== policy.contentHash) throw error(ConflictException, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency key was already used for another request.');
        return this.consentResponse(prior);
      }
      const active = await tx.patientConsentRecord.findFirst({ where: { patientId: patient.id, policyVersionId: policy.id, withdrawnAt: null } });
      if (active) return this.consentResponse(active);
      const consent = await tx.patientConsentRecord.create({ data: { patientId: patient.id, policyVersionId: policy.id, contentHash: policy.contentHash, acceptedByUserId: userId, acceptedBySessionId: audit.actorSessionId, acceptanceIdempotencyKey: key, acceptanceRequestId: audit.requestId } });
      await this.audit(tx, audit, PATIENT_AUDIT_ACTIONS.CONSENT_ACCEPTED, 'PATIENT_CONSENT_RECORD', consent.id, { policyVersionId: policy.id });
      return this.consentResponse(consent);
    }, { isolationLevel: 'Serializable' });
  }

  async withdraw(userId: string, consentId: string, keyValue: string | string[] | undefined, audit: AuditContext) {
    const key = idempotencyHeader(keyValue);
    return this.prisma.$transaction(async (tx) => {
      const patient = await this.patient(tx, userId);
      await this.lockActivePolicy(tx, patient.clinicId);
      const replay = await tx.patientConsentRecord.findFirst({
        where: { patientId: patient.id, withdrawalIdempotencyKey: key },
      });
      if (replay) {
        if (replay.id === consentId) return this.consentResponse(replay);
        throw error(ConflictException, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency key was already used for another request.');
      }
      const current = await tx.patientConsentRecord.findFirst({ where: { id: consentId, patientId: patient.id } });
      if (!current || current.withdrawnAt) {
        throw error(ConflictException, 'CONSENT_RECORD_NOT_ACTIVE', 'Consent record is not active.');
      }
      const policy = await tx.consentPolicyVersion.findFirst({ where: { id: current.policyVersionId, clinicId: patient.clinicId, policyKey, locale, status: 'ACTIVE' } });
      if (!policy) throw error(ConflictException, 'CONSENT_RECORD_NOT_ACTIVE', 'Consent record is not current.');
      const withdrawn = await tx.patientConsentRecord.update({ where: { id: current.id }, data: { withdrawnAt: new Date(), withdrawnByUserId: userId, withdrawnBySessionId: audit.actorSessionId, withdrawalIdempotencyKey: key, withdrawalRequestId: audit.requestId } });
      await this.audit(tx, audit, PATIENT_AUDIT_ACTIONS.CONSENT_WITHDRAWN, 'PATIENT_CONSENT_RECORD', withdrawn.id, { policyVersionId: policy.id });
      return this.consentResponse(withdrawn);
    }, { isolationLevel: 'Serializable' });
  }

  async getIntake(userId: string, audit: AuditContext) {
    return this.prisma.$transaction(async (tx) => {
      const patient = await this.patient(tx, userId);
      const intake = await tx.patientMedicalIntake.findUnique({ where: { patientId: patient.id }, include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } } });
      if (!intake) return { submissionState: null, currentRevision: 0, completedRevision: null, snapshot: null };
      const revision = intake.revisions[0];
      await this.audit(tx, audit, PATIENT_AUDIT_ACTIONS.MEDICAL_INTAKE_READ, 'PATIENT_MEDICAL_INTAKE', intake.id, { revisionNumber: intake.currentRevisionNumber });
      return { submissionState: intake.submissionState, currentRevision: intake.currentRevisionNumber, completedRevision: intake.completedRevisionNumber, snapshot: revision ? this.snapshot(revision) : null };
    });
  }

  async saveDraft(userId: string, body: SaveIntakeDraftDto, audit: AuditContext) {
    const snapshot = this.canonicalSnapshot(body);
    return this.prisma.$transaction(async (tx) => {
      const patient = await this.patient(tx, userId);
      let intake = await tx.patientMedicalIntake.findUnique({ where: { patientId: patient.id }, include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } } });
      const current = intake?.currentRevisionNumber ?? 0;
      if (current !== body.expectedRevision) {
        const last = intake?.revisions[0];
        if (last && last.payloadHash === hash(snapshot)) return this.intakeResponse(intake!, last);
        throw error(ConflictException, 'MEDICAL_INTAKE_REVISION_CONFLICT', 'Intake revision does not match.', { currentRevision: current });
      }
      if (intake?.revisions[0]?.payloadHash === hash(snapshot)) return this.intakeResponse(intake, intake.revisions[0]);
      if (!intake) intake = await tx.patientMedicalIntake.create({ data: { patientId: patient.id, clinicId: patient.clinicId } , include: { revisions: true } });
      const revisionNumber = current + 1;
      const revision = await tx.patientMedicalIntakeRevision.create({ data: { ...snapshot, intakeId: intake.id, revisionNumber, assignedSchemaVersion: intake.assignedSchemaVersion, revisionState: 'DRAFT', dataOrigin: 'PATIENT_SELF_REPORTED', recordingMode: 'PATIENT_ENTRY', reportedPatientId: patient.id, recordedByUserId: userId, payloadHash: hash(snapshot) } });
      const updated = await tx.patientMedicalIntake.update({ where: { id: intake.id }, data: { currentRevisionNumber: revisionNumber, submissionState: 'DRAFT' } });
      await this.audit(tx, audit, PATIENT_AUDIT_ACTIONS.MEDICAL_INTAKE_UPDATED, 'PATIENT_MEDICAL_INTAKE', updated.id, { revisionNumber, recordingMode: 'PATIENT_ENTRY' });
      return this.intakeResponse(updated, revision);
    }, { isolationLevel: 'Serializable' });
  }

  async complete(userId: string, body: CompleteIntakeDto, keyValue: string | string[] | undefined, audit: AuditContext) {
    const key = idempotencyHeader(keyValue);
    return this.prisma.$transaction(async (tx) => {
      const patient = await this.patient(tx, userId);
      const intake = await tx.patientMedicalIntake.findUnique({ where: { patientId: patient.id }, include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } } });
      if (!intake || !intake.revisions[0]) throw error(UnprocessableEntityException, 'MEDICAL_INTAKE_INCOMPLETE', 'Medical intake is incomplete.', { missingFields: ['birthDate', 'allergyReport', 'chronicConditionReport', 'currentMedicationReport'] });
      const replay = await tx.patientMedicalIntakeRevision.findFirst({ where: { intakeId: intake.id, mutationOperation: 'COMPLETE', mutationKey: key } });
      if (replay) {
        if (body.expectedRevision === replay.revisionNumber - 1) {
          return this.intakeResponse(intake, replay);
        }
        throw error(ConflictException, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency key was already used for another request.');
      }
      if (intake.currentRevisionNumber !== body.expectedRevision) throw error(ConflictException, 'MEDICAL_INTAKE_REVISION_CONFLICT', 'Intake revision does not match.', { currentRevision: intake.currentRevisionNumber });
      const snapshot = this.snapshot(intake.revisions[0]);
      const missingFields = this.missingFields(snapshot);
      if (missingFields.length) throw error(UnprocessableEntityException, 'MEDICAL_INTAKE_INCOMPLETE', 'Medical intake is incomplete.', { missingFields });
      // Preserve an existing processing grant for separately authorized clinical workflows.
      // Self-report completion still succeeds when no policy or grant exists.
      const consent = await this.optionalProcessingConsent(tx, patient.id, patient.clinicId);
      const revisionNumber = intake.currentRevisionNumber + 1;
      const complete = await tx.patientMedicalIntakeRevision.create({ data: { ...snapshot, intakeId: intake.id, revisionNumber, assignedSchemaVersion: intake.assignedSchemaVersion, revisionState: 'COMPLETE', dataOrigin: 'PATIENT_SELF_REPORTED', recordingMode: 'PATIENT_ENTRY', reportedPatientId: patient.id, recordedByUserId: userId, completedAt: new Date(), completedConsentRecordId: consent?.id ?? null, mutationOperation: 'COMPLETE', mutationKey: key, payloadHash: hash(snapshot) } });
      const updated = await tx.patientMedicalIntake.update({ where: { id: intake.id }, data: { currentRevisionNumber: revisionNumber, completedRevisionNumber: revisionNumber, submissionState: 'COMPLETE' } });
      await this.audit(tx, audit, PATIENT_AUDIT_ACTIONS.MEDICAL_INTAKE_COMPLETED, 'PATIENT_MEDICAL_INTAKE', updated.id, { revisionNumber });
      return this.intakeResponse(updated, complete);
    }, { isolationLevel: 'Serializable' });
  }

  private async patient(tx: Tx, userId: string) { const patient = await tx.patientProfile.findUnique({ where: { userId } }); if (!patient) throw error(ForbiddenException, 'PATIENT_PROFILE_NOT_FOUND', 'Patient profile is unavailable.'); return patient; }
  private async optionalProcessingConsent(tx: Tx, patientId: string, clinicId: string) {
    await this.lockActivePolicy(tx, clinicId);
    const policy = await tx.consentPolicyVersion.findFirst({ where: { clinicId, policyKey, locale, status: 'ACTIVE' }, orderBy: { versionNumber: 'desc' } });
    if (!policy || !policy.activatedAt || createHash('sha256').update(policy.body).digest('hex') !== policy.contentHash) return null;
    await tx.$queryRaw`SELECT id FROM patient_consent_records WHERE patient_id = ${patientId}::uuid AND policy_version_id = ${policy.id}::uuid AND withdrawn_at IS NULL FOR UPDATE`;
    return tx.patientConsentRecord.findFirst({ where: { patientId, policyVersionId: policy.id, contentHash: policy.contentHash, source: 'PATIENT_APP', withdrawnAt: null } });
  }
  private async lockActivePolicy(tx: Tx, clinicId: string) { await tx.$queryRaw`SELECT id FROM consent_policy_versions WHERE clinic_id = ${clinicId}::uuid AND policy_key = ${policyKey} AND locale = ${locale} AND status = 'ACTIVE' FOR UPDATE`; }
  private async audit(tx: Tx, audit: AuditContext, action: string, subjectType: string, subjectId: string, metadata: Record<string, unknown>) { await tx.auditEvent.create({ data: { action, actorUserId: audit.actorUserId, actorSessionId: audit.actorSessionId, subjectType, subjectId, requestId: audit.requestId.slice(0, 128), ipAddress: audit.ipAddress, metadata: metadata as Prisma.InputJsonObject } }); }
  private consentResponse(consent: { id: string; policyVersionId: string; contentHash: string; acceptedAt: Date; withdrawnAt: Date | null }) { return { id: consent.id, policyVersionId: consent.policyVersionId, contentHash: consent.contentHash, acceptedAt: consent.acceptedAt, withdrawnAt: consent.withdrawnAt }; }
  private intakeResponse(intake: { submissionState: unknown; currentRevisionNumber: number; completedRevisionNumber: number | null }, revision: { [key: string]: unknown }) { return { submissionState: intake.submissionState, currentRevision: intake.currentRevisionNumber, completedRevision: intake.completedRevisionNumber, snapshot: this.snapshot(revision) }; }
  private snapshot(revision: Record<string, unknown>) { return intakeSnapshot(revision); }
  private canonicalSnapshot(body: IntakeSnapshotDto) { try { const reports = ['allergyReport', 'chronicConditionReport', 'currentMedicationReport'] as const; const result: Record<string, unknown> = this.snapshot(body as unknown as Record<string, unknown>); if (result.birthDate) result.birthDate = new Date(`${canonicalizeBirthDate(String(result.birthDate))}T00:00:00.000Z`); for (const report of reports) result[report] = canonicalizeMedicalDeclaration(result[report] as MedicalDeclaration | null | undefined); return result; } catch (cause) { if (cause instanceof PatientDomainError) throw error(UnprocessableEntityException, cause.code, cause.message, cause.code === 'MEDICAL_INTAKE_INCOMPLETE' ? { missingFields: [] } : {}); throw cause; } }
  private missingFields(snapshot: Record<string, unknown>) { return ['birthDate', 'allergyReport', 'chronicConditionReport', 'currentMedicationReport'].filter((field) => snapshot[field] === null || snapshot[field] === undefined); }
}
