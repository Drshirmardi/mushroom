import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AssessmentVersionStatus, BookingAssessmentRequirement } from '../../../generated/prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { ASSESSMENT_AUDIT_ACTIONS } from '../application/assessment-audit';
import type { UpdateBookingAssessmentPolicyDto } from './admin-booking-policy.dto';

interface AuditContext { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string }

const clinicUnavailable = () => new NotFoundException({ code: 'ASSESSMENT_CLINIC_UNAVAILABLE', message: 'No active clinic is configured.', details: {} });

@Injectable()
export class AdminBookingPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const clinic = await this.clinic();
    const policy = await this.prisma.bookingEligibilityPolicy.findUnique({ where: { clinicId: clinic.id } });
    return this.response(policy);
  }

  async update(body: UpdateBookingAssessmentPolicyDto, context: AuditContext) {
    const clinic = await this.clinic();
    const required = body.assessmentRequirement === BookingAssessmentRequirement.REQUIRED;
    if (required && !body.requiredAssessmentVersionId) throw new UnprocessableEntityException({ code: 'REQUIRED_ASSESSMENT_VERSION_MISSING', message: 'A published assessment version is required when the booking prerequisite is enabled.', details: {} });
    if (required) {
      const version = await this.prisma.assessmentVersion.findFirst({ where: { id: body.requiredAssessmentVersionId, clinicId: clinic.id, status: AssessmentVersionStatus.PUBLISHED }, select: { id: true } });
      if (!version) throw new ConflictException({ code: 'REQUIRED_ASSESSMENT_VERSION_INVALID', message: 'The required assessment version must be published by this clinic.', details: {} });
    }
    const policy = await this.prisma.bookingEligibilityPolicy.upsert({
      where: { clinicId: clinic.id },
      create: { clinicId: clinic.id, assessmentRequirement: body.assessmentRequirement, requiredAssessmentVersionId: required ? body.requiredAssessmentVersionId! : null, validityDays: required ? body.validityDays ?? null : null, requireLatestPublishedVersion: required ? body.requireLatestPublishedVersion ?? false : false },
      update: { assessmentRequirement: body.assessmentRequirement, requiredAssessmentVersionId: required ? body.requiredAssessmentVersionId! : null, validityDays: required ? body.validityDays ?? null : null, requireLatestPublishedVersion: required ? body.requireLatestPublishedVersion ?? false : false },
    });
    await this.prisma.auditEvent.create({ data: { action: ASSESSMENT_AUDIT_ACTIONS.BOOKING_POLICY_UPDATED, actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'BOOKING_ELIGIBILITY_POLICY', subjectId: policy.id, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: { assessmentRequirement: policy.assessmentRequirement, requiredAssessmentVersionId: policy.requiredAssessmentVersionId, validityDays: policy.validityDays, requireLatestPublishedVersion: policy.requireLatestPublishedVersion } } });
    return this.response(policy);
  }

  private async clinic() { const clinic = await this.prisma.clinic.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } }); if (!clinic) throw clinicUnavailable(); return clinic; }
  private response(policy: { assessmentRequirement: BookingAssessmentRequirement; requiredAssessmentVersionId: string | null; validityDays: number | null; requireLatestPublishedVersion: boolean; updatedAt: Date } | null) { return policy ? { assessmentRequirement: policy.assessmentRequirement, requiredAssessmentVersionId: policy.requiredAssessmentVersionId, validityDays: policy.validityDays, requireLatestPublishedVersion: policy.requireLatestPublishedVersion, updatedAt: policy.updatedAt } : { assessmentRequirement: BookingAssessmentRequirement.NOT_REQUIRED, requiredAssessmentVersionId: null, validityDays: null, requireLatestPublishedVersion: false, updatedAt: null }; }
}
