import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientAssessmentState } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { SelfProfileService } from '../../patients/self-profile/self-profile.service';

@Injectable()
export class PatientBookingEligibilityService {
  constructor(private readonly prisma: PrismaService, private readonly profiles: SelfProfileService) {}

  async get(userId: string) {
    const onboarding = await this.profiles.getOnboardingStatus(userId);
    if (onboarding.state !== 'COMPLETE') return { eligible: false, reason: 'PROFILE_INCOMPLETE', nextAction: 'COMPLETE_ONBOARDING' };

    const patient = await this.prisma.patientProfile.findUnique({ where: { userId } });
    if (!patient) throw new NotFoundException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'Patient profile was not found.', details: {} });

    const policy = await this.prisma.bookingEligibilityPolicy.findUnique({ where: { clinicId: patient.clinicId } });
    if (!policy || policy.assessmentRequirement === 'NOT_REQUIRED') return { eligible: true, reason: 'ELIGIBLE', nextAction: null };

    const required = await this.prisma.assessmentVersion.findUnique({ where: { id: policy.requiredAssessmentVersionId! } });
    if (!required) return { eligible: false, reason: 'MAIN_ASSESSMENT_REQUIRED', nextAction: 'COMPLETE_ASSESSMENT' };

    let requiredVersionId = required.id;
    let missingReason: 'MAIN_ASSESSMENT_REQUIRED' | 'LATEST_VERSION_REQUIRED' = 'MAIN_ASSESSMENT_REQUIRED';
    if (policy.requireLatestPublishedVersion) {
      const latest = await this.prisma.assessmentVersion.findFirst({
        where: { clinicId: patient.clinicId, assessmentKey: required.assessmentKey, locale: required.locale, status: 'PUBLISHED' },
        orderBy: { versionNumber: 'desc' },
        select: { id: true },
      });

      if (latest && latest.id !== required.id) {
        requiredVersionId = latest.id;
        missingReason = 'LATEST_VERSION_REQUIRED';
      }
    }

    const completion = await this.validCompletion(patient.id, requiredVersionId);
    if (!completion) return { eligible: false, reason: missingReason, nextAction: 'COMPLETE_ASSESSMENT' };
    if (this.expired(completion.completedAt, policy.validityDays)) return { eligible: false, reason: 'ASSESSMENT_EXPIRED', nextAction: 'RETAKE_ASSESSMENT' };

    return { eligible: true, reason: 'ELIGIBLE', nextAction: null };
  }

  private validCompletion(patientId: string, assessmentVersionId: string) {
    return this.prisma.patientAssessmentSubmission.findFirst({
      where: { patientId, assessmentVersionId, state: PatientAssessmentState.COMPLETE, invalidatedAt: null, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    });
  }

  private expired(completedAt: Date | null, validityDays: number | null) {
    return completedAt !== null && validityDays !== null && completedAt.getTime() + validityDays * 86_400_000 < Date.now();
  }
}
