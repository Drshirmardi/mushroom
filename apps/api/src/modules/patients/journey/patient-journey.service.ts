import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { accessibleAssessmentWhere, processableAssessmentGrants } from '../../assessments/access/assessment-access.policy';
import { PatientBookingEligibilityService } from '../../assessments/patient/patient-booking-eligibility.service';
import { coupleSessionSelect, coupleSessionSummary } from '../../assessments/couples/couple-link.projection';
import { CoupleAssessmentDeliveryService } from '../../assessments/couples/paid/couple-assessment-delivery.service';
import { ClinicalAccessAuditService, type ClinicalAuditContext } from '../../clinical/clinical-access-audit.service';
import { CustomProgramBoundaryService } from '../../clinical/custom-program-boundary.service';
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
    private readonly couples: CoupleAssessmentDeliveryService,
    private readonly customPrograms: CustomProgramBoundaryService,
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
      const nativePlanFilter = await this.customPrograms.patientFilter(tx, patient.id, patient.clinicId, context);
      const assessmentScope = { ...accessibleAssessmentWhere, patientId: patient.id, assessmentVersion: { clinicId: patient.clinicId }, invalidatedAt: null };
      const [attempts, appointments, intents, orders, plans, resumable, latestResult, nearAppointment, coupleLinks, purchases, unusedGrants, couples, programs, availableProgram, custom, payment] = await Promise.all([
        tx.patientAssessmentSubmission.findMany({
          where: { ...assessmentScope, state: { in: ['IN_PROGRESS', 'COMPLETE'] } },
          orderBy: [{ state: 'asc' }, { updatedAt: 'desc' }, { id: 'desc' }], take: 6,
          select: { id: true, accessGrantId: true, assessmentVersionId: true, state: true, revision: true, updatedAt: true,
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
        tx.treatmentPlan.findMany({ where: { ...scope, state: { in: ['ACTIVE', 'COMPLETED'] }, AND: nativePlanFilter },
          orderBy: [{ state: 'asc' }, { updatedAt: 'desc' }, { id: 'desc' }], take: 6, select: { id: true, state: true, updatedAt: true } }),
        // Exact historical questionnaires are available for owned published/retired attempts.
        tx.$queryRaw<{ id: string; paid: boolean }[]>(Prisma.sql`SELECT s.id,(s.access_grant_id IS NOT NULL) AS paid FROM patient_assessment_submissions s JOIN assessment_versions v ON v.id=s.assessment_version_id WHERE s.patient_id=${patient.id}::uuid AND v.clinic_id=${patient.clinicId}::uuid AND v.status IN ('PUBLISHED','RETIRED') AND s.state='IN_PROGRESS' AND s.invalidated_at IS NULL AND assessment_submission_access_allowed(s.id,${patient.id}::uuid) AND (s.access_grant_id IS NULL OR assessment_grant_processable(s.access_grant_id)) ORDER BY (s.access_grant_id IS NOT NULL) DESC,s.updated_at DESC,s.id DESC LIMIT 1`),
        tx.patientAssessmentSubmission.findFirst({ where: { ...assessmentScope, state: 'COMPLETE', completedAt: { not: null } },
          orderBy: [{ completedAt: 'desc' }, { id: 'desc' }], select: { id: true } }),
        tx.appointment.findFirst({ where: { ...scope, startsAt: { lte: new Date(evaluatedAt.getTime() + 15 * 60_000) }, OR: [
          { status: 'CONFIRMED', endsAt: { gte: new Date(evaluatedAt.getTime() - 3_600_000) } },
          { status: { in: ['CHECKED_IN', 'QUEUED', 'IN_PROGRESS'] }, endsAt: { gte: new Date(evaluatedAt.getTime() - 4 * 3_600_000) } },
        ] }, orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], select: { id: true } }),
        tx.coupleSession.findMany({ where: { clinicId: patient.clinicId, participants: { some: { patientId: patient.id } } },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 6, select: coupleSessionSelect }),
        tx.assessmentPurchase.findMany({ where: scope, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 6,
          select: { id: true, snapshot: true, amountRial: true, intent: { select: { id: true, status: true } }, grants: { where: { patientId: patient.id }, select: { id: true, submission: { select: { id: true } } } } } }),
        tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT g.id FROM assessment_access_grants g WHERE g.patient_id=${patient.id}::uuid AND g.clinic_id=${patient.clinicId}::uuid AND NOT EXISTS(SELECT 1 FROM patient_assessment_submissions WHERE access_grant_id=g.id) AND assessment_grant_processable(g.id) ORDER BY g.granted_at DESC,g.id DESC LIMIT 1`),
        this.couples.home(tx, patient),
        tx.$queryRaw<{ id: string; title: string; amountRial: string; intentId: string; paymentState: string; accessGrantId: string | null; grantedAt: Date | null; endsAt: Date | null; accessAvailable: boolean }[]>(Prisma.sql`SELECT p.id,p.snapshot->>'title' AS title,p.amount_rial::text AS "amountRial",i.id AS "intentId",i.status AS "paymentState",g.id AS "accessGrantId",g.granted_at AS "grantedAt",g.ends_at AS "endsAt",COALESCE(program_grant_readable(g.id,${patient.id}::uuid),false) AS "accessAvailable" FROM program_purchases p JOIN billing_intents i ON i.program_purchase_id=p.id LEFT JOIN program_access_grants g ON g.purchase_id=p.id WHERE p.custom_request_id IS NULL AND p.patient_id=${patient.id}::uuid AND p.clinic_id=${patient.clinicId}::uuid ORDER BY p.created_at DESC,p.id DESC LIMIT 6`),
        tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT g.id FROM program_access_grants g WHERE g.patient_id=${patient.id}::uuid AND g.clinic_id=${patient.clinicId}::uuid AND program_grant_readable(g.id,${patient.id}::uuid) ORDER BY g.granted_at DESC,g.id DESC LIMIT 1`),
        this.customHome(tx, patient, context),
        // Voluntary top-ups are not a required next step; select outside the capped preview.
        tx.billingIntent.findFirst({ where: { ...scope, purpose: { not: 'TOPUP' }, status: 'PENDING', OR: [{ expiresAt: null }, { expiresAt: { gt: evaluatedAt } }] },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } }),
      ]);
      const processable = await processableAssessmentGrants(tx, [...attempts.flatMap(row => row.accessGrantId ? [row.accessGrantId] : []), ...purchases.flatMap(row => row.grants.map(g => g.id))]);
      const assessments = page(attempts.map(({ assessmentVersion, accessGrantId, ...attempt }) => ({ ...attempt,
        assessmentKey: assessmentVersion.assessmentKey, title: assessmentVersion.title, versionNumber: assessmentVersion.versionNumber,
        resumeAvailable: attempt.state === 'IN_PROGRESS' && assessmentVersion.status !== 'DRAFT' && (!accessGrantId || processable.has(accessGrantId)),
        resumeBlocker: attempt.state !== 'IN_PROGRESS' ? null : assessmentVersion.status === 'DRAFT' ? 'VERSION_NOT_PUBLISHED' : accessGrantId && !processable.has(accessGrantId) ? 'PROCESSING_APPROVAL_UNAVAILABLE' : null,
      })));
      const { state, isComplete, requiredCount, answeredRequiredCount, missingFields, blockerCodes, nextAction: onboardingAction } = status;
      const summary = {
        evaluatedAt, onboarding: { state, isComplete, requiredCount, answeredRequiredCount, missingFields, blockerCodes, nextAction: onboardingAction },
        bookingEligibility, assessments,
        appointments: page(appointments.map(({ doctorService, ...appointment }) => ({ ...appointment, visitMode: doctorService.visitMode }))),
        pendingPayments: page(intents.map((intent) => ({ ...intent, amountRial: intent.amountRial.toString() }))),
        pendingOrders: page(orders.map((order) => ({ id: order.id, totalAmountToman: order.totalAmountToman.toString(), currency: 'TOMAN' }))),
        treatmentPlans: page(plans), storeAvailable: true,
        coupleLinks: page(coupleLinks.map(row => coupleSessionSummary(row, patient.id))),
        coupleAssessments: page(couples.rows),
        programPurchases: page(programs.map(p => ({ ...p, currency: 'IRR' as const }))),
        customPrograms: page(custom.rows),
        assessmentPurchases: page(purchases.map(row => { const grant = row.grants[0]; return { id: row.id, title: (row.snapshot as { title: string }).title, amountRial: row.amountRial.toString(), currency: 'IRR', intentId: row.intent?.id ?? null, paymentState: row.intent?.status ?? 'UNAVAILABLE', accessGrantId: grant?.id ?? null, submissionId: grant?.submission?.id ?? null, startAvailable: !!grant && !grant.submission && processable.has(grant.id) }; })),
      };
      const nextAction = this.nextAction(summary, resumable[0]?.id, latestResult?.id, nearAppointment?.id, unusedGrants[0]?.id, couples.readyId, resumable[0]?.paid, availableProgram[0]?.id, custom.readyId, payment?.id);
      await this.audit.record({ ...scope, action: 'READ', resourceType: 'PATIENT_JOURNEY',
        metadata: { view: 'HOME', assessmentCount: assessments.items.length, appointmentCount: summary.appointments.items.length } }, context, tx);
      return { ...summary, nextAction };
    }, { isolationLevel: 'RepeatableRead' });
  }

  private async customHome(tx: Prisma.TransactionClient, p: { id: string; clinicId: string }, ctx: ClinicalAuditContext) {
    const base = Prisma.sql`FROM custom_program_requests r JOIN program_definition_versions d ON d.id=r.program_definition_id JOIN LATERAL (SELECT purchase.id,purchase.created_at FROM program_purchases purchase JOIN billing_intents i ON i.program_purchase_id=purchase.id WHERE purchase.custom_request_id=r.id AND (i.status='PAID' OR (i.status='PENDING' AND i.expires_at>CURRENT_TIMESTAMP)) ORDER BY purchase.created_at DESC,purchase.id DESC LIMIT 1) p ON true JOIN billing_intents i ON i.program_purchase_id=p.id LEFT JOIN program_access_grants g ON g.purchase_id=p.id LEFT JOIN LATERAL (SELECT v.id,v.treatment_plan_id,v.status FROM custom_program_plan_versions v WHERE v.request_id=r.id AND v.issued_at IS NOT NULL ORDER BY v.version_number DESC LIMIT 1) v ON true LEFT JOIN treatment_plans native ON native.id=v.treatment_plan_id WHERE r.patient_id=${p.id}::uuid AND r.clinic_id=${p.clinicId}::uuid AND custom_program_patient_session(r.patient_id,r.clinic_id,${ctx.actorUserId}::uuid,${ctx.actorSessionId}::uuid)`;
    const [rows, ready] = await Promise.all([
      tx.$queryRaw<{ requestId: string; title: string; intentId: string; paymentState: string; entitled: boolean; currentVersionId: string | null; treatmentPlanId: string | null; bodyAvailable: boolean }[]>(Prisma.sql`SELECT r.id AS "requestId",d.title,i.id AS "intentId",i.status AS "paymentState",(g.id IS NOT NULL AND i.status='PAID') AS entitled,v.id AS "currentVersionId",v.treatment_plan_id AS "treatmentPlanId",COALESCE(custom_program_native_effective(v.treatment_plan_id),false) AS "bodyAvailable" ${base} ORDER BY p.created_at DESC,p.id DESC LIMIT 6`),
      tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT r.id ${base} AND i.status='PAID' AND g.id IS NOT NULL AND (v.status IS DISTINCT FROM 'ISSUED' OR native.state IS DISTINCT FROM 'COMPLETED') ORDER BY p.created_at DESC,p.id DESC LIMIT 1`),
    ]); return { rows, readyId: ready[0]?.id };
  }
  private nextAction(summary: Omit<PatientJourneyResponseDto, 'nextAction'>, resumableId?: string, latestResultId?: string, nearAppointmentId?: string, unusedGrantId?: string, readyCoupleId?: string, paidResume = false, programGrantId?: string, customRequestId?: string, paymentId?: string): JourneyActionDto {
    const action = (code: JourneyActionDto['code'], resourceId: string | null = null) => ({ code, resourceId });
    if (nearAppointmentId) return action('OPEN_APPOINTMENT', nearAppointmentId);
    if (!summary.onboarding.isComplete) return action(summary.onboarding.nextAction as JourneyActionDto['code']);
    if (unusedGrantId) return action('START_PAID_ASSESSMENT', unusedGrantId);
    if (resumableId && paidResume) return action('RESUME_ASSESSMENT', resumableId);
    if (readyCoupleId) return action('OPEN_COUPLE_ASSESSMENT', readyCoupleId);
    if (customRequestId) return action('OPEN_CUSTOM_PROGRAM_REQUEST', customRequestId);
    if (programGrantId) return action('OPEN_PROGRAM', programGrantId);
    if (!summary.bookingEligibility.eligible) return action('REVIEW_BOOKING_REQUIREMENTS');
    if (resumableId) return action('RESUME_ASSESSMENT', resumableId);
    if (paymentId) return action('CONTINUE_PAYMENT', paymentId);
    if (summary.treatmentPlans.items[0]) return action('VIEW_TREATMENT_PLAN', summary.treatmentPlans.items[0].id);
    if (latestResultId) return action('VIEW_ASSESSMENT_RESULT', latestResultId);
    return action('BOOK_CONSULTATION');
  }
}
