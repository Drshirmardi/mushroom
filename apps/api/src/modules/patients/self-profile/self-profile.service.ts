import { Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';
import {
  PatientDomainError,
  canonicalizePatientText,
  canonicalizeRequiredPatientText,
  evaluateOnboarding,
} from '../domain/onboarding';
import type { UpdateSelfProfileDto } from './dto/self-profile.dto';

type SelfProfile = {
  patientId: string;
  phone: string;
  accountStatus: 'ACTIVE' | 'DISABLED';
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  cityName: string | null;
  gender: 'FEMALE' | 'MALE' | null;
  updatedAt: Date | null;
};

export type SelfOnboardingStatus = ReturnType<typeof evaluateOnboarding> & {
  onboardingState: ReturnType<typeof evaluateOnboarding>['state'];
  submissionState: 'DRAFT' | 'COMPLETE' | null;
  assignedSchemaVersion: number | null;
  evaluatedSchemaVersion: number;
  currentRevision: number;
  completedRevision: number | null;
  currentPolicyVersionId: string | null;
  activeConsentRecordId: string | null;
  updatedAt: Date | null;
};

const PROFILE_POLICY_KEY = 'MEDICAL_INTAKE_PROCESSING';
const PROFILE_POLICY_LOCALE = 'fa-IR';

@Injectable()
export class SelfProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<SelfProfile> {
    const patient = await this.ensurePatientProfile(userId);

    return this.toProfile(patient);
  }

  async update(userId: string, input: UpdateSelfProfileDto): Promise<SelfProfile> {
    const patient = await this.ensurePatientProfile(userId);
    const data = this.canonicalizeUpdate(input);
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    return {
      ...this.toProfile(patient),
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      cityName: profile.cityName,
      gender: profile.gender as SelfProfile['gender'],
      updatedAt: profile.updatedAt,
    };
  }

  async getOnboardingStatus(userId: string, db: Prisma.TransactionClient = this.prisma): Promise<SelfOnboardingStatus> {
    const patient = await this.ensurePatientProfile(userId, db);
    const [intake, activePolicy, hasConsentDecision] = await Promise.all([
      db.patientMedicalIntake.findUnique({
        where: { patientId: patient.id },
      }),
      db.consentPolicyVersion.findFirst({
        where: {
          clinicId: patient.clinicId,
          policyKey: PROFILE_POLICY_KEY,
          locale: PROFILE_POLICY_LOCALE,
          status: 'ACTIVE',
        },
        select: { id: true },
      }),
      db.patientConsentRecord.findFirst({
        where: { patientId: patient.id, policyVersion: { policyKey: PROFILE_POLICY_KEY } },
        select: { id: true },
      }),
    ]);
    const currentRevision = intake && intake.currentRevisionNumber > 0
      ? await db.patientMedicalIntakeRevision.findUnique({
        where: {
          intakeId_revisionNumber: {
            intakeId: intake.id,
            revisionNumber: intake.currentRevisionNumber,
          },
        },
      })
      : null;
    const activeConsent = activePolicy
      ? await db.patientConsentRecord.findFirst({
        where: {
          patientId: patient.id,
          policyVersionId: activePolicy.id,
          withdrawnAt: null,
        },
        select: { id: true },
      })
      : null;
    const profile = patient.user.userProfile;
    const revisionNumber = intake?.currentRevisionNumber ?? 0;
    const completedRevision = intake?.completedRevisionNumber ?? null;
    const evaluation = evaluateOnboarding({
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      birthDate: currentRevision?.birthDate?.toISOString().slice(0, 10),
      sexAtBirth: currentRevision?.sexAtBirth,
      allergyReport: currentRevision?.allergyReport as never,
      chronicConditionReport: currentRevision?.chronicConditionReport as never,
      currentMedicationReport: currentRevision?.currentMedicationReport as never,
      activeCurrentConsent: activeConsent !== null,
      activeConsentRecordId: activeConsent?.id ?? null,
      completedConsentRecordId: currentRevision?.completedConsentRecordId ?? null,
      hasConsentDecision: hasConsentDecision !== null,
      consentPolicyAvailable: activePolicy !== null,
      submissionState: intake?.submissionState ?? null,
      currentRevision: revisionNumber,
      completedRevision,
    });

    return {
      ...evaluation,
      onboardingState: evaluation.state,
      submissionState: intake?.submissionState ?? null,
      assignedSchemaVersion: intake?.assignedSchemaVersion ?? null,
      evaluatedSchemaVersion: intake?.assignedSchemaVersion ?? 1,
      currentRevision: revisionNumber,
      completedRevision,
      currentPolicyVersionId: activePolicy?.id ?? null,
      activeConsentRecordId: activeConsent?.id ?? null,
      updatedAt: this.latestUpdate(profile?.updatedAt ?? null, intake?.updatedAt ?? null),
    };
  }

  private async ensurePatientProfile(userId: string, db: Prisma.TransactionClient = this.prisma) {
    const existing = await db.patientProfile.findUnique({
      where: { userId },
      include: { user: { include: { userProfile: true } } },
    });
    if (existing) return existing;

    const clinic = await db.clinic.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    if (!clinic) {
      throw new ServiceUnavailableException({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Patient onboarding is temporarily unavailable.',
        details: {},
      });
    }

    return db.patientProfile.upsert({
      where: { userId },
      create: { userId, clinicId: clinic.id },
      update: {},
      include: { user: { include: { userProfile: true } } },
    });
  }

  private canonicalizeUpdate(input: UpdateSelfProfileDto) {
    try {
      const data: Record<string, string | null> = {};
      if (input.firstName !== undefined) {
        data.firstName = input.firstName === null
          ? null
          : canonicalizeRequiredPatientText(input.firstName, 80);
      }
      if (input.lastName !== undefined) {
        data.lastName = input.lastName === null
          ? null
          : canonicalizeRequiredPatientText(input.lastName, 100);
      }
      if (input.email !== undefined) {
        data.email = input.email === null ? null : canonicalizePatientText(input.email);
      }
      if (input.cityName !== undefined) {
        data.cityName = input.cityName === null ? null : canonicalizePatientText(input.cityName);
      }
      if (input.gender !== undefined) {
        data.gender = input.gender;
      }
      return data;
    } catch (error) {
      if (error instanceof PatientDomainError) {
        throw new UnprocessableEntityException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      }
      throw error;
    }
  }

  private toProfile(patient: Awaited<ReturnType<SelfProfileService['ensurePatientProfile']>>): SelfProfile {
    const profile = patient.user.userProfile;
    return {
      patientId: patient.id,
      phone: patient.user.phone,
      accountStatus: patient.user.status,
      firstName: profile?.firstName ?? null,
      lastName: profile?.lastName ?? null,
      email: profile?.email ?? null,
      cityName: profile?.cityName ?? null,
      gender: (profile?.gender as SelfProfile['gender'] | undefined) ?? null,
      updatedAt: profile?.updatedAt ?? null,
    };
  }

  private latestUpdate(first: Date | null, second: Date | null): Date | null {
    if (!first) return second;
    if (!second) return first;
    return first > second ? first : second;
  }
}
