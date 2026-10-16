import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PatientBookingEligibilityService } from '../../assessments/patient/patient-booking-eligibility.service';
import { ClinicalAccessAuditService, type ClinicalAuditContext } from '../../clinical/clinical-access-audit.service';
import { SelfProfileService } from '../self-profile/self-profile.service';
import type { JourneyActionDto, PatientJourneyResponseDto } from './patient-journey.dto';

const page = <T>(items: T[]) => ({ items: items.slice(0, 5), hasMore: items.length > 5 });

@Injectable()
export class PatientJourneyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: SelfProfileService,
    private readonly eligibility: PatientBookingEligibilityService,
    private readonly audit: ClinicalAccessAuditService,
  ) {}

  async get(userId: string, context: ClinicalAuditContext): Promise<PatientJourneyResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const evaluatedAt = new Date();
      // Resolve before the profile reader, so GET never provisions a patient as a side effect.
      const patient = await tx.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } });
      if (!patient) throw new NotFoundException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'Patient profile was not found.', details: {} });
      const scope = { patientId: patient.id, clinicId: patient.clinicId };
      const status = await this.profiles.getOnboardingStatus(userId, tx);
      const bookingEligibility = await this.eligibility.get(userId, tx, status, evaluatedAt);
      const assessmentScope = { patientId: patient.id, assessmentVersion: { clinicId: patient.clinicId }, invalidatedAt: null };
      const [attempts, appointments, intents, orders, plans, resumable, latestResult, nearAppointment] = await Promise.all([
        tx.patientAssessmentSubmission.findMany({
          where: { patientId: patient.id, assessmentVersion: { clinicId: patient.clinicId }, state: { in: ['IN_PROGRESS', 'COMPLETE'] }, invalidatedAt: null },
          orderBy: [{ state: 'asc' }, { updatedAt: 'desc' }, { id: 'desc' }], take: 6,
          select: { id: true, assessmentVersionId: true, state: true, revision: true, updatedAt: true,
            assessmentVersion: { select: { assessmentKey: true, title: true, versionNumber: true, status: true } } },
        }),
        tx.appointment.findMany({
          where: { ...scope, OR: [
            { status: 'PENDING', endsAt: { gte: evaluatedAt } },
            { status: 'CONFIRMED', endsAt: { gte: new Date(evaluatedAt.getTime() - 3_600_000) } },
            { status: { in: ['CHECKED_IN', 'QUEUED', 'IN_PROGRESS'] }, endsAt: { gte: new Date(evaluatedAt.getTime() - 4 * 3_600_000) } },
          ] }, orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], take: 6,
          select: { id: true, startsAt: true, endsAt: true, status: true, doctorService: { select: { visitMode: true } } },
        }),
        tx.billingIntent.findMany({ where: { ...scope, status: 'PENDING', OR: [{ expiresAt: null }, { expiresAt: { gt: evaluatedAt } }] },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 6,
          select: { id: true, purpose: true, amountRial: true, currency: true, expiresAt: true } }),
        tx.commerceOrder.findMany({ where: { ...scope, status: 'PENDING_PAYMENT' },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 6, select: { id: true, totalAmountToman: true } }),
        tx.treatmentPlan.findMany({ where: { ...scope, state: { in: ['ACTIVE', 'COMPLETED'] } },
          orderBy: [{ state: 'asc' }, { updatedAt: 'desc' }, { id: 'desc' }], take: 6, select: { id: true, state: true, updatedAt: true } }),
        // Action selection must not be starved by five newer retired drafts in the bounded summary.
        tx.patientAssessmentSubmission.findFirst({ where: { ...assessmentScope, state: 'IN_PROGRESS', assessmentVersion: { clinicId: patient.clinicId, status: 'PUBLISHED' } },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], select: { id: true } }),
        tx.patientAssessmentSubmission.findFirst({ where: { ...assessmentScope, state: 'COMPLETE', completedAt: { not: null } },
          orderBy: [{ completedAt: 'desc' }, { id: 'desc' }], select: { id: true } }),
        tx.appointment.findFirst({ where: { ...scope, startsAt: { lte: new Date(evaluatedAt.getTime() + 15 * 60_000) }, OR: [
          { status: 'CONFIRMED', endsAt: { gte: new Date(evaluatedAt.getTime() - 3_600_000) } },
          { status: { in: ['CHECKED_IN', 'QUEUED', 'IN_PROGRESS'] }, endsAt: { gte: new Date(evaluatedAt.getTime() - 4 * 3_600_000) } },
        ] }, orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], select: { id: true } }),
      ]);
      const assessments = page(attempts.map(({ assessmentVersion, ...attempt }) => ({ ...attempt,
        assessmentKey: assessmentVersion.assessmentKey, title: assessmentVersion.title, versionNumber: assessmentVersion.versionNumber,
        resumeAvailable: attempt.state === 'IN_PROGRESS' && assessmentVersion.status === 'PUBLISHED',
        resumeBlocker: attempt.state === 'IN_PROGRESS' && assessmentVersion.status !== 'PUBLISHED' ? 'VERSION_NOT_PUBLISHED' : null,
      })));
      const { state, isComplete, requiredCount, answeredRequiredCount, missingFields, blockerCodes, nextAction: onboardingAction } = status;
      const summary = {
        evaluatedAt, onboarding: { state, isComplete, requiredCount, answeredRequiredCount, missingFields, blockerCodes, nextAction: onboardingAction },
        bookingEligibility, assessments,
        appointments: page(appointments.map(({ doctorService, ...appointment }) => ({ ...appointment, visitMode: doctorService.visitMode }))),
        pendingPayments: page(intents.map((intent) => ({ ...intent, amountRial: intent.amountRial.toString() }))),
        pendingOrders: page(orders.map((order) => ({ id: order.id, totalAmountToman: order.totalAmountToman.toString(), currency: 'TOMAN' }))),
        treatmentPlans: page(plans), storeAvailable: true,
      };
      const nextAction = this.nextAction(summary, resumable?.id, latestResult?.id, nearAppointment?.id);
      await this.audit.record({ ...scope, action: 'READ', resourceType: 'PATIENT_JOURNEY',
        metadata: { view: 'HOME', assessmentCount: assessments.items.length, appointmentCount: summary.appointments.items.length } }, context, tx);
      return { ...summary, nextAction };
    }, { isolationLevel: 'RepeatableRead' });
  }

  private nextAction(summary: Omit<PatientJourneyResponseDto, 'nextAction'>, resumableId?: string, latestResultId?: string, nearAppointmentId?: string): JourneyActionDto {
    const action = (code: JourneyActionDto['code'], resourceId: string | null = null) => ({ code, resourceId });
    if (nearAppointmentId) return action('OPEN_APPOINTMENT', nearAppointmentId);
    if (!summary.onboarding.isComplete) return action(summary.onboarding.nextAction as JourneyActionDto['code']);
    if (!summary.bookingEligibility.eligible) return action('REVIEW_BOOKING_REQUIREMENTS');
    if (resumableId) return action('RESUME_ASSESSMENT', resumableId);
    if (summary.pendingPayments.items[0]) return action('CONTINUE_PAYMENT', summary.pendingPayments.items[0].id);
    if (summary.treatmentPlans.items[0]) return action('VIEW_TREATMENT_PLAN', summary.treatmentPlans.items[0].id);
    if (latestResultId) return action('VIEW_ASSESSMENT_RESULT', latestResultId);
    return action('BOOK_CONSULTATION');
  }
}
