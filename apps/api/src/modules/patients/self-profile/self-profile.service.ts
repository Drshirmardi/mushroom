import { ConflictException, Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';

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
  birthDate: string | null;
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

@Injectable()
export class SelfProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<SelfProfile> {
    const patient = await this.ensurePatientProfile(userId);

    return this.toProfile(patient);
  }

  async update(
    userId: string,
    input: UpdateSelfProfileDto,
    context?: { actorSessionId: string; requestId: string; ipAddress: string },
  ): Promise<SelfProfile> {
    const data = this.canonicalizeUpdate(input);
    const birthDate = input.birthDate === undefined ? undefined : this.canonicalizeBirthDate(input.birthDate);

    return this.prisma.$transaction(async (tx) => {
      const patient = await this.ensurePatientProfile(userId, tx);
      const profile = await tx.userProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });

      if (birthDate) {
        const entry = await tx.patientEntry.findUnique({
          where: { patientId: patient.id },
          include: { submission: { select: { state: true, invalidatedAt: true } } },
        });

        if (entry?.submission?.state === 'IN_PROGRESS' && !entry.submission.invalidatedAt) {
          throw new ConflictException({
            code: 'PROFILE_BIRTH_DATE_LOCKED',
            message: 'Birth date cannot be changed while an assessment is in progress.',
            details: {},
          });
        }

        if (entry) {
          const changed = entry.birthDate?.getTime() !== birthDate.getTime();
          await tx.patientEntry.update({ where: { patientId: patient.id }, data: { birthDate } });
          if (changed && context) {
            await tx.auditEvent.create({
              data: {
                action: 'PATIENT_ENTRY_BIRTH_DATE_UPDATED',
                actorUserId: userId,
                actorSessionId: context.actorSessionId,
                subjectType: 'PATIENT_ENTRY',
                subjectId: patient.id,
                requestId: context.requestId.slice(0, 128),
                ipAddress: context.ipAddress,
                metadata: { birthDateChanged: true },
              },
            });
          }
        } else {
          const policy = await tx.patientEntryPolicy.findUnique({ where: { clinicId: patient.clinicId } });
          const assessmentRequired = Boolean(
            policy?.enabled && policy.enforcedFrom && patient.user.createdAt >= policy.enforcedFrom,
          );
          await tx.patientEntry.create({
            data: {
              patientId: patient.id,
              clinicId: patient.clinicId,
              birthDate,
              completedAt: assessmentRequired ? null : new Date(),
            },
          });
          if (context) {
            await tx.auditEvent.create({
              data: {
                action: 'PATIENT_ENTRY_BIRTH_DATE_UPDATED',
                actorUserId: userId,
                actorSessionId: context.actorSessionId,
                subjectType: 'PATIENT_ENTRY',
                subjectId: patient.id,
                requestId: context.requestId.slice(0, 128),
                ipAddress: context.ipAddress,
                metadata: { birthDateChanged: true },
              },
            });
          }
        }
      }

      return this.toProfile(
        { ...patient, user: { ...patient.user, userProfile: profile } },
        tx,
      );
    });
  }

  async getOnboardingStatus(userId: string, db: Prisma.TransactionClient = this.prisma): Promise<SelfOnboardingStatus> {
    const patient = await this.ensurePatientProfile(userId, db);
    const [intake, entry] = await Promise.all([
      db.patientMedicalIntake.findUnique({ where: { patientId: patient.id } }),
      db.patientEntry.findUnique({ where: { patientId: patient.id }, select: { birthDate: true } }),
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
    const profile = patient.user.userProfile;
    const revisionNumber = intake?.currentRevisionNumber ?? 0;
    const completedRevision = intake?.completedRevisionNumber ?? null;
    const evaluation = evaluateOnboarding({
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      birthDate: (entry?.birthDate ?? currentRevision?.birthDate)?.toISOString().slice(0, 10),
      sexAtBirth: currentRevision?.sexAtBirth,
      allergyReport: currentRevision?.allergyReport as never,
      chronicConditionReport: currentRevision?.chronicConditionReport as never,
      currentMedicationReport: currentRevision?.currentMedicationReport as never,
      activeCurrentConsent: false,
      activeConsentRecordId: null,
      completedConsentRecordId: currentRevision?.completedConsentRecordId ?? null,
      hasConsentDecision: false,
      consentPolicyAvailable: false,
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
      currentPolicyVersionId: null,
      activeConsentRecordId: null,
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

  private async toProfile(
    patient: Awaited<ReturnType<SelfProfileService['ensurePatientProfile']>>,
    db: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<SelfProfile> {
    const profile = patient.user.userProfile;
    const entry = await db.patientEntry.findUnique({
      where: { patientId: patient.id },
      select: { birthDate: true },
    });
    let birthDate = entry?.birthDate ?? null;
    if (!birthDate) {
      const intake = await db.patientMedicalIntake.findUnique({
        where: { patientId: patient.id },
        select: { id: true, currentRevisionNumber: true },
      });
      if (intake && intake.currentRevisionNumber > 0) {
        const revision = await db.patientMedicalIntakeRevision.findUnique({
          where: {
            intakeId_revisionNumber: {
              intakeId: intake.id,
              revisionNumber: intake.currentRevisionNumber,
            },
          },
          select: { birthDate: true },
        });
        birthDate = revision?.birthDate ?? null;
      }
    }
    return {
      patientId: patient.id,
      phone: patient.user.phone,
      accountStatus: patient.user.status,
      firstName: profile?.firstName ?? null,
      lastName: profile?.lastName ?? null,
      email: profile?.email ?? null,
      cityName: profile?.cityName ?? null,
      gender: (profile?.gender as SelfProfile['gender'] | undefined) ?? null,
      birthDate: birthDate?.toISOString().slice(0, 10) ?? null,
      updatedAt: profile?.updatedAt ?? null,
    };
  }

  private canonicalizeBirthDate(value: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);
    const today = new Date();
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value ||
      date > new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) ||
      date.getUTCFullYear() < today.getUTCFullYear() - 130
    ) {
      throw new UnprocessableEntityException({
        code: 'PROFILE_BIRTH_DATE_INVALID',
        message: 'A valid birth date is required.',
        details: {},
      });
    }
    return date;
  }

  private latestUpdate(first: Date | null, second: Date | null): Date | null {
    if (!first) return second;
    if (!second) return first;
    return first > second ? first : second;
  }
}
