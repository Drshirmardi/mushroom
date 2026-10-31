import { createHash } from 'node:crypto';

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, ClinicStatus, ConsentPolicyStatus, MedicalIntakeMutationOperation, MedicalIntakeRecordingMode, MedicalIntakeRevisionState, UserStatus } from '../../../generated/prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { normalizeIranianMobile } from '../../identity/domain/phone-number';
import { canonicalizeBirthDate, canonicalizeMedicalDeclaration, canonicalizePatientText, evaluateOnboarding, type MedicalDeclaration } from '../domain/onboarding';
import { PATIENT_AUDIT_ACTIONS } from '../application/patient-audit';
import type { AdminMedicalIntakeCorrectionDto, AdminPatientListQueryDto, CreateAdminPatientDto, PatientReportingQueryDto, UpdateAdminPatientDto } from './admin-patients.dto';

interface AuditContext { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string }
type Revision = Prisma.PatientMedicalIntakeRevisionGetPayload<Record<string, never>>;
type Tx = Prisma.TransactionClient;
type MedicalPolicy = { id: string; clinicId: string; contentHash: string };
const medicalPolicyScope = { policyKey: 'MEDICAL_INTAKE_PROCESSING', locale: 'fa-IR', status: ConsentPolicyStatus.ACTIVE };
const medicalConsentScope = { withdrawnAt: null, policyVersion: { policyKey: medicalPolicyScope.policyKey, locale: medicalPolicyScope.locale } };

const patientNotFound = (): NotFoundException => new NotFoundException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'Patient profile was not found.', details: {} });
const consentRequired = (): ForbiddenException => new ForbiddenException({ code: 'CONSENT_REQUIRED', message: 'A current consent grant is required for medical intake access.', details: {} });
const revisionConflict = (revision: number): ConflictException => new ConflictException({ code: 'MEDICAL_INTAKE_REVISION_CONFLICT', message: 'The medical intake revision is no longer current.', details: { currentRevision: revision } });

const ageYears = (birthDate: Date | null): number | null => {
  if (!birthDate) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthday = new Date(Date.UTC(today.getUTCFullYear(), birthDate.getUTCMonth(), birthDate.getUTCDate()));
  if (birthday > today) age -= 1;
  return age;
};

const displayName = (profile: { firstName: string | null; lastName: string | null } | null): string | null => {
  const value = [profile?.firstName, profile?.lastName].filter((part): part is string => Boolean(part)).join(' ');
  return value || null;
};

@Injectable()
export class AdminPatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminPatientListQueryDto) {
    const search = canonicalizePatientText(query.query ?? '');
    const where: Prisma.PatientProfileWhereInput = search ? {
      OR: [
        { user: { phone: { contains: search } } },
        { user: { userProfile: { is: { firstName: { contains: search, mode: 'insensitive' } } } } },
        { user: { userProfile: { is: { lastName: { contains: search, mode: 'insensitive' } } } } },
      ],
    } : {};
    const [total, patients, policies] = await this.prisma.$transaction([
      this.prisma.patientProfile.count({ where }),
      this.prisma.patientProfile.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { user: { include: { userProfile: true } }, medicalIntake: { include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } } }, consentRecords: { where: medicalConsentScope } } }),
      this.prisma.consentPolicyVersion.findMany({ where: medicalPolicyScope, select: { id: true, clinicId: true, contentHash: true } }),
    ], { isolationLevel: 'RepeatableRead' });
    return {
      items: patients.map((patient) => {
        const revision = patient.medicalIntake?.revisions[0] ?? null;
        const currentPolicies = policies.filter(policy => policy.clinicId === patient.clinicId);
        const activeConsent = this.activeMedicalConsent(patient.consentRecords, currentPolicies);
        const evaluation = evaluateOnboarding({
          firstName: patient.user.userProfile?.firstName, lastName: patient.user.userProfile?.lastName,
          birthDate: revision?.birthDate?.toISOString().slice(0, 10), sexAtBirth: revision?.sexAtBirth,
          allergyReport: revision?.allergyReport as MedicalDeclaration | null, chronicConditionReport: revision?.chronicConditionReport as MedicalDeclaration | null, currentMedicationReport: revision?.currentMedicationReport as MedicalDeclaration | null,
          activeCurrentConsent: Boolean(activeConsent), activeConsentRecordId: activeConsent?.id ?? null,
          completedConsentRecordId: revision?.completedConsentRecordId ?? null, hasConsentDecision: patient.consentRecords.length > 0,
          consentPolicyAvailable: currentPolicies.length > 0, submissionState: patient.medicalIntake?.submissionState ?? null,
          currentRevision: patient.medicalIntake?.currentRevisionNumber ?? 0, completedRevision: patient.medicalIntake?.completedRevisionNumber ?? null,
        });
        return { patientId: patient.id, displayName: displayName(patient.user.userProfile), phone: patient.user.phone, ageYears: ageYears(revision?.birthDate ?? null), accountStatus: patient.user.status, onboardingState: evaluation.state, createdAt: patient.createdAt };
      }),
      page: query.page, pageSize: query.pageSize, total,
    };
  }

  async summary() {
    const clinic = await this.prisma.clinic.findFirst({ where: { status: ClinicStatus.ACTIVE } });
    if (!clinic) throw new ServiceUnavailableException({ code: 'CONSENT_POLICY_NOT_AVAILABLE', message: 'No active clinic is configured.', details: {} });
    const now = new Date();
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: clinic.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (type: string) => date.find((item) => item.type === type)?.value;
    const localMidnight = new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00.000Z`);
    const newPatientsToday = await this.prisma.patientProfile.count({ where: { clinicId: clinic.id, createdAt: { gte: localMidnight } } });
    // This reads every canonical row from PostgreSQL rather than reusing a client list page.
    let page = 1;
    let total = 0;
    let complete = 0;
    do {
      const batch = await this.list({ page, pageSize: 50, query: undefined });
      total = batch.total;
      complete += batch.items.filter((item) => item.onboardingState === 'COMPLETE').length;
      page += 1;
    } while ((page - 1) * 50 < total);
    return { asOf: now, timeZone: clinic.timeZone, newPatientsToday, onboardingCompletePatients: complete, onboardingIncompletePatients: total - complete };
  }

  async report(query: PatientReportingQueryDto) {
    const clinic = await this.reportingClinic(query.clinicId); const range = this.reportingRange(query.from, query.to, clinic.timeZone); const asOf = new Date();
    const [newPatients, patients, policies] = await this.prisma.$transaction([
      this.prisma.patientProfile.count({ where: { clinicId: clinic.id, createdAt: { gte: range.start, lt: range.end } } }),
      this.prisma.patientProfile.findMany({ where: { clinicId: clinic.id }, include: { user: { include: { userProfile: true } }, medicalIntake: { include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } } }, consentRecords: { where: medicalConsentScope } } }),
      this.prisma.consentPolicyVersion.findMany({ where: { clinicId: clinic.id, ...medicalPolicyScope }, select: { id: true, clinicId: true, contentHash: true } }),
    ], { isolationLevel: 'RepeatableRead' });
    const complete = patients.filter((patient) => this.reportingOnboardingComplete(patient, policies)).length;
    return { clinicId: clinic.id, timeZone: clinic.timeZone, from: range.from, to: range.to, asOf, sourceStatus: 'current' as const, newPatients, onboardingComplete: complete, onboardingIncomplete: patients.length - complete };
  }

  async create(body: CreateAdminPatientDto, context: AuditContext) {
    const phone = normalizeIranianMobile(body.phone);
    const clinic = await this.prisma.clinic.findFirst({ where: { status: ClinicStatus.ACTIVE }, select: { id: true } });
    const patientRole = await this.prisma.role.findUnique({ where: { code: 'PATIENT' }, select: { id: true } });
    if (!clinic) throw new ServiceUnavailableException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'No active clinic is configured.', details: {} });
    if (!patientRole) throw new ServiceUnavailableException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'Patient role is not configured.', details: {} });
    try {
      const user = await this.prisma.user.create({ data: { phone, status: UserStatus.ACTIVE, roles: { create: { roleId: patientRole.id, assignedByUserId: context.actorUserId } }, userProfile: { create: this.profileData(body) }, patientProfile: { create: { clinicId: clinic.id } } }, include: { patientProfile: true, userProfile: true } });
      return { patientId: user.patientProfile?.id, displayName: displayName(user.userProfile), phone: user.phone, accountStatus: user.status, createdAt: user.createdAt };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException({ code: 'PHONE_ALREADY_REGISTERED', message: 'An account with this phone number already exists.', details: {} });
      throw error;
    }
  }

  async get(patientId: string, context: AuditContext) {
    return this.prisma.$transaction(async tx => {
      const patient = await tx.patientProfile.findUnique({ where: { id: patientId }, include: { user: { include: { userProfile: true } }, assessmentSubmissions: { where: { accessGrantId: null, OR: [{ entryPatientId: null }, { entryOrigin: { paidIntentId: null } }] }, include: { assessmentVersion: true }, orderBy: { startedAt: 'desc' } } } });
      if (!patient) throw patientNotFound();
      const { policy: activePolicy, consent } = await this.currentMedicalAuthorization(tx, patientId, patient.clinicId);
      const medicalIntake = await tx.patientMedicalIntake.findUnique({ where: { patientId }, include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } } });
      const revision = medicalIntake?.revisions[0] ?? null;
      const medical = revision && consent ? await this.readMedical(tx, patient.id, revision, context) : { status: revision ? 'CONSENT_REQUIRED' : 'NOT_STARTED', value: null };
      const assessments = patient.assessmentSubmissions.map((submission) => ({ submissionId: submission.id, assessmentVersionId: submission.assessmentVersionId, assessmentTitle: submission.assessmentVersion.title, state: submission.state, score: submission.score?.toString() ?? null, resultSnapshot: submission.resultSnapshot, completedAt: submission.completedAt }));
      if (assessments.length) await Promise.all(assessments.map((assessment) => tx.auditEvent.create({ data: { action: 'ADMIN_ASSESSMENT_SUBMISSION_READ', actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'PATIENT_ASSESSMENT_SUBMISSION', subjectId: assessment.submissionId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: { source: 'ADMIN_PATIENT_DETAIL' } } })));
      return { patientId: patient.id, profile: { displayName: displayName(patient.user.userProfile), phone: patient.user.phone, accountStatus: patient.user.status, firstName: patient.user.userProfile?.firstName ?? null, lastName: patient.user.userProfile?.lastName ?? null, email: patient.user.userProfile?.email ?? null, cityName: patient.user.userProfile?.cityName ?? null }, consent: { active: Boolean(consent), policyVersionId: activePolicy?.id ?? null, consentRecordId: consent?.id ?? null }, intake: { assignedSchemaVersion: medicalIntake?.assignedSchemaVersion ?? null, currentRevision: medicalIntake?.currentRevisionNumber ?? 0, provenance: 'PATIENT_SELF_REPORTED', ...medical }, assessments };
    }, { timeout: 15_000 });
  }

  async update(patientId: string, body: UpdateAdminPatientDto, _context: AuditContext) {
    const patient = await this.prisma.patientProfile.findUnique({ where: { id: patientId }, select: { userId: true } });
    if (!patient) throw patientNotFound();
    const profile = await this.prisma.userProfile.upsert({ where: { userId: patient.userId }, create: { userId: patient.userId, ...this.profileData(body) }, update: this.profileData(body) });
    return { firstName: profile.firstName, lastName: profile.lastName, email: profile.email, cityName: profile.cityName, updatedAt: profile.updatedAt };
  }

  async correctIntake(patientId: string, body: AdminMedicalIntakeCorrectionDto, idempotencyKey: string | undefined, context: AuditContext) {
    if (!idempotencyKey || idempotencyKey.length > 255) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'A valid Idempotency-Key is required.', details: {} });
    const correctionReason = canonicalizePatientText(body.correctionReason);
    if (!correctionReason) throw new UnprocessableEntityException({ code: 'INVALID_MEDICAL_DECLARATION', message: 'Correction reason must not be blank.', details: {} });
    const patch = this.correctionPatch(body);
    const operationHash = this.correctionOperationHash(body.expectedRevision, correctionReason, patch);
    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patientProfile.findUnique({ where: { id: patientId }, select: { id: true, clinicId: true } });
      if (!patient) throw patientNotFound();
      const { consent } = await this.currentMedicalAuthorization(tx, patientId, patient.clinicId);
      if (!consent) throw consentRequired();
      await tx.$queryRaw(Prisma.sql`SELECT id FROM patient_medical_intakes WHERE patient_id=${patientId}::uuid AND clinic_id=${patient.clinicId}::uuid FOR UPDATE`);
      const intake = await tx.patientMedicalIntake.findUnique({ where: { patientId }, include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } } });
      if (!intake) throw revisionConflict(0);
      const replay = await tx.patientMedicalIntakeRevision.findFirst({ where: { intakeId: intake.id, mutationOperation: MedicalIntakeMutationOperation.ADMIN_CORRECTION, mutationKey: idempotencyKey } });
      if (replay) {
        if (replay.payloadHash !== operationHash) throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'Idempotency key was already used for another request.', details: {} });
        return this.revisionResponse(replay);
      }
      if (intake.currentRevisionNumber !== body.expectedRevision) throw revisionConflict(intake.currentRevisionNumber);
      const current = intake.revisions[0];
      if (!current) throw revisionConflict(0);
      const snapshot = { ...current, ...patch };
      const created = await tx.patientMedicalIntakeRevision.create({ data: { intakeId: intake.id, revisionNumber: intake.currentRevisionNumber + 1, assignedSchemaVersion: intake.assignedSchemaVersion, revisionState: MedicalIntakeRevisionState.DRAFT, birthDate: snapshot.birthDate, sexAtBirth: snapshot.sexAtBirth, heightCm: snapshot.heightCm, weightKg: snapshot.weightKg, bloodType: snapshot.bloodType, allergyReport: this.jsonValue(snapshot.allergyReport), chronicConditionReport: this.jsonValue(snapshot.chronicConditionReport), currentMedicationReport: this.jsonValue(snapshot.currentMedicationReport), sleepDurationBand: snapshot.sleepDurationBand, exerciseFrequency: snapshot.exerciseFrequency, stressLevel: snapshot.stressLevel, tobaccoUse: snapshot.tobaccoUse, dataOrigin: current.dataOrigin, recordingMode: MedicalIntakeRecordingMode.ADMIN_ON_BEHALF_CORRECTION, reportedPatientId: patient.id, recordedByUserId: context.actorUserId, correctionReason, mutationOperation: MedicalIntakeMutationOperation.ADMIN_CORRECTION, mutationKey: idempotencyKey, payloadHash: operationHash } });
      await tx.patientMedicalIntake.update({ where: { id: intake.id }, data: { currentRevisionNumber: created.revisionNumber, submissionState: 'DRAFT' } });
      await tx.auditEvent.create({ data: { action: PATIENT_AUDIT_ACTIONS.ADMIN_MEDICAL_INTAKE_CORRECTED, actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'PATIENT_MEDICAL_INTAKE', subjectId: intake.id, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: { revisionNumber: created.revisionNumber, recordingMode: 'ADMIN_ON_BEHALF_CORRECTION', changedFieldNames: Object.keys(patch) } } });
      return this.revisionResponse(created);
    });
  }

  private async readMedical(tx: Tx, patientId: string, revision: Revision, context: AuditContext) {
    await tx.auditEvent.create({ data: { action: PATIENT_AUDIT_ACTIONS.ADMIN_MEDICAL_INTAKE_READ, actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'PATIENT_MEDICAL_INTAKE', subjectId: revision.intakeId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: { revisionNumber: revision.revisionNumber, recordingMode: revision.recordingMode } } });
    return { status: 'AVAILABLE', value: this.revisionResponse(revision), patientId };
  }

  private activeMedicalConsent<T extends { id: string; policyVersionId: string; contentHash: string }>(records: T[], policies: MedicalPolicy[]): T | null {
    return records.find(record => policies.some(policy => policy.id === record.policyVersionId && policy.contentHash === record.contentHash)) ?? null;
  }

  private async currentMedicalAuthorization(tx: Tx, patientId: string, clinicId: string) {
    // Match native patient writes: current medical policy, then acceptance, then intake.
    const [policy] = await tx.$queryRaw<MedicalPolicy[]>(Prisma.sql`SELECT id,clinic_id AS "clinicId",content_hash AS "contentHash" FROM consent_policy_versions WHERE clinic_id=${clinicId}::uuid AND policy_key=${medicalPolicyScope.policyKey} AND locale=${medicalPolicyScope.locale} AND status='ACTIVE' FOR SHARE`);
    if (!policy) return { policy: null, consent: null };
    const [consent] = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM patient_consent_records WHERE patient_id=${patientId}::uuid AND policy_version_id=${policy.id}::uuid AND content_hash=${policy.contentHash} AND withdrawn_at IS NULL FOR SHARE`);
    return { policy, consent: consent ?? null };
  }

  private revisionResponse(revision: Revision) { return { revisionNumber: revision.revisionNumber, revisionState: revision.revisionState, birthDate: revision.birthDate?.toISOString().slice(0, 10) ?? null, sexAtBirth: revision.sexAtBirth, heightCm: revision.heightCm, weightKg: revision.weightKg?.toString() ?? null, bloodType: revision.bloodType, allergyReport: revision.allergyReport, chronicConditionReport: revision.chronicConditionReport, currentMedicationReport: revision.currentMedicationReport, sleepDurationBand: revision.sleepDurationBand, exerciseFrequency: revision.exerciseFrequency, stressLevel: revision.stressLevel, tobaccoUse: revision.tobaccoUse, provenance: 'PATIENT_SELF_REPORTED' }; }
  private profileData(body: CreateAdminPatientDto | UpdateAdminPatientDto) { return Object.fromEntries(Object.entries({ firstName: body.firstName === undefined ? undefined : canonicalizePatientText(body.firstName ?? ''), lastName: body.lastName === undefined ? undefined : canonicalizePatientText(body.lastName ?? ''), email: body.email === undefined ? undefined : canonicalizePatientText(body.email ?? ''), cityName: body.cityName === undefined ? undefined : canonicalizePatientText(body.cityName ?? '') }).filter(([, value]) => value !== undefined)); }
  private correctionPatch(body: AdminMedicalIntakeCorrectionDto): Record<string, unknown> { const raw = { birthDate: body.birthDate === undefined ? undefined : body.birthDate === null ? null : new Date(`${canonicalizeBirthDate(body.birthDate)}T00:00:00.000Z`), sexAtBirth: body.sexAtBirth, heightCm: body.heightCm, weightKg: body.weightKg, bloodType: body.bloodType, allergyReport: body.allergyReport === undefined ? undefined : canonicalizeMedicalDeclaration(body.allergyReport), chronicConditionReport: body.chronicConditionReport === undefined ? undefined : canonicalizeMedicalDeclaration(body.chronicConditionReport), currentMedicationReport: body.currentMedicationReport === undefined ? undefined : canonicalizeMedicalDeclaration(body.currentMedicationReport), sleepDurationBand: body.sleepDurationBand, exerciseFrequency: body.exerciseFrequency, stressLevel: body.stressLevel, tobaccoUse: body.tobaccoUse }; return Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== undefined)); }
  private jsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull { return value === null || value === undefined ? Prisma.DbNull : value as Prisma.InputJsonValue; }
  private async reportingClinic(clinicId?: string) { const clinic = await this.prisma.clinic.findFirst({ where: { status: ClinicStatus.ACTIVE, ...(clinicId ? { id: clinicId } : {}) }, select: { id: true, timeZone: true } }); if (!clinic) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Clinic is unavailable.', details: {} }); return clinic; }
  private reportingRange(fromValue: string | undefined, toValue: string | undefined, timeZone: string) { const today = this.localDay(new Date(), timeZone); const initial = new Date(`${today}T00:00:00.000Z`); initial.setUTCDate(initial.getUTCDate() - 29); const from = fromValue ?? initial.toISOString().slice(0, 10); const to = toValue ?? today; this.validReportingDate(from); this.validReportingDate(to); if (from > to) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Date range is invalid.', details: {} }); const days = Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000) + 1; if (days > 366) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Date range exceeds 366 days.', details: {} }); const [year, month, day] = from.split('-').map(Number); const end = new Date(`${to}T00:00:00.000Z`); end.setUTCDate(end.getUTCDate() + 1); return { from, to, start: this.zonedMidnight(year, month, day, timeZone), end: this.zonedMidnight(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate(), timeZone) }; }
  private validReportingDate(value: string) { const date = new Date(`${value}T00:00:00.000Z`); if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Date is invalid.', details: {} }); }
  private localDay(value: Date, timeZone: string) { const parts = new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value); const part = (kind: string) => parts.find((item) => item.type === kind)?.value; return `${part('year')}-${part('month')}-${part('day')}`; }
  private zonedMidnight(year: number, month: number, day: number, timeZone: string) { let value = Date.UTC(year, month - 1, day); for (let attempt = 0; attempt < 3; attempt += 1) { const parts = new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value)); const part = (kind: string) => Number(parts.find((item) => item.type === kind)?.value); value += Date.UTC(year, month - 1, day) - Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second')); } return new Date(value); }
  private reportingOnboardingComplete(patient: { user: { userProfile: { firstName: string | null; lastName: string | null } | null }; medicalIntake: { submissionState: 'DRAFT' | 'COMPLETE'; currentRevisionNumber: number; completedRevisionNumber: number | null; revisions: Revision[] } | null; consentRecords: { id: string; policyVersionId: string; contentHash: string }[] }, policies: MedicalPolicy[]) { const revision = patient.medicalIntake?.revisions[0] ?? null; const activeConsent = this.activeMedicalConsent(patient.consentRecords, policies); return evaluateOnboarding({ firstName: patient.user.userProfile?.firstName, lastName: patient.user.userProfile?.lastName, birthDate: revision?.birthDate?.toISOString().slice(0, 10), sexAtBirth: revision?.sexAtBirth, allergyReport: revision?.allergyReport as MedicalDeclaration | null, chronicConditionReport: revision?.chronicConditionReport as MedicalDeclaration | null, currentMedicationReport: revision?.currentMedicationReport as MedicalDeclaration | null, activeCurrentConsent: Boolean(activeConsent), activeConsentRecordId: activeConsent?.id ?? null, completedConsentRecordId: revision?.completedConsentRecordId ?? null, hasConsentDecision: patient.consentRecords.length > 0, consentPolicyAvailable: policies.length > 0, submissionState: patient.medicalIntake?.submissionState ?? null, currentRevision: patient.medicalIntake?.currentRevisionNumber ?? 0, completedRevision: patient.medicalIntake?.completedRevisionNumber ?? null }).state === 'COMPLETE'; }
  private correctionOperationHash(expectedRevision: number, correctionReason: string, patch: Record<string, unknown>): string { return this.payloadHash({ expectedRevision, correctionReason, patch }); }
  private payloadHash(value: unknown): string { return createHash('sha256').update(JSON.stringify(value, (_key, item) => item instanceof Date ? item.toISOString() : item)).digest('hex'); }
}
