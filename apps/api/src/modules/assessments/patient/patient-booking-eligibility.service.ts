import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientAssessmentState, type Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { SelfProfileService, type SelfOnboardingStatus } from '../../patients/self-profile/self-profile.service';

@Injectable()
export class PatientBookingEligibilityService {
  constructor(private readonly prisma: PrismaService, private readonly profiles: SelfProfileService) {}

  async get(userId: string, db: Prisma.TransactionClient = this.prisma, evaluatedOnboarding?: SelfOnboardingStatus, now = new Date()) {
    const onboarding = evaluatedOnboarding ?? await this.profiles.getOnboardingStatus(userId, db);
    if (onboarding.state !== 'COMPLETE') return { eligible: false, reason: 'PROFILE_INCOMPLETE', nextAction: 'COMPLETE_ONBOARDING' };

    const patient = await db.patientProfile.findUnique({ where: { userId } });
    if (!patient) throw new NotFoundException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'Patient profile was not found.', details: {} });

    const policy = await db.bookingEligibilityPolicy.findUnique({ where: { clinicId: patient.clinicId } });
    if (!policy || policy.assessmentRequirement === 'NOT_REQUIRED') return { eligible: true, reason: 'ELIGIBLE', nextAction: null };

    const required = await db.assessmentVersion.findUnique({ where: { id: policy.requiredAssessmentVersionId! } });
    if (!required) return { eligible: false, reason: 'MAIN_ASSESSMENT_REQUIRED', nextAction: 'COMPLETE_ASSESSMENT' };

    let requiredVersionId = required.id;
    let missingReason: 'MAIN_ASSESSMENT_REQUIRED' | 'LATEST_VERSION_REQUIRED' = 'MAIN_ASSESSMENT_REQUIRED';
    if (policy.requireLatestPublishedVersion) {
      const latest = await db.assessmentVersion.findFirst({
        where: { clinicId: patient.clinicId, assessmentKey: required.assessmentKey, locale: required.locale, status: 'PUBLISHED' },
        orderBy: { versionNumber: 'desc' },
        select: { id: true },
      });

      if (latest && latest.id !== required.id) {
        requiredVersionId = latest.id;
        missingReason = 'LATEST_VERSION_REQUIRED';
      }
    }

    const completion = await this.validCompletion(patient.id, requiredVersionId, db);
    if (!completion) return { eligible: false, reason: missingReason, nextAction: 'COMPLETE_ASSESSMENT' };
    if (this.expired(completion.completedAt, policy.validityDays, now)) return { eligible: false, reason: 'ASSESSMENT_EXPIRED', nextAction: 'RETAKE_ASSESSMENT' };

    return { eligible: true, reason: 'ELIGIBLE', nextAction: null };
  }

  private validCompletion(patientId: string, assessmentVersionId: string, db: Prisma.TransactionClient) {
    return db.patientAssessmentSubmission.findFirst({
      where: { patientId, assessmentVersionId, state: PatientAssessmentState.COMPLETE, invalidatedAt: null, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    });
  }

  private expired(completedAt: Date | null, validityDays: number | null, now: Date) {
    return completedAt !== null && validityDays !== null && completedAt.getTime() + validityDays * 86_400_000 < now.getTime();
  }
}
