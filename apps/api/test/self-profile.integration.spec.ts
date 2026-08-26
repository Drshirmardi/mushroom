import { randomUUID } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { SelfProfileService } from '../src/modules/patients/self-profile/self-profile.service';

describe('self profile and onboarding status (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let profiles: SelfProfileService;
  const userIds = new Set<string>();
  const policyIds = new Set<string>();
  const clinicIds = new Set<string>();

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    profiles = new SelfProfileService(prisma);
  }, 30_000);

  afterEach(async () => {
    if (userIds.size > 0) {
      const users = [...userIds];
      await prisma.patientMedicalIntakeRevision.deleteMany({
        where: { intake: { patient: { userId: { in: users } } } },
      });
      await prisma.patientConsentRecord.deleteMany({
        where: { patient: { userId: { in: users } } },
      });
      await prisma.patientMedicalIntake.deleteMany({
        where: { patient: { userId: { in: users } } },
      });
      await prisma.userProfile.deleteMany({ where: { userId: { in: users } } });
      await prisma.patientProfile.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      userIds.clear();
    }
    if (policyIds.size > 0) {
      await prisma.consentPolicyVersion.deleteMany({ where: { id: { in: [...policyIds] } } });
      policyIds.clear();
    }
    if (clinicIds.size > 0) {
      await prisma.clinic.deleteMany({ where: { id: { in: [...clinicIds] } } });
      clinicIds.clear();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  const createPatient = async () => {
    const clinic = await prisma.clinic.create({
      data: { name: `Test clinic ${randomUUID()}`, status: 'INACTIVE' },
    });
    clinicIds.add(clinic.id);
    const user = await prisma.user.create({
      data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` },
    });
    userIds.add(user.id);
    const patient = await prisma.patientProfile.create({
      data: { userId: user.id, clinicId: clinic.id },
    });

    return { clinic, user, patient };
  };

  it('stores canonical non-medical profile data before consent and derives deterministic status', async () => {
    const { user, patient } = await createPatient();
    const before = await profiles.getOnboardingStatus(user.id);
    const profile = await profiles.update(user.id, {
      firstName: '  علي ',
      lastName: ' رضایی  ',
      cityName: '  تهران ',
      email: 'patient@example.test',
    });
    const status = await profiles.getOnboardingStatus(user.id);

    expect(profile).toMatchObject({
      patientId: patient.id,
      firstName: 'علی',
      lastName: 'رضایی',
      cityName: 'تهران',
      email: 'patient@example.test',
    });
    expect(before).toMatchObject({
      onboardingState: 'NOT_STARTED',
      submissionState: null,
      currentRevision: 0,
      evaluatedSchemaVersion: 1,
      currentPolicyVersionId: null,
      nextAction: 'COMPLETE_PROFILE',
    });
    expect(status).toMatchObject({
      onboardingState: 'IN_PROGRESS',
      submissionState: null,
      currentRevision: 0,
      nextAction: 'CONSENT_UNAVAILABLE',
      blockerCodes: ['CONSENT_POLICY_NOT_AVAILABLE', 'MEDICAL_INTAKE_INCOMPLETE'],
    });
    expect(status.missingFields).toEqual([
      'birthDate',
      'sexAtBirth',
      'allergyReport',
      'chronicConditionReport',
      'currentMedicationReport',
      'activeCurrentConsent',
    ]);
  });

  it('reflects the current active consent and the intake revision pointer without medical payload leakage', async () => {
    const { clinic, user, patient } = await createPatient();
    await profiles.update(user.id, { firstName: 'مینا', lastName: 'احمدی' });
    const policy = await prisma.consentPolicyVersion.create({
      data: {
        clinicId: clinic.id,
        policyKey: 'MEDICAL_INTAKE_PROCESSING',
        versionNumber: 10_000 + Math.floor(Math.random() * 10_000),
        locale: 'fa-IR',
        title: 'Test consent',
        body: 'Test policy body',
        contentHash: 'a'.repeat(64),
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });
    policyIds.add(policy.id);
    const consent = await prisma.patientConsentRecord.create({
      data: {
        patientId: patient.id,
        policyVersionId: policy.id,
        contentHash: policy.contentHash,
        acceptedByUserId: user.id,
        acceptanceIdempotencyKey: randomUUID(),
      },
    });
    const intake = await prisma.patientMedicalIntake.create({
      data: {
        patientId: patient.id,
        clinicId: clinic.id,
        currentRevisionNumber: 1,
        submissionState: 'DRAFT',
      },
    });
    await prisma.patientMedicalIntakeRevision.create({
      data: {
        intakeId: intake.id,
        revisionNumber: 1,
        assignedSchemaVersion: 1,
        revisionState: 'DRAFT',
        birthDate: new Date('1990-01-01T00:00:00.000Z'),
        sexAtBirth: 'FEMALE',
        allergyReport: { status: 'NONE', items: [] },
        chronicConditionReport: { status: 'UNKNOWN', items: [] },
        currentMedicationReport: { status: 'NONE', items: [] },
        recordingMode: 'PATIENT_ENTRY',
        reportedPatientId: patient.id,
        payloadHash: 'b'.repeat(64),
      },
    });

    const status = await profiles.getOnboardingStatus(user.id);

    expect(status).toMatchObject({
      onboardingState: 'IN_PROGRESS',
      submissionState: 'DRAFT',
      currentRevision: 1,
      completedRevision: null,
      currentPolicyVersionId: policy.id,
      activeConsentRecordId: consent.id,
      nextAction: 'COMPLETE_ONBOARDING',
    });
    expect(status.missingFields).toEqual([]);
    expect(JSON.stringify(status)).not.toContain('Test policy body');
  });
});
