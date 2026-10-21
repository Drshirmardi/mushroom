import type { JourneyHomeActionDto, JourneyHomeDto, JourneyLatestAssessmentDto, PatientJourneyResponseDto } from './patient-journey.dto';

export type JourneySummary = Omit<PatientJourneyResponseDto, 'nextAction' | 'home'>;
type HomeSources = {
  latestAssessment: JourneyLatestAssessmentDto | null;
  activeTreatmentPlanId: string | null;
  appointmentId?: string;
  unusedGrantId?: string;
  resumableId?: string;
  readyCoupleId?: string;
  pendingCouple?: { id: string; title: string; ownAccessGrantId: string | null; ownSubmissionId: string | null };
  pendingLinkId?: string;
  customRequestId?: string;
  payment?: { id: string; purpose: string; amountRial: bigint; orderId: string | null } | null;
};

/** Presentation projection only; never changes eligibility, consent or resource authority. */
export function homeJourney(summary: JourneySummary, sources: HomeSources): JourneyHomeDto {
  const profileComplete = !summary.onboarding.missingFields.some(field => ['firstName', 'lastName', 'birthDate', 'sexAtBirth'].includes(field));
  const healthComplete = summary.onboarding.missingFields.length === 0 && !summary.onboarding.blockerCodes.includes('CONSENT_POLICY_NOT_AVAILABLE');
  const complete = [profileComplete, healthComplete, summary.onboarding.isComplete];
  const current = complete.findIndex(done => !done);
  const setupSteps = (['PROFILE', 'HEALTH', 'CONFIRM'] as const).map((code, index) => ({
    code, state: (complete[index] ? 'COMPLETE' : index === current ? 'CURRENT' : 'UPCOMING') as 'COMPLETE' | 'CURRENT' | 'UPCOMING',
  }));
  const actions: JourneyHomeActionDto[] = [];
  const add = (code: JourneyHomeActionDto['code'], resourceId: string | null, title: string | null = null) => {
    actions.push({ code, resourceId, title, amountRial: null, paymentPurpose: null });
  };
  if (sources.appointmentId) add('OPEN_APPOINTMENT', sources.appointmentId);
  if (sources.payment && sources.payment.purpose !== 'TOPUP') actions.push({
    code: 'CONTINUE_PAYMENT', resourceId: sources.payment.id, title: null,
    amountRial: sources.payment.amountRial.toString(), paymentPurpose: sources.payment.purpose,
  });
  if (sources.unusedGrantId) add('START_PAID_ASSESSMENT', sources.unusedGrantId);
  if (sources.resumableId) add('RESUME_ASSESSMENT', sources.resumableId);
  const couple = sources.pendingCouple;
  const coupleId = sources.readyCoupleId ?? couple?.id;
  const duplicateCouple = !sources.readyCoupleId && couple && ((couple.ownAccessGrantId !== null && couple.ownAccessGrantId === sources.unusedGrantId) || (couple.ownSubmissionId !== null && couple.ownSubmissionId === sources.resumableId));
  if (coupleId && !duplicateCouple) add('OPEN_COUPLE_ASSESSMENT', coupleId, couple?.id === coupleId ? couple.title : null);
  if (sources.customRequestId) add('OPEN_CUSTOM_PROGRAM_REQUEST', sources.customRequestId);
  if (summary.onboarding.isComplete && !summary.bookingEligibility.eligible) add('REVIEW_BOOKING_REQUIREMENTS', null);
  if (sources.activeTreatmentPlanId) add('VIEW_TREATMENT_PLAN', sources.activeTreatmentPlanId);
  const order = summary.pendingOrders.items.find(item => item.id !== sources.payment?.orderId);
  if (order) add('TRACK_ORDER', order.id);
  if (sources.pendingLinkId) add('OPEN_COUPLE_LINK', sources.pendingLinkId);
  return { setupSteps, latestAssessment: sources.latestAssessment, activeTreatmentPlanId: sources.activeTreatmentPlanId, actions };
}
