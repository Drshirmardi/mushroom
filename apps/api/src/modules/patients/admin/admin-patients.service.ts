import { createHash } from 'node:crypto';

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, ClinicStatus, ConsentPolicyStatus, MedicalIntakeMutationOperation, MedicalIntakeRecordingMode, MedicalIntakeRevisionState, UserStatus } from '../../../generated/prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { normalizeIranianMobile } from '../../identity/domain/phone-number';
import { canonicalizeBirthDate, canonicalizeMedicalDeclaration, canonicalizePatientText, evaluateOnboarding, type MedicalDeclaration } from '../domain/onboarding';
import { PATIENT_AUDIT_ACTIONS } from '../application/patient-audit';
import type { AdminMedicalIntakeCorrectionDto, AdminPatientListQueryDto, CreateAdminPatientDto, UpdateAdminPatientDto } from './admin-patients.dto';

interface AuditContext { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string }
type Revision = Prisma.PatientMedicalIntakeRevisionGetPayload<Record<string, never>>;

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
    const [total, patients] = await this.prisma.$transaction([
      this.prisma.patientProfile.count({ where }),
      this.prisma.patientProfile.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { user: { include: { userProfile: true } }, medicalIntake: { include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } } }, consentRecords: { where: { withdrawnAt: null }, include: { policyVersion: true } } } }),
    ]);
    const activePolicyIds = new Set((await this.prisma.consentPolicyVersion.findMany({ where: { status: ConsentPolicyStatus.ACTIVE }, select: { id: true } })).map(({ id }) => id));
    return {
      items: patients.map((patient) => {
        const revision = patient.medicalIntake?.revisions[0] ?? null;
        const activeConsent = patient.consentRecords.find((record) => activePolicyIds.has(record.policyVersionId)) ?? null;
        const evaluation = evaluateOnboarding({
          firstName: patient.user.userProfile?.firstName, lastName: patient.user.userProfile?.lastName,
          birthDate: revision?.birthDate?.toISOString().slice(0, 10), sexAtBirth: revision?.sexAtBirth,
          allergyReport: revision?.allergyReport as MedicalDeclaration | null, chronicConditionReport: revision?.chronicConditionReport as MedicalDeclaration | null, currentMedicationReport: revision?.currentMedicationReport as MedicalDeclaration | null,
          activeCurrentConsent: Boolean(activeConsent), activeConsentRecordId: activeConsent?.id ?? null,
          completedConsentRecordId: revision?.completedConsentRecordId ?? null, hasConsentDecision: patient.consentRecords.length > 0,
          consentPolicyAvailable: activePolicyIds.size > 0, submissionState: patient.medicalIntake?.submissionState ?? null,
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
    const patient = await this.prisma.patientProfile.findUnique({ where: { id: patientId }, include: { user: { include: { userProfile: true } }, medicalIntake: { include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } } }, consentRecords: { where: { withdrawnAt: null }, include: { policyVersion: true } }, assessmentSubmissions: { include: { assessmentVersion: true }, orderBy: { startedAt: 'desc' } } } });
    if (!patient) throw patientNotFound();
    const revision = patient.medicalIntake?.revisions[0] ?? null;
    const activePolicy = await this.prisma.consentPolicyVersion.findFirst({ where: { clinicId: patient.clinicId, status: ConsentPolicyStatus.ACTIVE }, select: { id: true } });
    const consent = activePolicy ? patient.consentRecords.find((record) => record.policyVersionId === activePolicy.id) ?? null : null;
    const medical = revision && consent ? await this.readMedical(patient.id, revision, context) : { status: revision ? 'CONSENT_REQUIRED' : 'NOT_STARTED', value: null };
    const assessments = patient.assessmentSubmissions.map((submission) => ({ submissionId: submission.id, assessmentVersionId: submission.assessmentVersionId, assessmentTitle: submission.assessmentVersion.title, state: submission.state, score: submission.score?.toString() ?? null, resultSnapshot: submission.resultSnapshot, completedAt: submission.completedAt }));
    if (assessments.length) await Promise.all(assessments.map((assessment) => this.prisma.auditEvent.create({ data: { action: 'ADMIN_ASSESSMENT_SUBMISSION_READ', actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'PATIENT_ASSESSMENT_SUBMISSION', subjectId: assessment.submissionId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: { source: 'ADMIN_PATIENT_DETAIL' } } })));
    return { patientId: patient.id, profile: { displayName: displayName(patient.user.userProfile), phone: patient.user.phone, accountStatus: patient.user.status, firstName: patient.user.userProfile?.firstName ?? null, lastName: patient.user.userProfile?.lastName ?? null, email: patient.user.userProfile?.email ?? null, cityName: patient.user.userProfile?.cityName ?? null }, consent: { active: Boolean(consent), policyVersionId: activePolicy?.id ?? null, consentRecordId: consent?.id ?? null }, intake: { assignedSchemaVersion: patient.medicalIntake?.assignedSchemaVersion ?? null, currentRevision: patient.medicalIntake?.currentRevisionNumber ?? 0, provenance: 'PATIENT_SELF_REPORTED', ...medical }, assessments };
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
      const patient = await tx.patientProfile.findUnique({ where: { id: patientId }, include: { medicalIntake: { include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } } } } });
      if (!patient) throw patientNotFound();
      const policy = await tx.consentPolicyVersion.findFirst({ where: { clinicId: patient.clinicId, status: ConsentPolicyStatus.ACTIVE }, select: { id: true } });
      const consent = policy ? await tx.patientConsentRecord.findFirst({ where: { patientId, policyVersionId: policy.id, withdrawnAt: null }, select: { id: true } }) : null;
      if (!consent) throw consentRequired();
      const intake = patient.medicalIntake;
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

  private async readMedical(patientId: string, revision: Revision, context: AuditContext) {
    await this.prisma.auditEvent.create({ data: { action: PATIENT_AUDIT_ACTIONS.ADMIN_MEDICAL_INTAKE_READ, actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'PATIENT_MEDICAL_INTAKE', subjectId: revision.intakeId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: { revisionNumber: revision.revisionNumber, recordingMode: revision.recordingMode } } });
    return { status: 'AVAILABLE', value: this.revisionResponse(revision), patientId };
  }

  private revisionResponse(revision: Revision) { return { revisionNumber: revision.revisionNumber, revisionState: revision.revisionState, birthDate: revision.birthDate?.toISOString().slice(0, 10) ?? null, sexAtBirth: revision.sexAtBirth, heightCm: revision.heightCm, weightKg: revision.weightKg?.toString() ?? null, bloodType: revision.bloodType, allergyReport: revision.allergyReport, chronicConditionReport: revision.chronicConditionReport, currentMedicationReport: revision.currentMedicationReport, sleepDurationBand: revision.sleepDurationBand, exerciseFrequency: revision.exerciseFrequency, stressLevel: revision.stressLevel, tobaccoUse: revision.tobaccoUse, provenance: 'PATIENT_SELF_REPORTED' }; }
  private profileData(body: CreateAdminPatientDto | UpdateAdminPatientDto) { return Object.fromEntries(Object.entries({ firstName: body.firstName === undefined ? undefined : canonicalizePatientText(body.firstName ?? ''), lastName: body.lastName === undefined ? undefined : canonicalizePatientText(body.lastName ?? ''), email: body.email === undefined ? undefined : canonicalizePatientText(body.email ?? ''), cityName: body.cityName === undefined ? undefined : canonicalizePatientText(body.cityName ?? '') }).filter(([, value]) => value !== undefined)); }
  private correctionPatch(body: AdminMedicalIntakeCorrectionDto): Record<string, unknown> { const raw = { birthDate: body.birthDate === undefined ? undefined : body.birthDate === null ? null : new Date(`${canonicalizeBirthDate(body.birthDate)}T00:00:00.000Z`), sexAtBirth: body.sexAtBirth, heightCm: body.heightCm, weightKg: body.weightKg, bloodType: body.bloodType, allergyReport: body.allergyReport === undefined ? undefined : canonicalizeMedicalDeclaration(body.allergyReport), chronicConditionReport: body.chronicConditionReport === undefined ? undefined : canonicalizeMedicalDeclaration(body.chronicConditionReport), currentMedicationReport: body.currentMedicationReport === undefined ? undefined : canonicalizeMedicalDeclaration(body.currentMedicationReport), sleepDurationBand: body.sleepDurationBand, exerciseFrequency: body.exerciseFrequency, stressLevel: body.stressLevel, tobaccoUse: body.tobaccoUse }; return Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== undefined)); }
  private jsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull { return value === null || value === undefined ? Prisma.DbNull : value as Prisma.InputJsonValue; }
  private correctionOperationHash(expectedRevision: number, correctionReason: string, patch: Record<string, unknown>): string { return this.payloadHash({ expectedRevision, correctionReason, patch }); }
  private payloadHash(value: unknown): string { return createHash('sha256').update(JSON.stringify(value, (_key, item) => item instanceof Date ? item.toISOString() : item)).digest('hex'); }
}
